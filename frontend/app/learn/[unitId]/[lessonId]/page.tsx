"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { X, ChevronRight, Heart, CheckCircle, XCircle, Zap } from "lucide-react";
import { QUESTIONS, LESSONS } from "@/lib/mock-data";
import { completeLesson } from "@/lib/storage";
import Link from "next/link";

type AnswerState = "idle" | "correct" | "wrong";

export default function LearnLessonPage() {
  const params = useParams();
  const unitId = params.unitId as string;
  const lessonId = params.lessonId as string;

  const lesson = LESSONS.find((l) => l.id === lessonId) ?? LESSONS[0];
  const questions = QUESTIONS;

  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [answerState, setAnswerState] = useState<AnswerState>("idle");
  const [lives, setLives] = useState(3);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);

  const question = questions[currentQ];
  const progress = Math.round((currentQ / questions.length) * 100);

  function handleSelect(option: string) {
    if (answerState !== "idle") return;
    setSelected(option);
    const correct = option === question.answer;
    setAnswerState(correct ? "correct" : "wrong");
    if (correct) {
      setScore((s) => s + 1);
    } else {
      setLives((l) => l - 1);
    }
  }

  function handleNext() {
    if (currentQ + 1 >= questions.length || lives <= 0) {
      const xp = Math.round((score / questions.length) * (lesson?.xpReward ?? 50));
      setXpEarned(xp);
      completeLesson(lessonId, xp);
      setDone(true);
    } else {
      setCurrentQ((q) => q + 1);
      setSelected(null);
      setAnswerState("idle");
    }
  }

  if (done) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div
        className="min-h-screen flex items-center justify-center px-6"
        style={{ background: "radial-gradient(ellipse at 50% 30%, rgba(124,58,237,0.2) 0%, transparent 60%), #08080f" }}
      >
        <div className="glass-card p-10 max-w-md w-full text-center">
          <div className="text-6xl mb-6">{pct >= 80 ? "🏆" : pct >= 60 ? "🎯" : "💪"}</div>
          <h1 className="text-3xl font-black mb-2">
            {pct >= 80 ? "Outstanding!" : pct >= 60 ? "Nice Work!" : "Keep Going!"}
          </h1>
          <p className="text-muted mb-8">
            You scored {score} out of {questions.length} — Unit {unitId}, Lesson {lessonId}.
          </p>

          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="glass-card p-4 text-center">
              <div className="text-2xl font-black gradient-text">{pct}%</div>
              <div className="text-xs text-muted mt-1">Accuracy</div>
            </div>
            <div className="glass-card p-4 text-center">
              <div className="text-2xl font-black text-amber-400 flex items-center justify-center gap-1">
                <Zap size={18} />{xpEarned}
              </div>
              <div className="text-xs text-muted mt-1">XP Earned</div>
            </div>
            <div className="glass-card p-4 text-center">
              <div className="text-2xl font-black text-red-400">
                {"❤️".repeat(lives)}{"🖤".repeat(3 - lives)}
              </div>
              <div className="text-xs text-muted mt-1">Lives Left</div>
            </div>
          </div>

          <div className="flex gap-3">
            <Link href="/dashboard" className="btn-secondary flex-1 text-center">
              Dashboard
            </Link>
            <button
              onClick={() => {
                setCurrentQ(0);
                setSelected(null);
                setAnswerState("idle");
                setLives(3);
                setScore(0);
                setDone(false);
              }}
              className="btn-primary flex-1"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen"
      style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(124,58,237,0.1) 0%, transparent 50%), #08080f" }}
    >
      <div className="sticky top-0 z-10 backdrop-blur-md border-b border-white/5" style={{ background: "rgba(8,8,15,0.8)" }}>
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/dashboard" className="text-muted hover:text-white transition-colors">
            <X size={20} />
          </Link>
          <div className="flex-1 xp-bar-track">
            <div className="xp-bar-fill transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex items-center gap-0.5 text-lg">
            {[...Array(3)].map((_, i) => (
              <Heart
                key={i}
                size={18}
                className={i < lives ? "text-red-400 fill-red-400" : "text-slate-700"}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="mb-8">
          <div className="text-xs font-semibold text-muted uppercase tracking-wider mb-1">
            Unit {unitId} · Question {currentQ + 1} of {questions.length}
          </div>
          <div className="level-badge mb-4">{question.type.replace("-", " ")}</div>
          <h2 className="text-2xl font-bold leading-tight">{question.prompt}</h2>
        </div>

        <div className="space-y-3 mb-8">
          {question.options?.map((option) => {
            let cls = "answer-option";
            if (selected === option) {
              if (answerState === "correct") cls += " correct";
              else if (answerState === "wrong") cls += " wrong";
              else cls += " selected";
            } else if (answerState !== "idle" && option === question.answer) {
              cls += " correct";
            }
            return (
              <button key={option} className={cls} onClick={() => handleSelect(option)}>
                <span className="flex items-center gap-3">
                  {answerState !== "idle" && option === question.answer && (
                    <CheckCircle size={16} className="text-green-400 flex-shrink-0" />
                  )}
                  {answerState !== "idle" && selected === option && option !== question.answer && (
                    <XCircle size={16} className="text-red-400 flex-shrink-0" />
                  )}
                  {option}
                </span>
              </button>
            );
          })}
        </div>

        {answerState !== "idle" && (
          <div
            className={`p-4 rounded-xl border mb-6 ${
              answerState === "correct"
                ? "bg-green-500/10 border-green-500/30 text-green-300"
                : "bg-red-500/10 border-red-500/30 text-red-300"
            }`}
          >
            <div className="font-semibold mb-1 flex items-center gap-2">
              {answerState === "correct" ? (
                <><CheckCircle size={16} /> Correct!</>
              ) : (
                <><XCircle size={16} /> Not quite</>
              )}
            </div>
            {question.explanation && (
              <p className="text-sm opacity-80">{question.explanation}</p>
            )}
          </div>
        )}

        {answerState !== "idle" && (
          <button onClick={handleNext} className="btn-primary w-full flex items-center justify-center gap-2">
            {currentQ + 1 >= questions.length ? "See Results" : "Next Question"}
            <ChevronRight size={18} />
          </button>
        )}
      </div>
    </div>
  );
}
