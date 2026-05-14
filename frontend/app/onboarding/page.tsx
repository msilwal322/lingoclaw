"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowLeft, Check } from "lucide-react";
import { DAILY_GOALS } from "@/lib/mock-data";
import type { Language } from "@/lib/mock-data";
import { api } from "@/lib/api";

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

  const [languages, setLanguages] = useState<Language[]>([]);

  useEffect(() => {
    api.languages()
      .then((data) => { if (data?.length) setLanguages(data); })
      .catch(() => {});
  }, []);

  const STEPS: Step[] = ["language", "goal", "name", "done"];
  const stepIdx = STEPS.indexOf(step);

  function finish() {
    const profile = {
      name: selected.name || "Learner",
      currentLanguage: selected.language || "es",
      dailyGoalXp: selected.goalXp,
    };
    api.updateMe(profile).catch(() => {});
    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-[#201d1d] font-mono">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-10">
        <span className="text-3xl">🐾</span>
        <span className="text-2xl font-bold">LingoClaw</span>
      </div>

      {/* Progress dots */}
      <div className="flex items-center gap-2 mb-10">
        {STEPS.slice(0, 3).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold transition-all duration-300 border ${
                i < stepIdx
                  ? "bg-[#007aff] text-white border-[#007aff]"
                  : i === stepIdx
                  ? "bg-[#007aff] text-white border-[#007aff]"
                  : "bg-[#302c2c] text-muted border-white/10"
              }`}
            >
              {i < stepIdx ? <Check size={14} /> : i + 1}
            </div>
            {i < 2 && <div className={`w-12 h-0.5 ${i < stepIdx ? "bg-[#007aff]" : "bg-white/10"}`} />}
          </div>
        ))}
      </div>

      <div className="w-full max-w-lg">

        {/* Step: Choose language */}
        {step === "language" && (
          <div className="border border-white/10 rounded p-8 bg-[#252121]">
            <h1 className="text-2xl font-bold mb-2">Setup workspace</h1>
            <p className="text-muted text-sm mb-6">Choose your target language to get started.</p>
            <div className="grid grid-cols-2 gap-3 mb-8 max-h-80 overflow-y-auto pr-1">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => setSelected((s) => ({ ...s, language: lang.code }))}
                  className={`flex items-center gap-3 p-3 rounded border transition-all ${
                    selected.language === lang.code
                      ? "border-[#007aff] bg-[#007aff]/15 text-white"
                      : "border-white/10 bg-[#302c2c] hover:border-white/20 hover:bg-[#3a3535]"
                  }`}
                >
                  <span className="text-2xl">{lang.flag}</span>
                  <span className="font-medium text-sm">{lang.name}</span>
                  {selected.language === lang.code && (
                    <Check size={14} className="ml-auto" style={{color: "#007aff"}} />
                  )}
                </button>
              ))}
            </div>
            <button
              onClick={() => setStep("goal")}
              disabled={!selected.language}
              className="btn-workbench-primary w-full flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Continue <ArrowRight size={18} />
            </button>
          </div>
        )}

        {/* Step: Set goal */}
        {step === "goal" && (
          <div className="border border-white/10 rounded p-8 bg-[#252121]">
            <h1 className="text-2xl font-bold mb-2">Set your practice goal</h1>
            <p className="text-muted text-sm mb-6">How much time do you want to spend practicing each day?</p>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {DAILY_GOALS.map((g) => (
                <button
                  key={g.xp}
                  onClick={() => setSelected((s) => ({ ...s, goalXp: g.xp }))}
                  className={`flex flex-col items-center gap-2 p-5 rounded border transition-all ${
                    selected.goalXp === g.xp
                      ? "border-[#007aff] bg-[#007aff]/15"
                      : "border-white/10 bg-[#302c2c] hover:border-white/20"
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
            <p className="text-xs text-muted text-center mb-6">You can change this later in settings.</p>
            <div className="flex gap-3">
              <button onClick={() => setStep("language")} className="btn-workbench-secondary flex items-center gap-2">
                <ArrowLeft size={16} /> Back
              </button>
              <button onClick={() => setStep("name")} className="btn-workbench-primary flex-1 flex items-center justify-center gap-2">
                Continue <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Step: Name */}
        {step === "name" && (
          <div className="border border-white/10 rounded p-8 bg-[#252121]">
            <h1 className="text-2xl font-bold mb-2">Almost there!</h1>
            <p className="text-muted text-sm mb-6">What should we call you?</p>
            <div className="mb-8">
              <label className="block text-sm font-medium mb-2">Your name</label>
              <input
                type="text"
                value={selected.name}
                onChange={(e) => setSelected((s) => ({ ...s, name: e.target.value }))}
                placeholder="e.g. Alex"
                className="workbench-input w-full"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep("goal")} className="btn-workbench-secondary flex items-center gap-2">
                <ArrowLeft size={16} /> Back
              </button>
              <button onClick={finish} className="btn-workbench-primary flex-1 flex items-center justify-center gap-2">
                Start Learning 🐾
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Backend-backed notice */}
      <div className="border border-white/10 rounded p-4 mt-8 text-xs text-muted bg-[#252121] leading-relaxed max-w-lg">
        <div style={{color: "#30d158"}} className="mb-1">● backend-backed workspace</div>
        Preferences and progress sync to the local backend. No external account or cloud service needed.
      </div>
    </div>
  );
}
