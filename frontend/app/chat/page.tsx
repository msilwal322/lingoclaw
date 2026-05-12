"use client";

import { useState, useRef, useEffect } from "react";
import { Send, RotateCcw, Mic, BookOpen } from "lucide-react";
import AppShell from "@/components/AppShell";
import { INITIAL_CHAT, CHAT_STARTERS, type ChatMessage } from "@/lib/mock-data";

const AI_RESPONSES: Record<string, string> = {
  default: "¡Muy bien! That's a great question. Let me help you with that. In Spanish, the key is to practice consistently. Would you like me to give you an example?",
  hola: "¡Hola! Qué bueno verte por aquí. How are you feeling about your Spanish today? ¿Cómo estás? 😊",
  gracias: "¡De nada! You're welcome. By the way, 'gracias' is one of the most important words you'll use. Did you know there are several ways to thank someone in Spanish?",
  bien: "¡Qué bien! I'm glad to hear that. Let's keep the practice going. What topic would you like to work on — vocabulary, grammar, or conversation practice?",
  help: "Of course! I can help you with: \n• Grammar explanations\n• Vocabulary practice\n• Roleplay scenarios (restaurant, hotel, etc.)\n• Pronunciation tips\n• Cultural context\n\nWhat would be most useful right now?",
  practice: "¡Perfecto! Let's practice a real conversation. I'll play the role of a café server in Madrid. Ready?\n\n*In Spanish*\n— Buenos días, ¿qué desea tomar?",
  grammar: "Great choice! Spanish grammar has some tricky spots. The most common challenge is knowing when to use **ser** vs **estar** (both mean 'to be'). \n\n• **Ser** = permanent traits (identity, nationality, profession)\n• **Estar** = temporary states (location, feelings, conditions)\n\nWant some examples?",
};

function getAIResponse(message: string): string {
  const lower = message.toLowerCase();
  for (const key of Object.keys(AI_RESPONSES)) {
    if (key !== "default" && lower.includes(key)) {
      return AI_RESPONSES[key];
    }
  }
  const responses = [
    "¡Interesante! That's a great observation. In Spanish, context is everything — the same word can mean different things depending on how it's used. Want to explore that further?",
    "Good question! Let me think about the best way to explain this... In Spanish, we often use different tenses than you might expect in English. The key is immersion — reading, listening, and speaking as much as possible.",
    "¡Excelente pregunta! Actually, Spanish speakers from different countries have different accents and even different words for the same thing. For example, in Spain they say 'ordenador' for computer, while in Latin America they say 'computadora'.",
    "I love your curiosity! That's exactly the mindset that leads to fluency. Would you like to try a role-play scenario to practice this in context?",
    "¡Muy bien! You're making real progress. One tip: don't be afraid of making mistakes. Even native speakers make errors. The important thing is to communicate and keep learning!",
  ];
  return responses[Math.floor(Math.random() * responses.length)];
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_CHAT);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  function sendMessage(text?: string) {
    const content = (text ?? input).trim();
    if (!content) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content,
      timestamp: new Date(),
    };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setIsTyping(true);

    setTimeout(() => {
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: getAIResponse(content),
        timestamp: new Date(),
      };
      setMessages((m) => [...m, aiMsg]);
      setIsTyping(false);
    }, 800 + Math.random() * 600);
  }

  function reset() {
    setMessages(INITIAL_CHAT);
    setInput("");
    setIsTyping(false);
  }

  return (
    <AppShell>
      <div className="flex flex-col h-screen md:h-[calc(100vh)]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-surface/80 backdrop-blur-md flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl" style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.3), rgba(34,211,238,0.2))", border: "1px solid rgba(124,58,237,0.3)" }}>
              🐾
            </div>
            <div>
              <div className="font-bold text-sm">Claw</div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                <span className="text-xs text-muted">AI Language Tutor • Spanish</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={reset}
              className="p-2 rounded-lg hover:bg-white/8 transition-colors text-muted hover:text-white"
              title="Reset conversation"
            >
              <RotateCcw size={16} />
            </button>
          </div>
        </div>

        {/* Starters */}
        {messages.length <= 1 && (
          <div className="px-6 py-4 flex-shrink-0">
            <p className="text-xs text-muted mb-3 uppercase tracking-wider font-semibold">Try asking:</p>
            <div className="flex flex-wrap gap-2">
              {CHAT_STARTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="text-xs px-3 py-2 rounded-full border border-white/10 bg-white/5 hover:border-purple-500/40 hover:bg-purple-500/8 transition-all text-slate-300"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 animate-fade-in ${msg.role === "user" ? "flex-row-reverse" : ""}`}
            >
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0 mt-1" style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.3), rgba(34,211,238,0.2))", border: "1px solid rgba(124,58,237,0.3)" }}>
                  🐾
                </div>
              )}
              <div
                className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${
                  msg.role === "user"
                    ? "rounded-tr-sm text-white"
                    : "rounded-tl-sm text-slate-200"
                }`}
                style={
                  msg.role === "user"
                    ? { background: "linear-gradient(135deg, #7c3aed, #2563eb)" }
                    : { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }
                }
              >
                {msg.content}
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex gap-3 animate-fade-in">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0 mt-1" style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.3), rgba(34,211,238,0.2))", border: "1px solid rgba(124,58,237,0.3)" }}>
                🐾
              </div>
              <div className="px-4 py-3 rounded-2xl rounded-tl-sm" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="flex gap-1 items-center h-4">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-6 py-4 border-t border-white/5 bg-surface/60 backdrop-blur-md flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex-1 flex items-center gap-3 px-4 py-3 rounded-2xl border border-white/10 bg-white/5 focus-within:border-purple-500/50 transition-colors">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Message Claw... (English or Spanish)"
                className="flex-1 bg-transparent text-white placeholder-slate-600 text-sm focus:outline-none"
              />
              <button className="text-muted hover:text-purple-400 transition-colors">
                <Mic size={16} />
              </button>
            </div>
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || isTyping}
              className="w-11 h-11 rounded-xl flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: "linear-gradient(135deg, #7c3aed, #2563eb)" }}
            >
              <Send size={16} className="text-white" />
            </button>
          </div>
          <div className="flex items-center gap-1 mt-2 text-xs text-muted">
            <BookOpen size={11} />
            <span>Claw is your AI language tutor. Responses are simulated for demo.</span>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
