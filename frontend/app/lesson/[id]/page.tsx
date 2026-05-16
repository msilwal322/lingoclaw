"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { X, ChevronRight, Heart, CheckCircle, XCircle } from "lucide-react";
import type { Question } from "@/lib/mock-data";
import { api } from "@/lib/api";
import type { LessonWithQuestions } from "@/lib/api";
import Link from "next/link";

type AnswerState = "idle" | "correct" | "wrong";

export default function LessonPage() {
  const params = useParams();
  const lessonId = params.id as string;

  const [lessonData, setLessonData] = useState<LessonWithQuestions | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api.lesson(lessonId)
      .then((data) => {
        setLessonData(data);
        if (data.questions?.length) setQuestions(data.questions);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load lesson");
        setLoading(false);
      });
  }, [lessonId]);

  const lesson = lessonData;

  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [answerState, setAnswerState] = useState<AnswerState>("idle");
  const [lives, setLives] = useState(3);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);

  const question = questions[currentQ];
  const progress = Math.round(((currentQ) / questions.length) * 100);

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
      api.completeLesson(lessonId, score)
        .then((res) => { setXpEarned(res.xpEarned); setDone(true); })
        .catch(() => setDone(true));
    } else {
      setCurrentQ((q) => q + 1);
      setSelected(null);
      setAnswerState("idle");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 bg-[#201d1d] font-mono">
        <div className="text-center">
          <div className="text-4xl mb-4">🐾</div>
          <p className="text-muted">Loading lesson...</p>
        </div>
      </div>
    );
  }

  if (error || !lesson || questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 bg-[#201d1d] font-mono">
        <div className="border border-white/10 rounded p-10 max-w-md w-full text-center bg-[#252121]">
          <div className="text-6xl mb-6">⚠️</div>
          <h1 className="text-2xl font-bold mb-2">Lesson Not Found</h1>
          <p className="text-muted mb-8">{error || "This lesson could not be loaded."}</p>
          <Link href="/dashboard" className="btn-workbench-primary inline-block">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (done) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="min-h-screen flex items-center justify-center px-6 bg-[#201d1d] font-mono">
        <div className="border border-white/10 rounded p-10 max-w-md w-full text-center bg-[#252121]">
          <div className="text-6xl mb-6">{pct >= 80 ? "🏆" : pct >= 60 ? "🎯" : "💪"}</div>
          <h1 className="text-3xl font-bold mb-2">
            {pct >= 80 ? "Outstanding!" : pct >= 60 ? "Nice Work!" : "Keep Going!"}
          </h1>
          <p className="text-muted mb-8">
            You got {score} out of {questions.length} correct.
          </p>

          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="border border-white/10 rounded p-4 text-center bg-[#302c2c]">
              <div className="text-2xl font-bold" style={{color: "#007aff"}}>{pct}%</div>
              <div className="text-xs text-muted mt-1">Accuracy</div>
            </div>
            <div className="border border-white/10 rounded p-4 text-center bg-[#302c2c]">
              <div className="text-2xl font-bold" style={{color: "#ff9f0a"}}>+{xpEarned}</div>
              <div className="text-xs text-muted mt-1">XP Earned</div>
            </div>
            <div className="border border-white/10 rounded p-4 text-center bg-[#302c2c]">
              <div className="text-2xl font-bold flex items-center justify-center gap-1" style={{color: "#ff453a"}}>
                {"❤️".repeat(lives)}{"🖤".repeat(3 - lives)}
              </div>
              <div className="text-xs text-muted mt-1">Lives Left</div>
            </div>
          </div>

          <div className="flex gap-3">
            <Link href="/dashboard" className="btn-workbench-secondary flex-1 text-center">
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
              className="btn-workbench-primary flex-1"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#201d1d] font-mono">
      {/* Header */}
      <div className="sticky top-0 z-10 backdrop-blur-md border-b border-white/10" style={{ background: "rgba(32,29,29,0.9)" }}>
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/dashboard" className="text-muted hover:text-white transition-colors">
            <X size={20} />
          </Link>

          {/* Progress bar */}
          <div className="flex-1 progress-track">
            <div className="progress-fill transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>

          {/* Lives */}
          <div className="flex items-center gap-0.5 text-lg">
            {[...Array(3)].map((_, i) => (
              <Heart
                key={i}
                size={18}
                className={i < lives ? "fill-[#ff453a]" : ""}
                style={{color: i < lives ? "#ff453a" : "#6a6868"}}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Question */}
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="mb-8">
          <div className="text-xs font-semibold text-muted uppercase tracking-wider mb-1">
            {lesson.title} · Question {currentQ + 1} of {questions.length}
          </div>
          <div className="badge-info mb-4">{question.type.replace("-", " ")}</div>
          <h2 className="text-2xl font-bold leading-tight">{question.prompt}</h2>
        </div>

        {/* Options */}
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
                    <CheckCircle size={16} style={{color: "#30d158"}} className="flex-shrink-0" />
                  )}
                  {answerState !== "idle" && selected === option && option !== question.answer && (
                    <XCircle size={16} style={{color: "#ff453a"}} className="flex-shrink-0" />
                  )}
                  {option}
                </span>
              </button>
            );
          })}
        </div>

        {/* Feedback */}
        {answerState !== "idle" && (
          <div
            className={`p-4 rounded border mb-6 ${
              answerState === "correct"
                ? "border-[#30d158]"
                : "border-[#ff453a]"
            }`}
            style={{background: answerState === "correct" ? "rgba(48,209,88,0.1)" : "rgba(255,69,58,0.1)", color: answerState === "correct" ? "#30d158" : "#ff453a"}}
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

        {/* Next button */}
        {answerState !== "idle" && (
          <button onClick={handleNext} className="btn-workbench-primary w-full flex items-center justify-center gap-2">
            {currentQ + 1 >= questions.length ? "See Results" : "Next Question"}
            <ChevronRight size={18} />
          </button>
        )}
      </div>
    </div>
  );
}
