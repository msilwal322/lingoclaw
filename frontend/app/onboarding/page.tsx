"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowLeft, Check } from "lucide-react";
import { LANGUAGES, DAILY_GOALS } from "@/lib/mock-data";
import { saveProfile, setOnboarded } from "@/lib/storage";

type Step = "language" | "goal" | "name" | "done";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("language");
  const [selected, setSelected] = useState({
    language: "",
    goalXp: 20,
    name: "",
    reason: "",
  });

  const STEPS: Step[] = ["language", "goal", "name", "done"];
  const stepIdx = STEPS.indexOf(step);

  const REASONS = [
    { emoji: "✈️", label: "Travel" },
    { emoji: "💼", label: "Career" },
    { emoji: "❤️", label: "Family" },
    { emoji: "📚", label: "Education" },
    { emoji: "🎮", label: "Fun / Hobby" },
    { emoji: "🌍", label: "Culture" },
  ];

  function finish() {
    const lang = LANGUAGES.find((l) => l.code === selected.language);
    saveProfile({
      name: selected.name || "LingoClaw Learner",
      currentLanguage: selected.language || "es",
      dailyGoalXp: selected.goalXp,
    });
    setOnboarded();
    router.push("/dashboard");
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 py-12"
      style={{ background: "radial-gradient(ellipse at 30% 40%, rgba(124,58,237,0.15) 0%, transparent 50%), #08080f" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 mb-10">
        <span className="text-3xl">🐾</span>
        <span className="text-2xl font-black gradient-text">LingoClaw</span>
      </div>

      {/* Progress dots */}
      <div className="flex items-center gap-2 mb-10">
        {STEPS.slice(0, 3).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                i < stepIdx
                  ? "bg-purple-600 text-white"
                  : i === stepIdx
                  ? "bg-purple-600 text-white ring-2 ring-purple-400 ring-offset-2 ring-offset-void"
                  : "bg-white/10 text-muted"
              }`}
            >
              {i < stepIdx ? <Check size={14} /> : i + 1}
            </div>
            {i < 2 && <div className={`w-12 h-0.5 ${i < stepIdx ? "bg-purple-600" : "bg-white/10"}`} />}
          </div>
        ))}
      </div>

      <div className="w-full max-w-lg animate-slide-up">

        {/* Step: Choose language */}
        {step === "language" && (
          <div className="glass-card p-8">
            <h1 className="text-2xl font-black mb-2">What do you want to learn?</h1>
            <p className="text-muted text-sm mb-6">Choose your target language to get started.</p>
            <div className="grid grid-cols-2 gap-3 mb-8 max-h-80 overflow-y-auto pr-1">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => setSelected((s) => ({ ...s, language: lang.code }))}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                    selected.language === lang.code
                      ? "border-purple-500 bg-purple-500/15 text-white"
                      : "border-white/8 bg-white/4 text-slate-300 hover:border-purple-500/40 hover:bg-purple-500/8"
                  }`}
                >
                  <span className="text-2xl">{lang.flag}</span>
                  <span className="font-medium text-sm">{lang.name}</span>
                  {selected.language === lang.code && (
                    <Check size={14} className="ml-auto text-purple-400" />
                  )}
                </button>
              ))}
            </div>
            <button
              onClick={() => setStep("goal")}
              disabled={!selected.language}
              className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Continue <ArrowRight size={18} />
            </button>
          </div>
        )}

        {/* Step: Set goal */}
        {step === "goal" && (
          <div className="glass-card p-8">
            <h1 className="text-2xl font-black mb-2">Set your daily goal</h1>
            <p className="text-muted text-sm mb-6">How much time do you want to spend learning each day?</p>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {DAILY_GOALS.map((g) => (
                <button
                  key={g.xp}
                  onClick={() => setSelected((s) => ({ ...s, goalXp: g.xp }))}
                  className={`flex flex-col items-center gap-2 p-5 rounded-xl border transition-all ${
                    selected.goalXp === g.xp
                      ? "border-purple-500 bg-purple-500/15"
                      : "border-white/8 bg-white/4 hover:border-purple-500/40"
                  }`}
                >
                  <span className="text-3xl">{g.icon}</span>
                  <span className="font-bold">{g.label}</span>
                  <span className="text-xs text-muted">
                    {g.xp <= 10 ? "~5 min/day" : g.xp <= 20 ? "~10 min/day" : g.xp <= 50 ? "~20 min/day" : "~30 min/day"}
                  </span>
                </button>
              ))}
            </div>
            <p className="text-xs text-muted text-center mb-6">You can always change this later in your profile.</p>
            <div className="flex gap-3">
              <button onClick={() => setStep("language")} className="btn-secondary flex items-center gap-2">
                <ArrowLeft size={16} /> Back
              </button>
              <button onClick={() => setStep("name")} className="btn-primary flex-1 flex items-center justify-center gap-2">
                Continue <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Step: Name + reason */}
        {step === "name" && (
          <div className="glass-card p-8">
            <h1 className="text-2xl font-black mb-2">Almost there!</h1>
            <p className="text-muted text-sm mb-6">Tell us a bit about yourself.</p>
            <div className="mb-5">
              <label className="block text-sm font-medium mb-2">Your name</label>
              <input
                type="text"
                value={selected.name}
                onChange={(e) => setSelected((s) => ({ ...s, name: e.target.value }))}
                placeholder="e.g. Alex"
                className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>
            <div className="mb-8">
              <label className="block text-sm font-medium mb-3">Why are you learning?</label>
              <div className="grid grid-cols-3 gap-2">
                {REASONS.map((r) => (
                  <button
                    key={r.label}
                    onClick={() => setSelected((s) => ({ ...s, reason: r.label }))}
                    className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border text-xs font-medium transition-all ${
                      selected.reason === r.label
                        ? "border-purple-500 bg-purple-500/15 text-white"
                        : "border-white/8 bg-white/4 text-muted hover:border-purple-500/30"
                    }`}
                  >
                    <span className="text-xl">{r.emoji}</span>
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep("goal")} className="btn-secondary flex items-center gap-2">
                <ArrowLeft size={16} /> Back
              </button>
              <button onClick={finish} className="btn-primary flex-1 flex items-center justify-center gap-2">
                Start Learning 🐾
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
