"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Flame, Zap, BookOpen, Target, ArrowRight, Lock, CheckCircle, Clock } from "lucide-react";
import AppShell from "@/components/AppShell";
import { getProfile, type UserProfile } from "@/lib/storage";
import { LESSONS, LANGUAGES } from "@/lib/mock-data";

function LessonCard({ lesson, profile }: { lesson: (typeof LESSONS)[0]; profile: UserProfile }) {
  const isCompleted = profile.completedLessons.includes(lesson.id);
  const isLocked = lesson.locked;

  const typeColors: Record<string, string> = {
    vocabulary: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",
    grammar: "text-purple-400 bg-purple-400/10 border-purple-400/20",
    listening: "text-amber-400 bg-amber-400/10 border-amber-400/20",
    speaking: "text-green-400 bg-green-400/10 border-green-400/20",
  };

  return (
    <Link
      href={isLocked ? "#" : `/lesson/${lesson.id}`}
      className={`glass-card p-5 flex items-start gap-4 transition-all duration-200 ${
        isLocked
          ? "opacity-50 cursor-not-allowed"
          : isCompleted
          ? "border-green-500/20"
          : "glass-card-hover cursor-pointer"
      }`}
      onClick={isLocked ? (e) => e.preventDefault() : undefined}
    >
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
        isCompleted ? "bg-green-500/15 border border-green-500/30" : "bg-white/5"
      }`}>
        {isLocked ? (
          <Lock size={18} className="text-muted" />
        ) : isCompleted ? (
          <CheckCircle size={18} className="text-green-400" />
        ) : (
          <BookOpen size={18} className="text-purple-400" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className={`font-semibold text-sm ${isCompleted ? "text-slate-400 line-through" : ""}`}>
            {lesson.title}
          </h3>
          <span className={`text-xs font-medium px-2 py-0.5 rounded border flex-shrink-0 ${typeColors[lesson.type]}`}>
            {lesson.type}
          </span>
        </div>
        <p className="text-xs text-muted mb-3 leading-relaxed">{lesson.description}</p>
        <div className="flex items-center gap-3 text-xs text-muted">
          <span className="flex items-center gap-1">
            <Clock size={11} /> {lesson.duration} min
          </span>
          <span className="flex items-center gap-1 text-amber-400">
            <Zap size={11} /> +{lesson.xpReward} XP
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    setProfile(getProfile());
  }, []);

  if (!profile) return null;

  const currentLang = LANGUAGES.find((l) => l.code === profile.currentLanguage) ?? LANGUAGES[0];
  const goalPct = Math.min(100, Math.round((profile.todayXp / profile.dailyGoalXp) * 100));
  const levelPct = Math.round((currentLang.xp / currentLang.totalXp) * 100);

  const todayLessons = LESSONS.slice(0, 4);
  const upcomingLessons = LESSONS.slice(4, 8);

  return (
    <AppShell>
      <div className="px-6 py-8 max-w-4xl mx-auto">
        {/* Greeting */}
        <div className="mb-8">
          <h1 className="text-2xl font-black mb-1">
            Welcome back, {profile.name.split(" ")[0]} 👋
          </h1>
          <p className="text-muted text-sm">
            {goalPct >= 100
              ? "Daily goal complete! Keep the streak alive! 🔥"
              : `${profile.dailyGoalXp - profile.todayXp} XP left to hit your daily goal.`}
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="glass-card p-4 text-center">
            <div className="streak-badge justify-center mb-2">
              <Flame size={14} />
              {profile.streak}
            </div>
            <div className="text-xs text-muted">Day Streak</div>
          </div>
          <div className="glass-card p-4 text-center">
            <div className="text-xl font-black gradient-text mb-1">
              {profile.totalXp.toLocaleString()}
            </div>
            <div className="text-xs text-muted">Total XP</div>
          </div>
          <div className="glass-card p-4 text-center">
            <div className="text-xl font-black text-cyan-400 mb-1">
              {profile.completedLessons.length}
            </div>
            <div className="text-xs text-muted">Lessons Done</div>
          </div>
          <div className="glass-card p-4 text-center">
            <div className="text-xl font-black text-amber-400 mb-1">
              {profile.completedStories.length}
            </div>
            <div className="text-xs text-muted">Stories Read</div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Main content: lessons */}
          <div className="md:col-span-2 space-y-6">
            {/* Daily goal */}
            <div className="glass-card p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Target size={16} className="text-purple-400" />
                  <span className="font-semibold text-sm">Daily Goal</span>
                </div>
                <span className="text-xs font-bold text-purple-400">
                  {profile.todayXp} / {profile.dailyGoalXp} XP
                </span>
              </div>
              <div className="xp-bar-track mb-2">
                <div className="xp-bar-fill" style={{ width: `${goalPct}%` }} />
              </div>
              {goalPct >= 100 && (
                <p className="text-xs text-green-400 font-medium">
                  ✓ Goal complete! You can still earn more XP today.
                </p>
              )}
            </div>

            {/* Today's lessons */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-lg">Today&rsquo;s Lessons</h2>
                <Link href="/lesson/l3" className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1">
                  View all <ArrowRight size={12} />
                </Link>
              </div>
              <div className="space-y-3">
                {todayLessons.map((lesson) => (
                  <LessonCard key={lesson.id} lesson={lesson} profile={profile} />
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar widgets */}
          <div className="space-y-5">
            {/* Current language */}
            <div className="glass-card p-5">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">{currentLang.flag}</span>
                <div>
                  <div className="font-bold">{currentLang.name}</div>
                  <div className="level-badge mt-1">{currentLang.level}</div>
                </div>
              </div>
              <div className="mb-2">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-muted">Progress</span>
                  <span className="font-medium text-purple-400">
                    {currentLang.xp.toLocaleString()} / {currentLang.totalXp.toLocaleString()} XP
                  </span>
                </div>
                <div className="xp-bar-track">
                  <div className="xp-bar-fill" style={{ width: `${levelPct}%` }} />
                </div>
              </div>
              <Link href="/lesson/l3" className="btn-primary w-full text-center text-sm py-2.5 mt-4 flex items-center justify-center gap-2">
                Continue Learning <ArrowRight size={14} />
              </Link>
            </div>

            {/* Quick actions */}
            <div className="glass-card p-5">
              <h3 className="font-semibold text-sm mb-3">Quick Practice</h3>
              <div className="space-y-2">
                {[
                  { href: "/practice", label: "Flashcards", emoji: "🃏" },
                  { href: "/chat", label: "Talk to Claw", emoji: "💬" },
                  { href: "/stories", label: "Read a Story", emoji: "📖" },
                ].map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors group"
                  >
                    <span className="text-lg">{item.emoji}</span>
                    <span className="text-sm font-medium group-hover:text-purple-300 transition-colors">
                      {item.label}
                    </span>
                    <ArrowRight size={14} className="ml-auto text-muted group-hover:text-purple-400 transition-colors" />
                  </Link>
                ))}
              </div>
            </div>

            {/* Active languages */}
            <div className="glass-card p-5">
              <h3 className="font-semibold text-sm mb-3">Your Languages</h3>
              <div className="space-y-2">
                {LANGUAGES.filter((l) => l.xp > 0).map((lang) => (
                  <div key={lang.code} className="flex items-center gap-2">
                    <span className="text-xl">{lang.flag}</span>
                    <div className="flex-1">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium">{lang.name}</span>
                        <span className="level-badge text-xs py-0">{lang.level}</span>
                      </div>
                      <div className="xp-bar-track" style={{ height: 4 }}>
                        <div
                          className="xp-bar-fill"
                          style={{ width: `${Math.round((lang.xp / lang.totalXp) * 100)}%`, height: 4 }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <Link href="/onboarding" className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 transition-colors text-xs text-muted">
                  + Add a language
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
