"use client";

import { useEffect, useState } from "react";
import { BookOpen, Edit2, Check, Settings as SettingsIcon, Terminal } from "lucide-react";
import AppShell from "@/components/AppShell";
import type { UserProfile } from "@/lib/storage";
import { DAILY_GOALS, type Language } from "@/lib/mock-data";
import { api } from "@/lib/api";

const AVATARS = ["🐾", "🦁", "🐯", "🦊", "🐺", "🦋", "🐉", "🦅", "🧙", "👾"];

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editAvatar, setEditAvatar] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.me(), api.languages()])
      .then(([p, langs]) => {
        setProfile(p);
        setEditName(p.name);
        setEditAvatar(p.avatar);
        setLanguages(langs);
      })
      .catch(() => setError("Could not reach backend. Make sure the local server is running."));
  }, []);

  if (error) {
    return (
      <AppShell>
        <div className="min-h-screen bg-[#201d1d] text-[#fdfcfc] font-mono px-6 py-8 max-w-3xl mx-auto flex items-center justify-center">
          <div className="border border-red-500/30 rounded p-6 bg-[#252121] text-center">
            <div className="text-red-400 mb-2">● backend unreachable</div>
            <p className="text-sm text-muted">{error}</p>
          </div>
        </div>
      </AppShell>
    );
  }

  if (!profile) return null;

  async function saveEdits() {
    const updated = await api.updateMe({ name: editName, avatar: editAvatar }).catch(() => null);
    if (updated) {
      setProfile(updated);
      setEditing(false);
    }
  }

  async function setDailyGoal(xp: number) {
    const updated = await api.updateMe({ dailyGoalXp: xp }).catch(() => null);
    if (updated) setProfile(updated);
  }

  async function setActiveLanguage(code: string) {
    const updated = await api.updateMe({ currentLanguage: code }).catch(() => null);
    if (updated) setProfile(updated);
  }

  const joinDate = new Date(profile.joinDate).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const currentLang = languages.find((l) => l.code === profile.currentLanguage) ?? languages[0];
  const startedLanguages = languages.filter((l) => l.xp > 0);

  return (
    <AppShell>
      <div className="min-h-screen bg-[#201d1d] text-[#fdfcfc] font-mono px-6 py-8 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-2 text-xs text-[#9a9898] mb-2">
          <Terminal size={14} /> ~/settings
        </div>
        <h1 className="text-3xl font-bold mb-8">Settings</h1>

        {/* Profile section */}
        <div className="border border-white/10 rounded p-6 mb-6 bg-[#252121]">
          <div className="flex items-start gap-5">
            {/* Avatar */}
            {editing ? (
              <div>
                <div className="w-20 h-20 rounded flex items-center justify-center text-5xl mb-2 border border-white/10 bg-[#302c2c]">
                  {editAvatar}
                </div>
                <div className="flex flex-wrap gap-1 w-24">
                  {AVATARS.map((a) => (
                    <button
                      key={a}
                      onClick={() => setEditAvatar(a)}
                      className={`text-lg w-8 h-8 rounded flex items-center justify-center transition-all border ${editAvatar === a ? "bg-[#007aff]/15 border-[#007aff]" : "border-white/10 hover:bg-[#302c2c]"}`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="w-20 h-20 rounded flex items-center justify-center text-5xl flex-shrink-0 border border-white/10 bg-[#302c2c]">
                {profile.avatar}
              </div>
            )}

            <div className="flex-1 min-w-0">
              {editing ? (
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="workbench-input text-2xl font-bold mb-2 w-full"
                />
              ) : (
                <h1 className="text-2xl font-bold mb-1">{profile.name}</h1>
              )}
              <p className="text-sm text-muted mb-3">Active since {joinDate}</p>
              {currentLang && (
                <div className="flex flex-wrap gap-2">
                  <span className="badge-info">{currentLang.level} {currentLang.name}</span>
                </div>
              )}
            </div>

            {editing ? (
              <button onClick={saveEdits} className="btn-workbench-primary flex items-center gap-1.5 text-sm py-2 px-4">
                <Check size={14} /> Save
              </button>
            ) : (
              <button onClick={() => setEditing(true)} className="btn-workbench-secondary flex items-center gap-1.5 text-sm py-2 px-4">
                <Edit2 size={14} /> Edit
              </button>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Workspace stats */}
          <div>
            <h2 className="font-bold text-lg mb-4">Workspace stats</h2>
            <div className="grid grid-cols-2 gap-3 mb-5">
              {[
                { label: "Lessons", value: profile.completedLessons.length, icon: <BookOpen size={16} style={{color: "#5ac8fa"}} /> },
                { label: "Stories", value: profile.completedStories.length, icon: <BookOpen size={16} style={{color: "#30d158"}} /> },
                { label: "Languages", value: languages.length, icon: <SettingsIcon size={16} style={{color: "#ff9f0a"}} /> },
                { label: "Current level", value: currentLang?.level ?? "—", icon: <Terminal size={16} style={{color: "#007aff"}} /> },
              ].map((stat) => (
                <div key={stat.label} className="border border-white/10 rounded p-4 bg-[#252121]">
                  <div className="flex items-center gap-2 mb-2">{stat.icon}<span className="text-xs text-muted">{stat.label}</span></div>
                  <div className="text-2xl font-bold">{stat.value}</div>
                </div>
              ))}
            </div>

            {/* Progress bars */}
            <div className="border border-white/10 rounded p-5 bg-[#252121]">
              <h3 className="font-semibold text-sm mb-3">Language progress</h3>
              {startedLanguages.length === 0 ? (
                <p className="text-xs text-muted">No language progress yet. Complete a lesson to get started.</p>
              ) : (
                <div className="space-y-3">
                  {startedLanguages.map((lang) => (
                    <div key={lang.code}>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{lang.flag}</span>
                          <span className="font-medium">{lang.name}</span>
                        </div>
                        <span className="text-muted">{lang.level}</span>
                      </div>
                      <div className="progress-track">
                        <div className="progress-fill" style={{ width: `${Math.round((lang.xp / lang.totalXp) * 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Preferences */}
          <div>
            <h2 className="font-bold text-lg mb-4">Preferences</h2>

            {/* Daily goal settings */}
            <div className="border border-white/10 rounded p-5 mb-5 bg-[#252121]">
              <h3 className="font-semibold text-sm mb-3">Daily practice goal</h3>
              <div className="grid grid-cols-2 gap-3">
                {DAILY_GOALS.map((g) => (
                  <button
                    key={g.xp}
                    onClick={() => setDailyGoal(g.xp)}
                    className={`flex flex-col items-center gap-2 p-3 rounded border transition-all ${
                      profile.dailyGoalXp === g.xp
                        ? "border-[#007aff] bg-[#007aff]/15"
                        : "border-white/10 bg-[#302c2c] hover:border-white/20"
                    }`}
                  >
                    <span className="text-xl">{g.icon}</span>
                    <span className="text-xs font-bold">{g.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Current language */}
            <div className="border border-white/10 rounded p-5 bg-[#252121]">
              <h3 className="font-semibold text-sm mb-3">Active language</h3>
              <div className="space-y-2">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => setActiveLanguage(lang.code)}
                    className={`w-full flex items-center gap-3 p-3 rounded border transition-all ${
                      profile.currentLanguage === lang.code
                        ? "border-[#007aff] bg-[#007aff]/15"
                        : "border-white/10 bg-[#302c2c] hover:border-white/20"
                    }`}
                  >
                    <span className="text-2xl">{lang.flag}</span>
                    <div className="flex-1 text-left">
                      <div className="font-medium text-sm">{lang.name}</div>
                      <div className="text-xs text-muted">{lang.level}</div>
                    </div>
                    {profile.currentLanguage === lang.code && (
                      <Check size={14} style={{color: "#007aff"}} />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Backend-backed notice */}
        <div className="border border-white/10 rounded p-4 mt-6 text-xs text-muted bg-[#252121] leading-relaxed">
          <div style={{color: "#30d158"}} className="mb-1">● backend workspace</div>
          Settings and progress are persisted in the local backend. No external account or cloud service needed.
        </div>
      </div>
    </AppShell>
  );
}
