"use client";

export type CompatibilityFamily = "openai-compatible" | "anthropic-compatible";
export type ModelCapability = "chat" | "realtime" | "tts" | "stt";
export type ProviderStatus = "connected" | "needs-key" | "local" | "disabled";

export type ProviderModel = {
  id: string;          // "{providerId}:{modelName}"
  providerId: string;
  name: string;
  capabilities: ModelCapability[];
};

export type ProviderConfig = {
  id: string;
  name: string;
  compatibilityFamily: CompatibilityFamily;
  baseUrl: string;
  apiKeyRef: string | null;
  apiVersion: string | null;
  status: ProviderStatus;
  notes: string;
  models: ProviderModel[];
};

export type ModelRole = {
  id: string;
  label: string;
  purpose: string;
  providerId: string | null;
  modelId: string | null;
  model: string | null;   // denormalized model name
  temperature: number;
  enabled: boolean;
};

export const CAPABILITY_LABELS: Record<ModelCapability, string> = {
  chat: "chat",
  realtime: "realtime",
  tts: "tts",
  stt: "stt",
};

export const COMPATIBILITY_FAMILIES: CompatibilityFamily[] = [
  "openai-compatible",
  "anthropic-compatible",
];

export const PROVIDER_STATUSES: ProviderStatus[] = [
  "local",
  "connected",
  "needs-key",
  "disabled",
];

export const ALL_CAPABILITIES: ModelCapability[] = ["chat", "realtime", "tts", "stt"];
