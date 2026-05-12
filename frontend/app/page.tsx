"use client";

import Link from "next/link";
import { ArrowRight, Zap, BookOpen, MessageCircle, Trophy, Star, Check } from "lucide-react";
import { LANGUAGES } from "@/lib/mock-data";
import { isOnboarded } from "@/lib/storage";
import { useEffect, useState } from "react";

const FEATURES = [
  {
    icon: <Zap size={24} className="text-purple-400" />,
    title: "AI-Powered Learning",
    desc: "Adaptive lessons that evolve with your progress. No two learners follow the same path.",
  },
  {
    icon: <MessageCircle size={24} className="text-cyan-400" />,
    title: "Real Conversation Practice",
    desc: "Chat with Claw, your AI tutor, in the language you're learning. Anytime, anywhere.",
  },
  {
    icon: <BookOpen size={24} className="text-amber-400" />,
    title: "Immersive Stories",
    desc: "Read graded stories crafted for your level — build vocabulary and intuition together.",
  },
  {
    icon: <Trophy size={24} className="text-green-400" />,
    title: "Compete & Achieve",
    desc: "Climb the global leaderboard. Earn badges. Keep your streak alive.",
  },
];

const STATS = [
  { value: "2M+", label: "Active Learners" },
  { value: "50+", label: "Languages" },
  { value: "10M+", label: "Lessons Completed" },
  { value: "98%", label: "Learner Satisfaction" },
];

const SHOWCASED_LANGS = LANGUAGES.slice(0, 8);

export default function LandingPage() {
  const [onboarded, setOnboarded] = useState(false);

  useEffect(() => {
    setOnboarded(isOnboarded());
  }, []);

  return (
    <div className="min-h-screen" style={{ background: "radial-gradient(ellipse at 20% 50%, rgba(124,58,237,0.12) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(34,211,238,0.08) 0%, transparent 50%), #08080f" }}>
      {/* Header */}
      <header className="flex items-center justify-between px-6 md:px-12 py-5 border-b border-white/5">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="text-2xl">🐾</span>
          <span className="text-xl font-black gradient-text">LingoClaw</span>
        </Link>
        <div className="flex items-center gap-3">
          {onboarded ? (
            <Link href="/dashboard" className="btn-primary text-sm py-2 px-5">
              Go to Dashboard
            </Link>
          ) : (
            <>
              <Link href="/onboarding" className="btn-secondary text-sm py-2 px-5">
                Log In
              </Link>
              <Link href="/onboarding" className="btn-primary text-sm py-2 px-5">
                Start for Free
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Hero */}
      <section className="relative px-6 md:px-12 pt-20 pb-16 text-center max-w-5xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold mb-8 border border-purple-500/30 bg-purple-500/10 text-purple-300 animate-fade-in">
          <Star size={12} className="text-amber-400" />
          Powered by AI · 50+ Languages · Free to Start
        </div>

        <h1 className="text-5xl md:text-7xl font-black leading-tight tracking-tight mb-6 animate-slide-up">
          <span className="gradient-text">Tear Through</span>
          <br />
          Language Barriers
        </h1>

        <p className="text-lg md:text-xl text-muted max-w-2xl mx-auto mb-10 leading-relaxed animate-slide-up">
          LingoClaw uses AI to create a learning experience that adapts to you —
          personalized lessons, real conversation practice, and immersive stories.
          Start speaking confidently in weeks, not years.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <Link href="/onboarding" className="btn-primary flex items-center gap-2 text-base px-8 py-4">
            Start Learning Free
            <ArrowRight size={18} />
          </Link>
          <Link href="/dashboard" className="btn-secondary flex items-center gap-2 text-base px-8 py-4">
            See Demo
          </Link>
        </div>

        {/* Floating stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
          {STATS.map((s) => (
            <div key={s.label} className="glass-card p-4 text-center">
              <div className="text-2xl font-black gradient-text">{s.value}</div>
              <div className="text-xs text-muted mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Language grid */}
      <section className="px-6 md:px-12 py-16 max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-black mb-3">
            50+ Languages, One App
          </h2>
          <p className="text-muted">From Spanish to Swahili — your language is here.</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {SHOWCASED_LANGS.map((lang) => (
            <Link
              key={lang.code}
              href="/onboarding"
              className="glass-card-hover p-4 flex items-center gap-3 group"
            >
              <span className="text-2xl">{lang.flag}</span>
              <span className="font-semibold text-sm group-hover:text-purple-300 transition-colors">
                {lang.name}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="px-6 md:px-12 py-16 max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-black mb-3">
            Everything You Need to <span className="gradient-text">Fluency</span>
          </h2>
          <p className="text-muted">A complete learning system, not just flashcards.</p>
        </div>
        <div className="grid md:grid-cols-2 gap-5">
          {FEATURES.map((f) => (
            <div key={f.title} className="glass-card p-6 flex gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,255,255,0.05)" }}>
                {f.icon}
              </div>
              <div>
                <h3 className="font-bold text-lg mb-2">{f.title}</h3>
                <p className="text-muted text-sm leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 md:px-12 py-16 max-w-4xl mx-auto text-center">
        <h2 className="text-3xl font-black mb-10">
          Up and Running in <span className="gradient-text">3 Minutes</span>
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { step: "01", title: "Pick Your Language", desc: "Choose from 50+ languages and set your daily learning goal." },
            { step: "02", title: "Follow the Path", desc: "Structured lessons, games, and stories build skills progressively." },
            { step: "03", title: "Talk to Claw", desc: "Practice real conversations with your AI tutor between lessons." },
          ].map((item) => (
            <div key={item.step} className="flex flex-col items-center">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black mb-4 gradient-text" style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)" }}>
                {item.step}
              </div>
              <h3 className="font-bold text-lg mb-2">{item.title}</h3>
              <p className="text-muted text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Social proof */}
      <section className="px-6 md:px-12 py-16 max-w-5xl mx-auto">
        <div className="grid md:grid-cols-3 gap-5">
          {[
            { quote: "I've tried Duolingo, Babbel, Rosetta Stone — LingoClaw is the only one that actually got me speaking.", name: "Sofia K.", lang: "Spanish learner", flag: "🇪🇸" },
            { quote: "The AI tutor is scary good. It corrects my grammar without making me feel dumb, and keeps conversations going naturally.", name: "Marcus T.", lang: "Japanese learner", flag: "🇯🇵" },
            { quote: "The stories feature is genius. Reading about topics I love in French made vocabulary stick in a way drills never did.", name: "Priya M.", lang: "French learner", flag: "🇫🇷" },
          ].map((r) => (
            <div key={r.name} className="glass-card p-6">
              <div className="flex gap-1 mb-3">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={14} className="text-amber-400 fill-amber-400" />
                ))}
              </div>
              <p className="text-sm leading-relaxed text-slate-300 mb-4">&ldquo;{r.quote}&rdquo;</p>
              <div className="flex items-center gap-2">
                <span className="text-lg">{r.flag}</span>
                <div>
                  <div className="text-sm font-semibold">{r.name}</div>
                  <div className="text-xs text-muted">{r.lang}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 md:px-12 py-20 text-center">
        <div className="max-w-2xl mx-auto glass-card p-12" style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.15), rgba(34,211,238,0.08))", borderColor: "rgba(124,58,237,0.3)" }}>
          <div className="text-5xl mb-6 animate-float">🐾</div>
          <h2 className="text-4xl font-black mb-4">
            Ready to Sink Your Claws In?
          </h2>
          <p className="text-muted mb-8">
            Join 2 million learners. No credit card. No ads. No fluff.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/onboarding" className="btn-primary flex items-center gap-2 text-base px-8 py-4">
              Start for Free
              <ArrowRight size={18} />
            </Link>
          </div>
          <div className="flex items-center justify-center gap-6 mt-8 text-xs text-muted">
            {["Free forever plan", "No credit card needed", "Cancel anytime"].map((t) => (
              <span key={t} className="flex items-center gap-1.5">
                <Check size={12} className="text-green-400" />
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 px-6 md:px-12 py-8">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🐾</span>
            <span className="font-black gradient-text">LingoClaw</span>
          </div>
          <p className="text-xs text-muted">© 2025 LingoClaw. Made with ❤️ for language learners.</p>
        </div>
      </footer>
    </div>
  );
}
