"use client";

import { useEffect, useState } from "react";
import { Flame, Zap, BookOpen, Star, Edit2, Check } from "lucide-react";
import AppShell from "@/components/AppShell";
import { getProfile, saveProfile, type UserProfile } from "@/lib/storage";
import { ACHIEVEMENTS, LANGUAGES, DAILY_GOALS } from "@/lib/mock-data";

const AVATARS = ["🐾", "🦁", "🐯", "🦊", "🐺", "🦋", "🐉", "🦅", "🧙", "👾"];

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editAvatar, setEditAvatar] = useState("");

  useEffect(() => {
    const p = getProfile();
    setProfile(p);
    setEditName(p.name);
    setEditAvatar(p.avatar);
  }, []);

  if (!profile) return null;

  function saveEdits() {
    const updated = saveProfile({ name: editName, avatar: editAvatar });
    setProfile(updated);
    setEditing(false);
  }

  const joinDate = new Date(profile.joinDate).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const earnedAchievements = ACHIEVEMENTS.filter((a) => a.earned);
  const currentLang = LANGUAGES.find((l) => l.code === profile.currentLanguage) ?? LANGUAGES[0];

  const STREAKS = Array.from({ length: 28 }, (_, i) => {
    const ago = 27 - i;
    return ago < profile.streak;
  });

  return (
    <AppShell>
      <div className="px-6 py-8 max-w-3xl mx-auto">
        {/* Header */}
        <div className="glass-card p-6 mb-6" style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.12), rgba(34,211,238,0.06))", borderColor: "rgba(124,58,237,0.2)" }}>
          <div className="flex items-start gap-5">
            {/* Avatar */}
            {editing ? (
              <div>
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-5xl mb-2" style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)" }}>
                  {editAvatar}
                </div>
                <div className="flex flex-wrap gap-1 w-24">
                  {AVATARS.map((a) => (
                    <button
                      key={a}
                      onClick={() => setEditAvatar(a)}
                      className={`text-lg w-8 h-8 rounded-lg flex items-center justify-center transition-all ${editAvatar === a ? "bg-purple-500/30 border border-purple-500" : "hover:bg-white/10"}`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-5xl flex-shrink-0" style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)" }}>
                {profile.avatar}
              </div>
            )}

            <div className="flex-1 min-w-0">
              {editing ? (
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="text-2xl font-black bg-transparent border-b border-purple-500 focus:outline-none mb-2 w-full"
                />
              ) : (
                <h1 className="text-2xl font-black mb-1">{profile.name}</h1>
              )}
              <p className="text-sm text-muted mb-3">Member since {joinDate}</p>
              <div className="flex flex-wrap gap-2">
                <span className="streak-badge">
                  <Flame size={12} /> {profile.streak} day streak
                </span>
                <span className="level-badge">{currentLang.level} {currentLang.name}</span>
              </div>
            </div>

            {editing ? (
              <button onClick={saveEdits} className="btn-primary flex items-center gap-1.5 text-sm py-2 px-4">
                <Check size={14} /> Save
              </button>
            ) : (
              <button onClick={() => setEditing(true)} className="btn-secondary flex items-center gap-1.5 text-sm py-2 px-4">
                <Edit2 size={14} /> Edit
              </button>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Stats */}
          <div>
            <h2 className="font-bold text-lg mb-4">Statistics</h2>
            <div className="grid grid-cols-2 gap-3 mb-5">
              {[
                { label: "Total XP", value: profile.totalXp.toLocaleString(), icon: <Zap size={16} className="text-amber-400" />, color: "text-amber-400" },
                { label: "Longest Streak", value: `${profile.longestStreak}d`, icon: <Flame size={16} className="text-red-400" />, color: "text-red-400" },
                { label: "Lessons Done", value: profile.completedLessons.length, icon: <BookOpen size={16} className="text-cyan-400" />, color: "text-cyan-400" },
                { label: "Stories Read", value: profile.completedStories.length, icon: <Star size={16} className="text-green-400" />, color: "text-green-400" },
              ].map((stat) => (
                <div key={stat.label} className="glass-card p-4">
                  <div className="flex items-center gap-2 mb-2">{stat.icon}<span className="text-xs text-muted">{stat.label}</span></div>
                  <div className={`text-2xl font-black ${stat.color}`}>{stat.value}</div>
                </div>
              ))}
            </div>

            {/* Streak calendar */}
            <div className="glass-card p-5">
              <h3 className="font-semibold text-sm mb-3">Activity (last 28 days)</h3>
              <div className="grid grid-cols-7 gap-1.5">
                {STREAKS.map((active, i) => (
                  <div
                    key={i}
                    className="aspect-square rounded-md"
                    style={{
                      background: active
                        ? "linear-gradient(135deg, #7c3aed, #2563eb)"
                        : "rgba(255,255,255,0.05)",
                    }}
                    title={active ? "Active" : "Inactive"}
                  />
                ))}
              </div>
              <div className="flex items-center justify-between mt-3 text-xs text-muted">
                <span>4 weeks ago</span>
                <span>Today</span>
              </div>
            </div>
          </div>

          {/* Achievements */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg">Achievements</h2>
              <span className="text-xs text-muted">{earnedAchievements.length} / {ACHIEVEMENTS.length}</span>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {ACHIEVEMENTS.map((a) => (
                <div
                  key={a.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                    a.earned
                      ? "border-amber-500/20 bg-amber-500/5"
                      : "border-white/5 bg-white/2 opacity-50"
                  }`}
                >
                  <span className="text-2xl">{a.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{a.title}</div>
                    <div className="text-xs text-muted">{a.description}</div>
                  </div>
                  {a.earned && <Check size={14} className="text-amber-400 flex-shrink-0" />}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Daily goal settings */}
        <div className="glass-card p-6 mt-6">
          <h2 className="font-bold text-lg mb-4">Daily Goal</h2>
          <div className="grid grid-cols-4 gap-3">
            {DAILY_GOALS.map((g) => (
              <button
                key={g.xp}
                onClick={() => {
                  const updated = saveProfile({ dailyGoalXp: g.xp });
                  setProfile(updated);
                }}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                  profile.dailyGoalXp === g.xp
                    ? "border-purple-500 bg-purple-500/15"
                    : "border-white/8 bg-white/4 hover:border-purple-500/30"
                }`}
              >
                <span className="text-xl">{g.icon}</span>
                <span className="text-xs font-bold">{g.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
