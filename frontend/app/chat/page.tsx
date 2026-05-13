"use client";

import { useState, useRef, useEffect } from "react";
import { Send, RotateCcw, Mic, BookOpen } from "lucide-react";
import AppShell from "@/components/AppShell";
import { INITIAL_CHAT, CHAT_STARTERS, type ChatMessage } from "@/lib/mock-data";
import { api } from "@/lib/api";

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_CHAT);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    api.createChatSession().then((session) => setSessionId(session.id)).catch(() => setSessionId(null));
  }, []);

  async function sendMessage(text?: string) {
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

    try {
      const activeSessionId = sessionId ?? (await api.createChatSession()).id;
      setSessionId(activeSessionId);
      const result = await api.sendChatMessage(activeSessionId, content);
      const aiMsg: ChatMessage = {
        id: result.message.id,
        role: "assistant",
        content: result.message.content,
        timestamp: new Date(result.message.createdAt),
      };
      setMessages((m) => [...m, aiMsg]);
    } catch {
      setMessages((m) => [...m, { id: (Date.now() + 1).toString(), role: "assistant", content: "Backend unavailable. Start it with `cd backend && npm run start:dev` and try again.", timestamp: new Date() }]);
    } finally {
      setIsTyping(false);
    }
  }

  function reset() {
    setMessages(INITIAL_CHAT);
    setInput("");
    setIsTyping(false);
  }

  return (
    <AppShell>
      <div className="flex flex-col h-screen md:h-[calc(100vh)] bg-[#201d1d] font-mono">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#252121] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded flex items-center justify-center text-xl border border-white/10 bg-[#302c2c]">
              🐾
            </div>
            <div>
              <div className="font-bold text-sm">Claw</div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full" style={{background: "#30d158"}} />
                <span className="text-xs text-muted">AI Language Tutor • Spanish</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={reset}
              className="p-2 rounded hover:bg-[#302c2c] transition-colors text-muted hover:text-white"
              title="Reset conversation"
            >
              <RotateCcw size={16} />
            </button>
          </div>
        </div>

        {/* Starters */}
        {messages.length <= 1 && (
          <div className="px-6 py-4 flex-shrink-0 border-b border-white/10">
            <p className="text-xs text-muted mb-3 uppercase tracking-wider font-medium">Try asking:</p>
            <div className="flex flex-wrap gap-2">
              {CHAT_STARTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="text-xs px-3 py-2 rounded border border-white/10 bg-[#252121] hover:border-white/20 hover:bg-[#302c2c] transition-all"
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
              className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
            >
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded flex items-center justify-center text-sm flex-shrink-0 mt-1 border border-white/10 bg-[#302c2c]">
                  🐾
                </div>
              )}
              <div
                className={`max-w-[75%] px-4 py-3 rounded text-sm leading-relaxed whitespace-pre-line ${
                  msg.role === "user"
                    ? "rounded-tr-sm bg-[#007aff] text-white"
                    : "rounded-tl-sm bg-[#252121] border border-white/10"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded flex items-center justify-center text-sm flex-shrink-0 mt-1 border border-white/10 bg-[#302c2c]">
                🐾
              </div>
              <div className="px-4 py-3 rounded rounded-tl-sm bg-[#252121] border border-white/10">
                <div className="flex gap-1 items-center h-4">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-[#9a9898] animate-bounce"
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
        <div className="px-6 py-4 border-t border-white/10 bg-[#252121] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex-1 flex items-center gap-3 px-4 py-3 rounded border border-white/10 bg-[#201d1d] focus-within:border-[#007aff] transition-colors">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Message Claw... (English or Spanish)"
                className="flex-1 bg-transparent text-white placeholder-[#6a6868] text-sm focus:outline-none"
              />
              <button className="text-muted hover:text-[#007aff] transition-colors">
                <Mic size={16} />
              </button>
            </div>
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || isTyping}
              className="w-11 h-11 rounded flex items-center justify-center bg-[#007aff] hover:bg-[#0051d5] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Send size={16} className="text-white" />
            </button>
          </div>
          <div className="flex items-center gap-1 mt-2 text-xs text-muted">
            <BookOpen size={11} />
            <span>Claw is your AI language tutor. Responses are served by the local Nest backend.</span>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
