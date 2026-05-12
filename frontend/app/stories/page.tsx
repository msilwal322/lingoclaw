"use client";

import { useState } from "react";
import { ArrowLeft, Clock, BookOpen, Check } from "lucide-react";
import AppShell from "@/components/AppShell";
import { STORIES, type Story } from "@/lib/mock-data";
import { completeStory, getProfile } from "@/lib/storage";

const LEVEL_COLORS: Record<string, string> = {
  A1: "text-green-400 bg-green-400/10 border-green-400/20",
  A2: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",
  B1: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  B2: "text-purple-400 bg-purple-400/10 border-purple-400/20",
  C1: "text-orange-400 bg-orange-400/10 border-orange-400/20",
  C2: "text-red-400 bg-red-400/10 border-red-400/20",
};

function StoryCard({ story, onRead }: { story: Story; onRead: (s: Story) => void }) {
  const profile = getProfile();
  const isCompleted = profile.completedStories.includes(story.id);

  return (
    <div className={`glass-card-hover p-5 cursor-pointer ${isCompleted ? "border-green-500/15" : ""}`} onClick={() => onRead(story)}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{story.flag}</span>
          <span className="text-xs font-medium text-muted">{story.language}</span>
        </div>
        <div className="flex items-center gap-2">
          {isCompleted && <Check size={14} className="text-green-400" />}
          <span className={`text-xs font-bold px-2 py-0.5 rounded border ${LEVEL_COLORS[story.level]}`}>
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
        <span className="text-xs px-2 py-1 rounded-lg bg-white/5 border border-white/8 text-slate-400">
          {story.genre}
        </span>
      </div>
    </div>
  );
}

function StoryReader({ story, onClose }: { story: Story; onClose: () => void }) {
  const [finished, setFinished] = useState(false);

  function handleFinish() {
    completeStory(story.id);
    setFinished(true);
  }

  return (
    <div className="min-h-screen" style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(34,211,238,0.08) 0%, transparent 40%), #08080f" }}>
      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Back */}
        <button onClick={onClose} className="flex items-center gap-2 text-muted hover:text-white transition-colors text-sm mb-8">
          <ArrowLeft size={16} /> Back to Stories
        </button>

        {/* Meta */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">{story.flag}</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded border ${LEVEL_COLORS[story.level]}`}>
              {story.level}
            </span>
            <span className="text-xs text-muted">{story.genre}</span>
          </div>
          <h1 className="text-3xl font-black mb-2">{story.title}</h1>
          <div className="flex items-center gap-4 text-sm text-muted">
            <span className="flex items-center gap-1.5">
              <Clock size={14} /> {story.readTime} min read
            </span>
            <span className="flex items-center gap-1.5">
              <BookOpen size={14} /> {story.wordsCount} words
            </span>
          </div>
        </div>

        {/* Content */}
        <div
          className="glass-card p-8 mb-8 text-slate-200 leading-8 text-base"
          style={{ borderColor: "rgba(34,211,238,0.1)" }}
        >
          {story.content.split("\n\n").map((para, i) => (
            <p key={i} className={`${i > 0 ? "mt-4" : ""} ${para.startsWith("—") ? "italic text-cyan-200" : ""}`}>
              {para}
            </p>
          ))}
        </div>

        {!finished ? (
          <button onClick={handleFinish} className="btn-primary w-full flex items-center justify-center gap-2">
            <Check size={18} /> Mark as Read · Earn XP
          </button>
        ) : (
          <div className="glass-card p-6 text-center" style={{ borderColor: "rgba(16,185,129,0.3)", background: "rgba(16,185,129,0.05)" }}>
            <div className="text-4xl mb-3">🎉</div>
            <div className="font-bold text-green-400 text-lg mb-1">Story Complete!</div>
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
  const [activeStory, setActiveStory] = useState<Story | null>(null);
  const [filter, setFilter] = useState<string>("all");

  if (activeStory) {
    return (
      <AppShell>
        <StoryReader story={activeStory} onClose={() => setActiveStory(null)} />
      </AppShell>
    );
  }

  const languages = Array.from(new Set(STORIES.map((s) => s.language)));
  const filtered = filter === "all" ? STORIES : STORIES.filter((s) => s.language === filter);

  return (
    <AppShell>
      <div className="px-6 py-8 max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-black mb-1">Stories</h1>
          <p className="text-muted text-sm">Read graded stories in your target language. Build vocabulary naturally.</p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          <button
            onClick={() => setFilter("all")}
            className={`text-sm px-4 py-2 rounded-xl border transition-all ${filter === "all" ? "border-purple-500 bg-purple-500/15 text-purple-300" : "border-white/10 bg-white/5 text-muted hover:border-white/20"}`}
          >
            All Languages
          </button>
          {languages.map((lang) => (
            <button
              key={lang}
              onClick={() => setFilter(lang)}
              className={`text-sm px-4 py-2 rounded-xl border transition-all ${filter === lang ? "border-purple-500 bg-purple-500/15 text-purple-300" : "border-white/10 bg-white/5 text-muted hover:border-white/20"}`}
            >
              {lang}
            </button>
          ))}
        </div>

        {/* Level guide */}
        <div className="glass-card p-4 mb-6 flex flex-wrap gap-3">
          <span className="text-xs text-muted font-medium">Levels:</span>
          {Object.entries(LEVEL_COLORS).map(([level, cls]) => (
            <span key={level} className={`text-xs font-bold px-2 py-0.5 rounded border ${cls}`}>
              {level}
            </span>
          ))}
        </div>

        {/* Grid */}
        <div className="grid md:grid-cols-2 gap-5">
          {filtered.map((story) => (
            <StoryCard key={story.id} story={story} onRead={setActiveStory} />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16 text-muted">
            <div className="text-4xl mb-4">📚</div>
            <p>No stories available for this filter yet.</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
