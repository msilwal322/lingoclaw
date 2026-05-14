"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BookOpen, Check, Clock, Loader2, Sparkles } from "lucide-react";
import AppShell from "@/components/AppShell";
import type { Story } from "@/lib/mock-data";
import type { UserProfile } from "@/lib/storage";
import { api } from "@/lib/api";

const LEVEL_COLORS: Record<string, string> = {
  A1: "border-[#30d158] text-[#30d158]",
  A2: "border-[#5ac8fa] text-[#5ac8fa]",
  B1: "border-[#007aff] text-[#007aff]",
  B2: "border-[#007aff] text-[#007aff]",
  C1: "border-[#ff9f0a] text-[#ff9f0a]",
  C2: "border-[#ff453a] text-[#ff453a]",
};

type StoryWithLang = Story & { lang?: string };

function StoryCard({ story, onRead }: { story: StoryWithLang; onRead: (s: StoryWithLang) => void }) {
  const isCompleted = story.completed;

  return (
    <div className={`workbench-card-hover p-5 cursor-pointer ${isCompleted ? "border-[#30d158]/30" : ""}`} onClick={() => onRead(story)}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{story.flag}</span>
          <span className="text-xs font-medium text-muted">{story.language}</span>
        </div>
        <div className="flex items-center gap-2">
          {isCompleted && <Check size={14} style={{color: "#30d158"}} />}
          <span className={`text-xs font-bold px-2 py-0.5 rounded border ${LEVEL_COLORS[story.level] ?? LEVEL_COLORS.A1}`}>
            {story.level}
          </span>
        </div>
      </div>

      <h3 className="font-bold text-base mb-2 leading-snug">{story.title}</h3>
      <p className="text-sm text-muted leading-relaxed line-clamp-2 mb-4">{story.excerpt}</p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-muted">
          <span className="flex items-center gap-1">
            <Clock size={11} /> {story.readTime} min
          </span>
          <span className="flex items-center gap-1">
            <BookOpen size={11} /> {story.wordsCount} words
          </span>
        </div>
        <span className="text-xs px-2 py-1 rounded border border-white/10 bg-[#252121] text-muted">
          {story.genre}
        </span>
      </div>
    </div>
  );
}

function StoryReader({ story, onClose, onComplete }: { story: StoryWithLang; onClose: () => void; onComplete: (id: string) => void }) {
  const [finished, setFinished] = useState(story.completed);
  const [saving, setSaving] = useState(false);

  async function handleFinish() {
    setSaving(true);
    try {
      await api.completeStory(story.id);
      setFinished(true);
      onComplete(story.id);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#201d1d] font-mono">
      <div className="max-w-2xl mx-auto px-6 py-8">
        <button onClick={onClose} className="flex items-center gap-2 text-muted hover:text-white transition-colors text-sm mb-8">
          <ArrowLeft size={16} /> Back to Stories
        </button>

        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">{story.flag}</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded border ${LEVEL_COLORS[story.level] ?? LEVEL_COLORS.A1}`}>
              {story.level}
            </span>
            <span className="text-xs text-muted">{story.genre}</span>
          </div>
          <h1 className="text-3xl font-bold mb-2">{story.title}</h1>
          <div className="flex items-center gap-4 text-sm text-muted">
            <span className="flex items-center gap-1.5">
              <Clock size={14} /> {story.readTime} min read
            </span>
            <span className="flex items-center gap-1.5">
              <BookOpen size={14} /> {story.wordsCount} words
            </span>
          </div>
        </div>

        <div className="border border-white/10 rounded p-8 mb-8 bg-[#252121] leading-8 text-base">
          {story.content.split("\n\n").map((para, i) => (
            <p key={i} className={`${i > 0 ? "mt-4" : ""} ${para.startsWith("—") ? "italic" : ""}`} style={para.startsWith("—") ? {color: "#5ac8fa"} : undefined}>
              {para}
            </p>
          ))}
        </div>

        {!finished ? (
          <button onClick={handleFinish} disabled={saving} className="btn-workbench-primary w-full flex items-center justify-center gap-2 disabled:opacity-70">
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />} Mark as Read
          </button>
        ) : (
          <div className="border rounded p-6 text-center bg-[#252121]" style={{borderColor: "#30d158", background: "rgba(48,209,88,0.1)"}}>
            <div className="text-4xl mb-3">🎉</div>
            <div className="font-bold text-lg mb-1" style={{color: "#30d158"}}>Story Complete!</div>
            <p className="text-sm text-muted">
              Great job reading in {story.language}. Keep it up!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function StoriesPage() {
  const [stories, setStories] = useState<StoryWithLang[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeStory, setActiveStory] = useState<StoryWithLang | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.me(), api.stories()])
      .then(([nextProfile, nextStories]) => {
        setProfile(nextProfile);
        setStories(nextStories as StoryWithLang[]);
        setFilter(nextProfile.currentLanguage || "all");
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load stories"))
      .finally(() => setLoading(false));
  }, []);

  const languageOptions = useMemo(() => {
    const map = new Map<string, string>();
    stories.forEach((story) => {
      const code = story.lang ?? story.language;
      map.set(code, story.language);
    });
    if (profile?.currentLanguage) {
      const current = profile.currentLanguage;
      const currentName = stories.find((s) => s.lang === current)?.language ?? current.toUpperCase();
      if (!map.has(current)) map.set(current, currentName);
    }
    return Array.from(map.entries());
  }, [stories, profile]);

  const filtered = useMemo(() => {
    if (filter === "all") return stories;
    return stories.filter((s) => (s.lang ?? s.language) === filter);
  }, [stories, filter]);

  async function handleGenerate() {
    const languageCode = filter === "all" ? (profile?.currentLanguage ?? undefined) : filter;
    setGenerating(true);
    setGenerateError(null);
    try {
      const created = await api.generateStory({ languageCode });
      const nextStories = [created as StoryWithLang, ...stories];
      setStories(nextStories);
      const nextFilter = (created as StoryWithLang).lang ?? languageCode ?? filter;
      if (nextFilter && nextFilter !== "all") setFilter(nextFilter);
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "Failed to generate story");
    } finally {
      setGenerating(false);
    }
  }

  function handleComplete(storyId: string) {
    setStories((prev) => prev.map((story) => story.id === storyId ? { ...story, completed: true } : story));
    setActiveStory((prev) => prev && prev.id === storyId ? { ...prev, completed: true } : prev);
  }

  if (activeStory) {
    return (
      <AppShell>
        <StoryReader story={activeStory} onClose={() => setActiveStory(null)} onComplete={handleComplete} />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="min-h-screen bg-[#201d1d] text-[#fdfcfc] font-mono px-6 py-8 max-w-4xl mx-auto">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold mb-1">Stories</h1>
            <p className="text-muted text-sm">Read graded stories in your target language. Build vocabulary naturally.</p>
          </div>
          <button onClick={handleGenerate} disabled={loading || generating} className="border border-white/15 bg-[#252121] hover:bg-[#302c2c] disabled:opacity-60 rounded px-4 py-2.5 text-sm inline-flex items-center gap-2 transition-colors">
            {generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {generating ? "Generating..." : "Generate story"}
          </button>
        </div>

        {error ? (
          <div className="border border-red-500/30 rounded p-4 mb-6 bg-[#252121] text-sm text-red-300">
            Failed to load stories: {error}
          </div>
        ) : null}

        {generateError ? (
          <div className="border border-[#ff9f0a]/30 rounded p-4 mb-6 bg-[#252121] text-sm text-[#ff9f0a]">
            Could not generate a story. {generateError}
          </div>
        ) : null}

        <div className="flex items-center gap-2 mb-6 flex-wrap">
          <button
            onClick={() => setFilter("all")}
            className={`text-sm px-4 py-2 rounded border transition-all ${filter === "all" ? "border-[#007aff] bg-[#007aff]/15 text-[#007aff]" : "border-white/10 bg-[#252121] text-muted hover:border-white/20"}`}
          >
            All Languages
          </button>
          {languageOptions.map(([code, label]) => (
            <button
              key={code}
              onClick={() => setFilter(code)}
              className={`text-sm px-4 py-2 rounded border transition-all ${filter === code ? "border-[#007aff] bg-[#007aff]/15 text-[#007aff]" : "border-white/10 bg-[#252121] text-muted hover:border-white/20"}`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="border border-white/10 rounded p-4 mb-6 flex flex-wrap gap-3 bg-[#252121]">
          <span className="text-xs text-muted font-medium">Levels:</span>
          {Object.entries(LEVEL_COLORS).map(([level, cls]) => (
            <span key={level} className={`text-xs font-bold px-2 py-0.5 rounded border ${cls}`}>
              {level}
            </span>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-16 text-muted">Loading stories...</div>
        ) : filtered.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-5">
            {filtered.map((story) => (
              <StoryCard key={story.id} story={story} onRead={setActiveStory} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-muted border border-white/10 rounded bg-[#252121]">
            <div className="text-4xl mb-4">📚</div>
            <p className="mb-2">No stories available for this language yet.</p>
            <p className="text-sm">Use <span className="text-white">Generate story</span> to create one for your active language.</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
