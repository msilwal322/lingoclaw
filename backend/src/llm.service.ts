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
