"use client";

import { get, set } from "./storage";

export type ProviderKind = "llm" | "tts" | "stt" | "embedding";
export type ProviderStatus = "connected" | "needs-key" | "local" | "disabled";

export type ProviderConfig = {
  id: string;
  name: string;
  kind: ProviderKind;
  baseUrl: string;
  apiKeyRef: string;
  status: ProviderStatus;
  notes: string;
  models: string[];
};

export type ModelRole = {
  id: string;
  label: string;
  purpose: string;
  providerId: string;
  model: string;
  temperature: number;
  enabled: boolean;
};

export const DEFAULT_PROVIDERS: ProviderConfig[] = [
  {
    id: "openai-compatible",
    name: "OpenAI compatible",
    kind: "llm",
    baseUrl: "http://localhost:11434/v1",
    apiKeyRef: "LINGOCLAW_OPENAI_KEY",
    status: "local",
    notes: "Works with Ollama, LM Studio, vLLM, or any OpenAI-shaped endpoint. For realtime voice, point to an OpenAI-compatible realtime endpoint.",
    models: ["qwen3:8b", "llama3.2", "gpt-4.1-mini", "gpt-realtime-mini", "gpt-4o-realtime-preview"],
  },
  {
    id: "anthropic",
    name: "Anthropic",
    kind: "llm",
    baseUrl: "https://api.anthropic.com/v1",
    apiKeyRef: "ANTHROPIC_API_KEY",
    status: "needs-key",
    notes: "Good fit for tutor chat, explanations, and evaluation rubrics.",
    models: ["claude-sonnet-4-5", "claude-haiku-4-5"],
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    kind: "llm",
    baseUrl: "https://openrouter.ai/api/v1",
    apiKeyRef: "OPENROUTER_API_KEY",
    status: "needs-key",
    notes: "Route lessons and chat across open and closed models.",
    models: ["meta-llama/llama-3.3-70b-instruct", "qwen/qwen-2.5-72b-instruct", "anthropic/claude-sonnet-4"],
  },
  {
    id: "piper",
    name: "Piper TTS",
    kind: "tts",
    baseUrl: "http://localhost:5002",
    apiKeyRef: "none",
    status: "local",
    notes: "Local text-to-speech voices for speaking drills.",
    models: ["en_US-lessac-medium", "es_ES-sharvard-medium", "fr_FR-upmc-medium"],
  },
  {
    id: "whisper",
    name: "Whisper.cpp",
    kind: "stt",
    baseUrl: "http://localhost:8080",
    apiKeyRef: "none",
    status: "local",
    notes: "Local speech recognition for pronunciation and conversation mode.",
    models: ["base", "small", "medium"],
  },
];

export const DEFAULT_ROLES: ModelRole[] = [
  { id: "tutor-chat", label: "Tutor chat", purpose: "Socratic corrections, grammar explanations, and adaptive conversation.", providerId: "anthropic", model: "claude-sonnet-4-5", temperature: 0.7, enabled: true },
  { id: "stt", label: "Speech to text", purpose: "Transcribe learner speech for voice talk and pronunciation checks.", providerId: "whisper", model: "small", temperature: 0, enabled: true },
  { id: "voice-talk", label: "Voice talk brain", purpose: "Low-latency spoken roleplay with short turns and corrections. Realtime-capable models preferred.", providerId: "openai-compatible", model: "gpt-realtime-mini", temperature: 0.5, enabled: true },
  { id: "tts", label: "Text to speech", purpose: "Pronunciation playback and listening comprehension prompts.", providerId: "piper", model: "es_ES-sharvard-medium", temperature: 0, enabled: true },
  { id: "lesson-gen", label: "Lesson generator", purpose: "Generate drills, stories, cloze tests, and spaced-repetition cards.", providerId: "openrouter", model: "qwen/qwen-2.5-72b-instruct", temperature: 0.8, enabled: true },
  { id: "translation", label: "Translation", purpose: "Literal and natural translations with word-by-word glosses.", providerId: "openai-compatible", model: "llama3.2", temperature: 0.2, enabled: true },
  { id: "evaluation", label: "Evaluation", purpose: "Grade answers, detect mistakes, and produce concise feedback.", providerId: "anthropic", model: "claude-haiku-4-5", temperature: 0.1, enabled: true },
];

export function getProviders(): ProviderConfig[] {
  return get<ProviderConfig[]>("providers", DEFAULT_PROVIDERS);
}

export function saveProviders(providers: ProviderConfig[]) {
  set("providers", providers);
}

export function getModelRoles(): ModelRole[] {
  return get<ModelRole[]>("model_roles", DEFAULT_ROLES);
}

export function saveModelRoles(roles: ModelRole[]) {
  set("model_roles", roles);
}

export function configuredCount() {
  return getProviders().filter((p) => p.status === "connected" || p.status === "local").length;
}
