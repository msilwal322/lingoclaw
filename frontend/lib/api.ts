import type { Language, Lesson, Question, Story, Achievement, LeaderboardUser } from "./mock-data";
import type { UserProfile } from "./storage";
import type { ModelRole, ProviderConfig } from "./providers";

export function getApiUrl() {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== "undefined") return `${window.location.protocol}//${window.location.hostname}:3001`;
  return "http://localhost:3001";
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${getApiUrl()}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`${init?.method ?? "GET"} ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export type LessonWithQuestions = Lesson & { questions: Question[] };

export const api = {
  health: () => request<{ ok: boolean; service: string; time: string }>("/health"),
  languages: () => request<Language[]>("/languages"),
  me: () => request<UserProfile>("/me"),
  updateMe: (patch: Partial<UserProfile>) => request<UserProfile>("/me", { method: "PATCH", body: JSON.stringify(patch) }),
  progress: () => request<Pick<UserProfile, "totalXp" | "todayXp" | "streak" | "longestStreak" | "completedLessons" | "completedStories" | "dailyGoalXp">>("/me/progress"),
  lessons: (lang = "es") => request<Lesson[]>(`/lessons?lang=${encodeURIComponent(lang)}`),
  lesson: (id: string) => request<LessonWithQuestions>(`/lessons/${encodeURIComponent(id)}`),
  completeLesson: (id: string, score: number) => request<{ profile: UserProfile; lesson: Lesson; score: number; xpEarned: number }>(`/lessons/${encodeURIComponent(id)}/complete`, { method: "POST", body: JSON.stringify({ score }) }),
  stories: (lang = "es") => request<Story[]>(`/stories?lang=${encodeURIComponent(lang)}`),
  completeStory: (id: string) => request<{ profile: UserProfile; storyId: string }>(`/stories/${encodeURIComponent(id)}/complete`, { method: "POST", body: JSON.stringify({}) }),
  achievements: () => request<Achievement[]>("/achievements"),
  leaderboard: () => request<LeaderboardUser[]>("/leaderboard"),
  providers: () => request<ProviderConfig[]>("/providers"),
  saveProviders: (providers: ProviderConfig[]) => request<ProviderConfig[]>("/providers", { method: "PUT", body: JSON.stringify(providers) }),
  roles: () => request<ModelRole[]>("/providers/roles"),
  saveRoles: (roles: ModelRole[]) => request<ModelRole[]>("/providers/roles", { method: "PUT", body: JSON.stringify(roles) }),
  createChatSession: () => request<{ id: string; createdAt: string; languageCode: string }>("/chat/sessions", { method: "POST", body: JSON.stringify({}) }),
  sendChatMessage: (sessionId: string, content: string) => request<{ message: { id: string; role: "assistant"; content: string; createdAt: string } }>(`/chat/sessions/${encodeURIComponent(sessionId)}/messages`, { method: "POST", body: JSON.stringify({ content }) }),
};
