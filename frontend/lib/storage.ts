"use client";

const PREFIX = "lingoclaw_";

export function get<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw !== null ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function set<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PREFIX + key, JSON.stringify(value));
}

export function remove(key: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(PREFIX + key);
}

export type UserProfile = {
  name: string;
  email: string;
  avatar: string;
  joinDate: string;
  dailyGoalXp: number;
  currentLanguage: string;
  totalXp: number;
  streak: number;
  longestStreak: number;
  completedLessons: string[];
  completedStories: string[];
  lastActiveDate: string;
  todayXp: number;
  onboarded?: boolean;
};

export const DEFAULT_PROFILE: UserProfile = {
  name: "Learner",
  email: "",
  avatar: "🐾",
  joinDate: new Date().toISOString(),
  dailyGoalXp: 20,
  currentLanguage: "es",
  totalXp: 0,
  streak: 0,
  longestStreak: 0,
  completedLessons: [],
  completedStories: [],
  lastActiveDate: new Date().toISOString().split("T")[0],
  todayXp: 0,
  onboarded: false,
};

export function getProfile(): UserProfile {
  return get<UserProfile>("profile", DEFAULT_PROFILE);
}

export function saveProfile(profile: Partial<UserProfile>): UserProfile {
  const current = getProfile();
  const updated = { ...current, ...profile };
  set("profile", updated);
  return updated;
}

export function addXp(amount: number): UserProfile {
  const profile = getProfile();
  const today = new Date().toISOString().split("T")[0];
  const todayXp = profile.lastActiveDate === today ? profile.todayXp + amount : amount;
  return saveProfile({
    totalXp: profile.totalXp + amount,
    todayXp,
    lastActiveDate: today,
  });
}

export function completeLesson(lessonId: string, xpGained: number): UserProfile {
  const profile = getProfile();
  const completedLessons = Array.from(new Set([...profile.completedLessons, lessonId]));
  const updated = addXp(xpGained);
  return saveProfile({ ...updated, completedLessons });
}

export function completeStory(storyId: string): UserProfile {
  const profile = getProfile();
  const completedStories = Array.from(new Set([...profile.completedStories, storyId]));
  return saveProfile({ completedStories });
}

export function isOnboarded(): boolean {
  return get<boolean>("onboarded", false);
}

export function setOnboarded(): void {
  set("onboarded", true);
}
