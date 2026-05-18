"use client";

import { useState, useEffect } from "react";
import { Check, X, ChevronLeft, ChevronRight, Zap } from "lucide-react";
import AppShell from "@/components/AppShell";
import Link from "next/link";
import { api } from "@/lib/api";

type Mode = "menu" | "flashcards" | "quiz";
type FlipState = "front" | "back";

type Flashcard = { front: string; back: string; example: string; phonetic: string };
type FillBlank = { sentence: string; translation: string; answer: string; hint: string };

export default function PracticePage() {
  const [mode, setMode] = useState<Mode>("menu");
  const [cardIdx, setCardIdx] = useState(0);
  const [flip, setFlip] = useState<FlipState>("front");
  const [known, setKnown] = useState<Set<number>>(new Set());
  const [unknown, setUnknown] = useState<Set<number>>(new Set());
  const [currentLanguage, setCurrentLanguage] = useState<string>("");
  const [currentLangCode, setCurrentLangCode] = useState<string>("");

  const [fillIdx, setFillIdx] = useState(0);
  const [fillInput, setFillInput] = useState("");
  const [fillState, setFillState] = useState<"idle" | "correct" | "wrong">("idle");
  const [fillScore, setFillScore] = useState(0);

  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [fillBlanks, setFillBlanks] = useState<FillBlank[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.me().then((profile) => {
      const langCode = profile.currentLanguage;
      setCurrentLangCode(langCode);
      api.languages().then((langs) => {
        const lang = langs.find((l) => l.code === langCode);
        if (lang) setCurrentLanguage(lang.name);
      }).catch(() => {});
      
      // Fetch practice content for the current language
      api.practice(langCode).then((content) => {
        setFlashcards(content.flashcards);
        setFillBlanks(content.fillBlanks);
        setLoading(false);
      }).catch(() => {
        setLoading(false);
      });
    }).catch(() => {
      setLoading(false);
    });
  }, []);

  const card = flashcards[cardIdx];
  const fillItem = fillBlanks[fillIdx];

  function nextCard(verdict: "known" | "unknown") {
    if (verdict === "known") setKnown((s) => new Set([...s, cardIdx]));
    else setUnknown((s) => new Set([...s, cardIdx]));
    setFlip("front");
    if (cardIdx + 1 >= flashcards.length) setMode("menu");
    else setCardIdx((i) => i + 1);
  }

  function checkFill() {
    const correct = fillInput.trim().toLowerCase() === fillItem.answer.toLowerCase();
    setFillState(correct ? "correct" : "wrong");
    if (correct) setFillScore((s) => s + 1);
  }

  function nextFill() {
    setFillInput("");
    setFillState("idle");
    if (fillIdx + 1 >= fillBlanks.length) setMode("menu");
    else setFillIdx((i) => i + 1);
  }

  if (mode === "menu") {
    return (
      <AppShell>
        <div className="min-h-screen bg-[#201d1d] text-[#fdfcfc] font-mono px-6 py-8 max-w-3xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold mb-1">Practice</h1>
            <p className="text-muted text-sm">Reinforce what you&apos;ve learned with different practice modes.</p>
            {currentLanguage && (
              <p className="text-xs text-[#6a6868] mt-2">
                Current language: {currentLanguage}
              </p>
            )}
          </div>

          {loading && (
            <div className="text-center py-8 text-muted">Loading practice content...</div>
          )}

          {!loading && (flashcards.length === 0 && fillBlanks.length === 0) && (
            <div className="border border-white/10 rounded p-5 mb-8 bg-[#252121]">
              <p className="text-sm text-muted">No practice content available{currentLanguage ? ` for ${currentLanguage}` : ""} yet.</p>
            </div>
          )}

          {/* Score from last round */}
          {(known.size + unknown.size > 0) && (
            <div className="border border-white/10 rounded p-5 mb-8 flex items-center gap-4 bg-[#252121]">
              <div className="text-4xl">📊</div>
              <div>
                <div className="font-bold">Last Flashcard Session</div>
                <div className="text-sm text-muted mt-1">
                  <span style={{color: "#30d158"}} className="font-semibold">{known.size} known</span> ·{" "}
                  <span style={{color: "#ff453a"}} className="font-semibold">{unknown.size} still learning</span>
                </div>
              </div>
            </div>
          )}

          {!loading && (
          <div className="grid md:grid-cols-2 gap-5">
            {flashcards.length > 0 && (
            <button
              onClick={() => {
                setCardIdx(0);
                setFlip("front");
                setKnown(new Set());
                setUnknown(new Set());
                setMode("flashcards");
              }}
              className="workbench-card-hover p-6 text-left"
            >
              <div className="text-4xl mb-4">🃏</div>
              <h2 className="text-lg font-bold mb-2">Flashcards</h2>
              <p className="text-sm text-muted leading-relaxed">
                Review vocabulary cards. Flip to reveal translations and mark what you know.
              </p>
              <div className="flex items-center gap-2 mt-4">
                <span className="text-xs font-medium" style={{color: "#007aff"}}>{flashcards.length} cards</span>
                {currentLanguage && <span className="text-xs text-muted">• {currentLanguage}</span>}
              </div>
            </button>
            )}

            {fillBlanks.length > 0 && (
            <button
              onClick={() => {
                setFillIdx(0);
                setFillInput("");
                setFillState("idle");
                setFillScore(0);
                setMode("quiz");
              }}
              className="workbench-card-hover p-6 text-left"
            >
              <div className="text-4xl mb-4">✍️</div>
              <h2 className="text-lg font-bold mb-2">Fill in the Blank</h2>
              <p className="text-sm text-muted leading-relaxed">
                Complete sentences by typing the missing word. Tests recall over recognition.
              </p>
              <div className="flex items-center gap-2 mt-4">
                <span className="text-xs font-medium" style={{color: "#5ac8fa"}}>{fillBlanks.length} questions</span>
                {currentLanguage && <span className="text-xs text-muted">• {currentLanguage}</span>}
              </div>
            </button>
            )}

            <Link href="/lesson/l3" className="workbench-card-hover p-6 block">
              <div className="text-4xl mb-4">🎮</div>
              <h2 className="text-lg font-bold mb-2">Mini Lessons</h2>
              <p className="text-sm text-muted leading-relaxed">
                Short, focused lessons covering grammar and vocabulary with instant feedback.
              </p>
              <div className="flex items-center gap-2 mt-4">
                <span className="text-xs font-medium" style={{color: "#ff9f0a"}}>7 questions</span>
              </div>
            </Link>

            <Link href="/chat" className="workbench-card-hover p-6 block">
              <div className="text-4xl mb-4">🗣️</div>
              <h2 className="text-lg font-bold mb-2">Conversation Practice</h2>
              <p className="text-sm text-muted leading-relaxed">
                Chat with Claw, your AI tutor. Practice real-world conversation scenarios.
              </p>
              <div className="flex items-center gap-2 mt-4">
                <span className="text-xs font-medium" style={{color: "#30d158"}}>AI-powered</span>
                <span className="text-xs text-muted">• Open-ended</span>
              </div>
            </Link>
          </div>
          )}
        </div>
      </AppShell>
    );
  }

  if (mode === "flashcards") {
    const progressPct = Math.round((cardIdx / flashcards.length) * 100);
    return (
      <AppShell>
        <div className="min-h-screen bg-[#201d1d] text-[#fdfcfc] font-mono px-6 py-8 max-w-xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => setMode("menu")} className="btn-workbench-secondary flex items-center gap-2 text-sm py-2 px-4">
              <ChevronLeft size={16} /> Back
            </button>
            <div className="text-sm text-muted">
              {cardIdx + 1} / {flashcards.length}
            </div>
          </div>

          <div className="progress-track mb-8">
            <div className="progress-fill" style={{ width: `${progressPct}%` }} />
          </div>

          {/* Flashcard */}
          <div
            className="border border-white/10 rounded p-0 mb-8 cursor-pointer select-none overflow-hidden bg-[#252121]"
            style={{ minHeight: 260 }}
            onClick={() => setFlip((f) => (f === "front" ? "back" : "front"))}
          >
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <span className="text-xs text-muted uppercase tracking-wider">
                {flip === "front" ? (currentLanguage || "Target") : "English"}
              </span>
              <span className="text-xs" style={{color: "#007aff"}}>Tap to flip</span>
            </div>

            <div className="p-8 flex flex-col items-center justify-center text-center" style={{ minHeight: 180 }}>
              {flip === "front" ? (
                <>
                  <div className="text-4xl font-bold mb-3">{card.front}</div>
                  <div className="text-sm text-muted">{card.phonetic}</div>
                </>
              ) : (
                <>
                  <div className="text-4xl font-bold mb-3" style={{color: "#007aff"}}>{card.back}</div>
                  <div className="text-sm text-muted italic mt-2">&ldquo;{card.example}&rdquo;</div>
                </>
              )}
            </div>
          </div>

          {/* Verdict buttons */}
          {flip === "back" && (
            <div className="flex gap-4">
              <button
                onClick={() => nextCard("unknown")}
                className="flex-1 py-4 rounded border font-semibold flex items-center justify-center gap-2 hover:bg-[#302c2c] transition-colors"
                style={{borderColor: "#ff453a", color: "#ff453a", background: "rgba(255,69,58,0.1)"}}
              >
                <X size={20} /> Still Learning
              </button>
              <button
                onClick={() => nextCard("known")}
                className="flex-1 py-4 rounded border font-semibold flex items-center justify-center gap-2 hover:bg-[#302c2c] transition-colors"
                style={{borderColor: "#30d158", color: "#30d158", background: "rgba(48,209,88,0.1)"}}
              >
                <Check size={20} /> Got It!
              </button>
            </div>
          )}

          {flip === "front" && (
            <button
              onClick={() => setFlip("back")}
              className="btn-workbench-primary w-full flex items-center justify-center gap-2"
            >
              Reveal Answer
            </button>
          )}
        </div>
      </AppShell>
    );
  }

  if (mode === "quiz") {
    const progressPct = Math.round((fillIdx / fillBlanks.length) * 100);
    return (
      <AppShell>
        <div className="min-h-screen bg-[#201d1d] text-[#fdfcfc] font-mono px-6 py-8 max-w-xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => setMode("menu")} className="btn-workbench-secondary flex items-center gap-2 text-sm py-2 px-4">
              <ChevronLeft size={16} /> Back
            </button>
            <div className="flex items-center gap-2 text-sm font-bold" style={{color: "#ff9f0a"}}>
              <Zap size={14} /> {fillScore} / {fillIdx} correct
            </div>
          </div>

          <div className="progress-track mb-8">
            <div className="progress-fill" style={{ width: `${progressPct}%` }} />
          </div>

          <div className="border border-white/10 rounded p-6 mb-6 bg-[#252121]">
            <div className="text-xs text-muted uppercase tracking-wider mb-2">Fill in the blank</div>
            <div className="text-xl font-bold mb-2 leading-relaxed">
              {fillItem.sentence.replace("___", "______")}
            </div>
            <div className="text-sm text-muted italic">{fillItem.translation}</div>
          </div>

          <div className="mb-4">
            <input
              type="text"
              value={fillInput}
              onChange={(e) => setFillInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fillState === "idle" && checkFill()}
              disabled={fillState !== "idle"}
              placeholder="Type the missing word..."
              className="workbench-input w-full text-lg"
            />
          </div>

          {fillState !== "idle" && (
            <div
              className={`p-4 rounded border mb-4 ${
                fillState === "correct"
                  ? "border-[#30d158] text-[#30d158]"
                  : "border-[#ff453a] text-[#ff453a]"
              }`}
              style={{background: fillState === "correct" ? "rgba(48,209,88,0.1)" : "rgba(255,69,58,0.1)"}}
            >
              {fillState === "correct" ? (
                <span className="font-semibold">✓ Correct!</span>
              ) : (
                <span>
                  <span className="font-semibold">✗ The answer is: </span>
                  <span className="font-bold">{fillItem.answer}</span>
                  <div className="text-xs mt-1 opacity-70">Hint was: {fillItem.hint}</div>
                </span>
              )}
            </div>
          )}

          {fillState === "idle" ? (
            <button
              onClick={checkFill}
              disabled={!fillInput.trim()}
              className="btn-workbench-primary w-full disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Check Answer
            </button>
          ) : (
            <button onClick={nextFill} className="btn-workbench-primary w-full flex items-center justify-center gap-2">
              {fillIdx + 1 >= fillBlanks.length ? "See Results" : "Next"} <ChevronRight size={18} />
            </button>
          )}

          {fillState === "idle" && (
            <button
              onClick={() => { setFillState("wrong"); }}
              className="w-full text-center text-xs text-muted mt-3 hover:text-[#fdfcfc] transition-colors"
            >
              Hint: {fillItem.hint}
            </button>
          )}
        </div>
      </AppShell>
    );
  }

  return null;
}
