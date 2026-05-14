import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);

  resolveApiKey(apiKeyRef?: string): string | undefined {
    if (!apiKeyRef || apiKeyRef === 'none') return undefined;
    const envVal = process.env[apiKeyRef];
    if (envVal !== undefined) return envVal;
    return apiKeyRef;
  }

  private buildRealtimeEndpoints(baseUrl: string, model: string) {
    const trimmed = (baseUrl || '').replace(/\/+$/, '');
    const apiVersion = '2025-04-01-preview';

    if (!trimmed) {
      throw new Error('Provider base URL is empty');
    }

    const parsed = new URL(trimmed);
    const localHosts = new Set(['localhost', '127.0.0.1', '0.0.0.0']);
    if (localHosts.has(parsed.hostname)) {
      throw new Error('Realtime voice requires a provider endpoint that supports OpenAI/Azure realtime session bootstrap; local default endpoints like Ollama do not provide that API.');
    }

    if (trimmed.includes('.openai.azure.com') || trimmed.includes('.services.ai.azure.com') || trimmed.includes('/openai/')) {
      const url = new URL(trimmed);
      const deployment = encodeURIComponent(model);
      return {
        authMode: 'api-key' as const,
        sessionUrl: `${url.origin}/openai/realtimeapi/sessions?api-version=${apiVersion}&deployment=${deployment}`,
        connectUrl: `${url.origin}/openai/realtimeapi?api-version=${apiVersion}&deployment=${deployment}`,
      };
    }

    const root = trimmed.endsWith('/v1') ? trimmed.slice(0, -3) : trimmed;
    return {
      authMode: 'bearer' as const,
      sessionUrl: `${root}/v1/realtime/sessions`,
      connectUrl: `${root}/v1/realtime?model=${encodeURIComponent(model)}`,
    };
  }

  async chat(
    provider: any,
    role: any,
    messages: Array<{ role: string; content: string }>,
  ): Promise<string> {
    const apiKey = this.resolveApiKey(provider.apiKeyRef);
    try {
      if (provider.id === 'anthropic') {
        return await this.callAnthropic(provider, role, messages, apiKey);
      }
      return await this.callOpenAICompatible(provider, role, messages, apiKey);
    } catch (err: any) {
      this.logger.error(`LLM call failed (${provider.id}): ${err?.message}`);
      return 'I could not reach the language model right now. Please check your provider configuration and try again.';
    }
  }

  async createRealtimeSession(
    provider: any,
    role: any,
    options: {
      instructions: string;
      voice?: string;
      inputAudioTranscriptionModel?: string;
      turnDetection?: { type: 'server_vad'; threshold?: number; silence_duration_ms?: number } | null;
    },
  ) {
    const apiKey = this.resolveApiKey(provider.apiKeyRef);
    const { sessionUrl, connectUrl, authMode } = this.buildRealtimeEndpoints(provider.baseUrl as string, role.model as string);
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };

    if (apiKey) {
      if (authMode === 'api-key') headers['api-key'] = apiKey;
      else headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const resp = await fetch(sessionUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: role.model,
        voice: options.voice ?? 'alloy',
        instructions: options.instructions,
        input_audio_transcription: options.inputAudioTranscriptionModel
          ? { model: options.inputAudioTranscriptionModel }
          : undefined,
        turn_detection: options.turnDetection === undefined
          ? { type: 'server_vad', threshold: 0.5, silence_duration_ms: 700 }
          : options.turnDetection,
      }),
    });

    if (!resp.ok) {
      throw new Error(`Realtime session API ${resp.status}: ${await resp.text()}`);
    }

    const data: any = await resp.json();
    const ephemeralKey = data?.client_secret?.value
      ?? data?.client_secret
      ?? data?.ephemeral_api_key
      ?? data?.token;

    if (!ephemeralKey) {
      throw new Error('Realtime session response did not include an ephemeral client secret');
    }

    return {
      connectUrl,
      ephemeralKey,
      session: data,
    };
  }

  private async callOpenAICompatible(
    provider: any,
    role: any,
    messages: any[],
    apiKey?: string,
  ): Promise<string> {
    const baseUrl = (provider.baseUrl as string).replace(/\/+$/, '');
    const url = `${baseUrl}/chat/completions`;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

    const resp = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: role.model,
        messages,
        temperature: role.temperature ?? 0.7,
      }),
    });

    if (!resp.ok) {
      throw new Error(`OpenAI-compatible API ${resp.status}: ${await resp.text()}`);
    }
    const data: any = await resp.json();
    return data.choices[0].message.content as string;
  }

  private async callAnthropic(
    provider: any,
    role: any,
    messages: any[],
    apiKey?: string,
  ): Promise<string> {
    const baseUrl = (provider.baseUrl as string).replace(/\/+$/, '');
    const url = `${baseUrl}/messages`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
    };
    if (apiKey) headers['x-api-key'] = apiKey;

    const systemMessages = messages.filter((m) => m.role === 'system');
    const conversationMessages = messages.filter((m) => m.role !== 'system');

    const body: any = {
      model: role.model,
      messages: conversationMessages,
      max_tokens: 1024,
      temperature: role.temperature ?? 0.7,
    };
    if (systemMessages.length > 0) {
      body.system = systemMessages.map((m: any) => m.content).join('\n');
    }

    const resp = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      throw new Error(`Anthropic API ${resp.status}: ${await resp.text()}`);
    }
    const data: any = await resp.json();
    return data.content[0].text as string;
  }
}
