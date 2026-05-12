"use client";

import { useState } from "react";
import { RotateCcw, Check, X, ChevronLeft, ChevronRight, Zap } from "lucide-react";
import AppShell from "@/components/AppShell";
import Link from "next/link";

type Mode = "menu" | "flashcards" | "quiz";
type FlipState = "front" | "back";

const FLASHCARDS = [
  { front: "Hola", back: "Hello", example: "¡Hola! ¿Cómo estás?", phonetic: "OH-lah" },
  { front: "Gracias", back: "Thank you", example: "Muchas gracias por tu ayuda.", phonetic: "GRAH-see-ahs" },
  { front: "Por favor", back: "Please", example: "Un café, por favor.", phonetic: "por fah-VOR" },
  { front: "Lo siento", back: "I'm sorry", example: "Lo siento mucho.", phonetic: "loh see-EN-toh" },
  { front: "¿Dónde está...?", back: "Where is...?", example: "¿Dónde está el baño?", phonetic: "DON-deh es-TAH" },
  { front: "No entiendo", back: "I don't understand", example: "Lo siento, no entiendo.", phonetic: "noh en-tee-EN-doh" },
  { front: "¿Cuánto cuesta?", back: "How much does it cost?", example: "¿Cuánto cuesta este libro?", phonetic: "KWAN-toh KWES-tah" },
  { front: "Hablas inglés", back: "Do you speak English?", example: "¿Hablas inglés?", phonetic: "AH-blahs een-GLES" },
];

const FILL_BLANKS = [
  { sentence: "Me llamo ___", translation: "My name is ___", answer: "Carlos", hint: "A common Spanish name" },
  { sentence: "___ es una manzana roja", translation: "___ is a red apple", answer: "Esta", hint: "'This' (feminine)" },
  { sentence: "Tengo ___ años", translation: "I am ___ years old", answer: "veinte", hint: "The number 20" },
  { sentence: "Quiero ___ agua", translation: "I want ___ water", answer: "más", hint: "Think 'more'" },
  { sentence: "La tienda está ___", translation: "The store is ___", answer: "cerrada", hint: "Opposite of open" },
];

export default function PracticePage() {
  const [mode, setMode] = useState<Mode>("menu");
  const [cardIdx, setCardIdx] = useState(0);
  const [flip, setFlip] = useState<FlipState>("front");
  const [known, setKnown] = useState<Set<number>>(new Set());
  const [unknown, setUnknown] = useState<Set<number>>(new Set());

  const [fillIdx, setFillIdx] = useState(0);
  const [fillInput, setFillInput] = useState("");
  const [fillState, setFillState] = useState<"idle" | "correct" | "wrong">("idle");
  const [fillScore, setFillScore] = useState(0);

  const card = FLASHCARDS[cardIdx];
  const fillItem = FILL_BLANKS[fillIdx];

  function nextCard(verdict: "known" | "unknown") {
    if (verdict === "known") setKnown((s) => new Set([...s, cardIdx]));
    else setUnknown((s) => new Set([...s, cardIdx]));
    setFlip("front");
    if (cardIdx + 1 >= FLASHCARDS.length) setMode("menu");
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
    if (fillIdx + 1 >= FILL_BLANKS.length) setMode("menu");
    else setFillIdx((i) => i + 1);
  }

  if (mode === "menu") {
    return (
      <AppShell>
        <div className="px-6 py-8 max-w-3xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-black mb-1">Practice</h1>
            <p className="text-muted text-sm">Reinforce what you&apos;ve learned with different practice modes.</p>
          </div>

          {/* Score from last round */}
          {(known.size + unknown.size > 0) && (
            <div className="glass-card p-5 mb-8 flex items-center gap-4">
              <div className="text-4xl">📊</div>
              <div>
                <div className="font-bold">Last Flashcard Session</div>
                <div className="text-sm text-muted mt-1">
                  <span className="text-green-400 font-semibold">{known.size} known</span> ·{" "}
                  <span className="text-red-400 font-semibold">{unknown.size} still learning</span>
                </div>
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-5">
            <button
              onClick={() => {
                setCardIdx(0);
                setFlip("front");
                setKnown(new Set());
                setUnknown(new Set());
                setMode("flashcards");
              }}
              className="glass-card-hover p-6 text-left"
            >
              <div className="text-4xl mb-4">🃏</div>
              <h2 className="text-lg font-bold mb-2">Flashcards</h2>
              <p className="text-sm text-muted leading-relaxed">
                Review vocabulary cards. Flip to reveal translations and mark what you know.
              </p>
              <div className="flex items-center gap-2 mt-4">
                <span className="text-xs text-purple-400 font-medium">{FLASHCARDS.length} cards</span>
                <span className="text-xs text-muted">• Spanish vocabulary</span>
              </div>
            </button>

            <button
              onClick={() => {
                setFillIdx(0);
                setFillInput("");
                setFillState("idle");
                setFillScore(0);
                setMode("quiz");
              }}
              className="glass-card-hover p-6 text-left"
            >
              <div className="text-4xl mb-4">✍️</div>
              <h2 className="text-lg font-bold mb-2">Fill in the Blank</h2>
              <p className="text-sm text-muted leading-relaxed">
                Complete sentences by typing the missing word. Tests recall over recognition.
              </p>
              <div className="flex items-center gap-2 mt-4">
                <span className="text-xs text-cyan-400 font-medium">{FILL_BLANKS.length} questions</span>
                <span className="text-xs text-muted">• Spanish sentences</span>
              </div>
            </button>

            <Link href="/lesson/l3" className="glass-card-hover p-6 block">
              <div className="text-4xl mb-4">🎮</div>
              <h2 className="text-lg font-bold mb-2">Mini Lessons</h2>
              <p className="text-sm text-muted leading-relaxed">
                Short, focused lessons covering grammar and vocabulary with instant feedback.
              </p>
              <div className="flex items-center gap-2 mt-4">
                <span className="text-xs text-amber-400 font-medium">7 questions</span>
                <span className="text-xs text-muted">• +50 XP</span>
              </div>
            </Link>

            <Link href="/chat" className="glass-card-hover p-6 block">
              <div className="text-4xl mb-4">🗣️</div>
              <h2 className="text-lg font-bold mb-2">Conversation Practice</h2>
              <p className="text-sm text-muted leading-relaxed">
                Chat with Claw, your AI tutor. Practice real-world conversation scenarios.
              </p>
              <div className="flex items-center gap-2 mt-4">
                <span className="text-xs text-green-400 font-medium">AI-powered</span>
                <span className="text-xs text-muted">• Open-ended</span>
              </div>
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  if (mode === "flashcards") {
    const progressPct = Math.round((cardIdx / FLASHCARDS.length) * 100);
    return (
      <AppShell>
        <div className="px-6 py-8 max-w-xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => setMode("menu")} className="btn-secondary flex items-center gap-2 text-sm py-2 px-4">
              <ChevronLeft size={16} /> Back
            </button>
            <div className="text-sm text-muted">
              {cardIdx + 1} / {FLASHCARDS.length}
            </div>
          </div>

          <div className="xp-bar-track mb-8">
            <div className="xp-bar-fill" style={{ width: `${progressPct}%` }} />
          </div>

          {/* Flashcard */}
          <div
            className="glass-card p-0 mb-8 cursor-pointer select-none overflow-hidden"
            style={{ minHeight: 260, background: "linear-gradient(135deg, rgba(124,58,237,0.12), rgba(34,211,238,0.08))", borderColor: "rgba(124,58,237,0.25)" }}
            onClick={() => setFlip((f) => (f === "front" ? "back" : "front"))}
          >
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <span className="text-xs text-muted uppercase tracking-wider">
                {flip === "front" ? "Spanish" : "English"}
              </span>
              <span className="text-xs text-purple-400">Tap to flip</span>
            </div>

            <div className="p-8 flex flex-col items-center justify-center text-center" style={{ minHeight: 180 }}>
              {flip === "front" ? (
                <>
                  <div className="text-4xl font-black mb-3">{card.front}</div>
                  <div className="text-sm text-muted">{card.phonetic}</div>
                </>
              ) : (
                <>
                  <div className="text-4xl font-black gradient-text mb-3">{card.back}</div>
                  <div className="text-sm text-slate-400 italic mt-2">&ldquo;{card.example}&rdquo;</div>
                </>
              )}
            </div>
          </div>

          {/* Verdict buttons */}
          {flip === "back" && (
            <div className="flex gap-4 animate-fade-in">
              <button
                onClick={() => nextCard("unknown")}
                className="flex-1 py-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 font-semibold flex items-center justify-center gap-2 hover:bg-red-500/15 transition-colors"
              >
                <X size={20} /> Still Learning
              </button>
              <button
                onClick={() => nextCard("known")}
                className="flex-1 py-4 rounded-xl border border-green-500/30 bg-green-500/10 text-green-400 font-semibold flex items-center justify-center gap-2 hover:bg-green-500/15 transition-colors"
              >
                <Check size={20} /> Got It!
              </button>
            </div>
          )}

          {flip === "front" && (
            <button
              onClick={() => setFlip("back")}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              Reveal Answer
            </button>
          )}
        </div>
      </AppShell>
    );
  }

  if (mode === "quiz") {
    const progressPct = Math.round((fillIdx / FILL_BLANKS.length) * 100);
    return (
      <AppShell>
        <div className="px-6 py-8 max-w-xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => setMode("menu")} className="btn-secondary flex items-center gap-2 text-sm py-2 px-4">
              <ChevronLeft size={16} /> Back
            </button>
            <div className="flex items-center gap-2 text-sm font-bold text-amber-400">
              <Zap size={14} /> {fillScore} / {fillIdx} correct
            </div>
          </div>

          <div className="xp-bar-track mb-8">
            <div className="xp-bar-fill" style={{ width: `${progressPct}%` }} />
          </div>

          <div className="glass-card p-6 mb-6">
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
              className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 transition-colors text-lg"
            />
          </div>

          {fillState !== "idle" && (
            <div
              className={`p-4 rounded-xl border mb-4 animate-slide-up ${
                fillState === "correct"
                  ? "bg-green-500/10 border-green-500/30 text-green-300"
                  : "bg-red-500/10 border-red-500/30 text-red-300"
              }`}
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
              className="btn-primary w-full disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Check Answer
            </button>
          ) : (
            <button onClick={nextFill} className="btn-primary w-full flex items-center justify-center gap-2">
              {fillIdx + 1 >= FILL_BLANKS.length ? "See Results" : "Next"} <ChevronRight size={18} />
            </button>
          )}

          {fillState === "idle" && (
            <button
              onClick={() => { setFillState("wrong"); }}
              className="w-full text-center text-xs text-muted mt-3 hover:text-slate-400 transition-colors"
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
