export type CompatibilityFamily = 'openai-compatible' | 'anthropic-compatible';
export type ModelCapability = 'chat' | 'realtime' | 'tts' | 'stt';
export type ProviderStatus = 'connected' | 'needs-key' | 'local' | 'disabled';

export interface Provider {
  id: string;
  name: string;
  compatibilityFamily: CompatibilityFamily;
  baseUrl: string;
  apiKeyRef: string | null;
  apiVersion: string | null;
  status: ProviderStatus;
  notes: string;
}

export interface ProviderModel {
  id: string;        // "{providerId}:{modelName}"
  providerId: string;
  name: string;
  capabilities: ModelCapability[];
}

export interface ProviderWithModels extends Provider {
  models: ProviderModel[];
}

export interface Role {
  id: string;
  label: string;
  purpose: string;
  providerId: string | null;
  modelId: string | null;
  model: string | null;   // denormalized model name for API consumers
  temperature: number;
  enabled: boolean;
}

export type RoleInput = Omit<Role, 'model'> & { model?: string | null };
