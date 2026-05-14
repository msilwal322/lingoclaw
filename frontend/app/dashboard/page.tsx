"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, ArrowRight, Lock, CheckCircle, Clock, Terminal } from "lucide-react";
import AppShell from "@/components/AppShell";
import type { UserProfile } from "@/lib/storage";
import type { Language, Lesson } from "@/lib/mock-data";
import { api } from "@/lib/api";

function LessonCard({ lesson, profile }: { lesson: Lesson; profile: UserProfile }) {
  const isCompleted = profile.completedLessons.includes(lesson.id);
  const isLocked = lesson.locked;

  const typeColors: Record<string, string> = {
    vocabulary: "border-[#5ac8fa] text-[#5ac8fa]",
    grammar: "border-[#007aff] text-[#007aff]",
    listening: "border-[#ff9f0a] text-[#ff9f0a]",
    speaking: "border-[#30d158] text-[#30d158]",
  };

  return (
    <Link
      href={isLocked ? "#" : `/lesson/${lesson.id}`}
      className={`workbench-card-hover p-4 flex items-start gap-4 ${
        isLocked
          ? "opacity-50 cursor-not-allowed"
          : isCompleted
          ? "border-[#30d158]/30"
          : "cursor-pointer"
      }`}
      onClick={isLocked ? (e) => e.preventDefault() : undefined}
    >
      <div className={`w-10 h-10 rounded flex items-center justify-center flex-shrink-0 border ${
        isCompleted ? "bg-[#30d158]/10 border-[#30d158]/30" : "border-white/10"
      }`}>
        {isLocked ? (
          <Lock size={16} className="text-muted" />
        ) : isCompleted ? (
          <CheckCircle size={16} style={{color: "#30d158"}} />
        ) : (
          <BookOpen size={16} className="text-muted" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className={`font-medium text-sm ${isCompleted ? "text-muted line-through" : ""}`}>
            {lesson.title}
          </h3>
          <span className={`text-[11px] font-medium px-2 py-0.5 rounded border flex-shrink-0 ${typeColors[lesson.type]}`}>
            {lesson.type}
          </span>
        </div>
        <p className="text-xs text-muted mb-2 leading-relaxed">{lesson.description}</p>
        <div className="flex items-center gap-3 text-[11px] text-dimmed">
          <span className="flex items-center gap-1">
            <Clock size={10} /> {lesson.duration} min
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [languages, setLanguages] = useState<Language[] | null>(null);
  const [lessons, setLessons] = useState<Lesson[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.me(), api.languages(), api.lessons()])
      .then(([nextProfile, nextLanguages, nextLessons]) => {
        setProfile(nextProfile);
        setLanguages(nextLanguages);
        setLessons(nextLessons);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load dashboard"));
  }, []);

  if (error) return (
    <AppShell>
      <div className="min-h-screen bg-[#201d1d] text-[#fdfcfc] font-mono flex items-center justify-center">
        <p className="text-sm text-[#9a9898]">Error loading dashboard: {error}</p>
      </div>
    </AppShell>
  );

  if (!profile || !languages || !lessons) return (
    <AppShell>
      <div className="min-h-screen bg-[#201d1d] text-[#fdfcfc] font-mono flex items-center justify-center">
        <p className="text-sm text-[#9a9898]">Loading...</p>
      </div>
    </AppShell>
  );

  const currentLang = languages.find((l) => l.code === profile.currentLanguage) ?? languages[0];
  const levelPct = currentLang ? Math.round((currentLang.xp / currentLang.totalXp) * 100) : 0;

  const todayLessons = lessons.slice(0, 4);

  return (
    <AppShell>
      <div className="min-h-screen bg-[#201d1d] text-[#fdfcfc] font-mono">
        <section className="px-5 md:px-10 py-8 border-b border-white/10">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-2 text-xs text-[#9a9898] mb-2">
              <Terminal size={14} /> ~/learn/{currentLang?.code ?? "—"}
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-6">Learn graph</h1>

            <div className="grid lg:grid-cols-3 gap-5 mb-6">
              <div className="border border-white/10 rounded p-4 bg-[#252121]">
                <div className="text-xs text-[#9a9898] mb-1">Current language</div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{currentLang?.flag}</span>
                  <div>
                    <div className="font-bold">{currentLang?.name}</div>
                    <div className="text-xs text-[#9a9898]">{currentLang?.level}</div>
                  </div>
                </div>
              </div>

              <div className="border border-white/10 rounded p-4 bg-[#252121]">
                <div className="text-xs text-[#9a9898] mb-1">Progress</div>
                <div className="text-2xl font-bold mb-2">{levelPct}%</div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${levelPct}%` }} />
                </div>
              </div>

              <div className="border border-white/10 rounded p-4 bg-[#252121]">
                <div className="text-xs text-[#9a9898] mb-1">Completed</div>
                <div className="text-2xl font-bold">{profile.completedLessons.length}</div>
                <div className="text-xs text-[#9a9898] mt-1">lessons finished</div>
              </div>
            </div>
          </div>
        </section>

        <section className="px-5 md:px-10 py-8 max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-[1fr_.85fr] gap-6">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-lg">Available lessons</h2>
                <Link href="/lesson/l3" className="text-xs text-[#007aff] hover:text-[#5ac8fa] flex items-center gap-1">
                  View all <ArrowRight size={12} />
                </Link>
              </div>
              <div className="space-y-3">
                {todayLessons.map((lesson) => (
                  <LessonCard key={lesson.id} lesson={lesson} profile={profile} />
                ))}
              </div>
            </div>

            <div className="space-y-5">
              <div className="border border-white/10 rounded p-5 bg-[#252121]">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl">{currentLang?.flag}</span>
                  <div>
                    <div className="font-bold">{currentLang?.name}</div>
                    <div className="text-xs text-[#9a9898] mt-1">{currentLang?.level}</div>
                  </div>
                </div>
                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-[#9a9898]">Level progress</span>
                    <span className="font-medium">
                      {currentLang?.xp.toLocaleString()} / {currentLang?.totalXp.toLocaleString()}
                    </span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${levelPct}%` }} />
                  </div>
                </div>
                <Link href="/lesson/l3" className="border border-white/15 bg-[#302c2c] hover:bg-[#3a3535] rounded px-4 py-2.5 text-sm flex items-center justify-center gap-2 transition-colors">
                  Continue learning <ArrowRight size={14} />
                </Link>
              </div>

              <div className="border border-white/10 rounded p-5 bg-[#252121]">
                <h3 className="font-semibold text-sm mb-3">Quick access</h3>
                <div className="space-y-2">
                  {[
                    { href: "/practice", label: "Practice mode", icon: "🎯" },
                    { href: "/chat", label: "Tutor chat", icon: "💬" },
                    { href: "/stories", label: "Read stories", icon: "📖" },
                  ].map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center gap-3 p-3 rounded hover:bg-[#302c2c] transition-colors group"
                    >
                      <span className="text-lg">{item.icon}</span>
                      <span className="text-sm font-medium group-hover:text-[#fdfcfc] text-[#9a9898] transition-colors">
                        {item.label}
                      </span>
                      <ArrowRight size={14} className="ml-auto text-[#9a9898] group-hover:text-[#007aff] transition-colors" />
                    </Link>
                  ))}
                </div>
              </div>

              <div className="border border-white/10 rounded p-5 bg-[#252121]">
                <h3 className="font-semibold text-sm mb-3">Your languages</h3>
                <div className="space-y-2">
                  {languages.filter((l) => l.xp > 0).map((lang) => (
                    <div key={lang.code} className="flex items-center gap-2">
                      <span className="text-xl">{lang.flag}</span>
                      <div className="flex-1">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-medium">{lang.name}</span>
                          <span className="text-[#9a9898]">{lang.level}</span>
                        </div>
                        <div className="progress-track" style={{ height: 4 }}>
                          <div
                            className="progress-fill"
                            style={{ width: `${Math.round((lang.xp / lang.totalXp) * 100)}%`, height: 4 }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  <Link href="/onboarding" className="flex items-center gap-2 p-2 rounded hover:bg-[#302c2c] transition-colors text-xs text-muted">
                    + Add a language
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
