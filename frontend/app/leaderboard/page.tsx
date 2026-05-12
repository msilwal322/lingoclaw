"use client";

import { useState } from "react";
import { Flame, Zap, Crown } from "lucide-react";
import AppShell from "@/components/AppShell";
import { LEADERBOARD } from "@/lib/mock-data";

type Period = "weekly" | "monthly" | "alltime";

const PERIOD_LABELS: Record<Period, string> = {
  weekly: "This Week",
  monthly: "This Month",
  alltime: "All Time",
};

const XP_MULTIPLIERS: Record<Period, number> = {
  weekly: 1,
  monthly: 4,
  alltime: 52,
};

export default function LeaderboardPage() {
  const [period, setPeriod] = useState<Period>("weekly");

  const data = LEADERBOARD.map((u) => ({
    ...u,
    xp: Math.round(u.xp * (period === "weekly" ? 0.02 : period === "monthly" ? 0.08 : 1)),
  }));

  const podium = data.slice(0, 3);
  const rest = data.slice(3);
  const currentUser = data.find((u) => u.isCurrentUser);

  const medalColors = ["text-amber-400", "text-slate-400", "text-amber-700"];
  const medalEmoji = ["🥇", "🥈", "🥉"];

  return (
    <AppShell>
      <div className="px-6 py-8 max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-black mb-1">Leaderboard</h1>
          <p className="text-muted text-sm">Compete with learners worldwide. Stay consistent, climb higher.</p>
        </div>

        {/* Period tabs */}
        <div className="flex items-center gap-1 p-1 rounded-xl mb-8" style={{ background: "rgba(255,255,255,0.05)" }}>
          {(["weekly", "monthly", "alltime"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                period === p
                  ? "text-white"
                  : "text-muted hover:text-slate-300"
              }`}
              style={period === p ? { background: "linear-gradient(135deg, #7c3aed, #2563eb)" } : {}}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>

        {/* Podium */}
        <div className="flex items-end justify-center gap-4 mb-10">
          {[podium[1], podium[0], podium[2]].map((user, i) => {
            const rank = i === 0 ? 2 : i === 1 ? 1 : 3;
            const heights = ["h-28", "h-36", "h-24"];
            const actualIdx = rank - 1;
            return (
              <div key={user.rank} className={`flex flex-col items-center gap-2 ${i === 1 ? "order-2" : i === 0 ? "order-1" : "order-3"}`}>
                <div className="text-2xl">{user.avatar}</div>
                <div className="text-xs font-bold text-center max-w-[80px] truncate">{user.name}</div>
                <div className="text-xs text-muted">{user.country}</div>
                <div className="flex items-center gap-1 text-xs font-bold text-amber-400">
                  <Zap size={10} /> {user.xp.toLocaleString()}
                </div>
                <div
                  className={`${heights[i]} w-20 rounded-t-xl flex items-center justify-center`}
                  style={{
                    background: rank === 1
                      ? "linear-gradient(180deg, rgba(251,191,36,0.3), rgba(251,191,36,0.1))"
                      : rank === 2
                      ? "linear-gradient(180deg, rgba(148,163,184,0.2), rgba(148,163,184,0.05))"
                      : "linear-gradient(180deg, rgba(180,108,56,0.2), rgba(180,108,56,0.05))",
                    border: `1px solid ${rank === 1 ? "rgba(251,191,36,0.3)" : rank === 2 ? "rgba(148,163,184,0.2)" : "rgba(180,108,56,0.2)"}`,
                  }}
                >
                  <span className="text-3xl">{medalEmoji[actualIdx]}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Rest of leaderboard */}
        <div className="space-y-2 mb-6">
          {rest.map((user) => (
            <div
              key={user.rank}
              className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                user.isCurrentUser
                  ? "border-purple-500/40 bg-purple-500/10"
                  : "border-white/5 bg-white/3 hover:bg-white/5"
              }`}
            >
              <span className={`w-7 text-center font-black text-sm ${user.isCurrentUser ? "text-purple-400" : "text-muted"}`}>
                {user.rank}
              </span>
              <span className="text-2xl">{user.avatar}</span>
              <div className="flex-1 min-w-0">
                <div className={`font-semibold text-sm flex items-center gap-2 ${user.isCurrentUser ? "text-purple-300" : ""}`}>
                  {user.name}
                  {user.isCurrentUser && <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/30">You</span>}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted mt-0.5">
                  <span>{user.country}</span>
                  <span className="flex items-center gap-1 text-red-400">
                    <Flame size={10} /> {user.streak}d
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 font-bold text-sm text-amber-400">
                <Zap size={14} />
                {user.xp.toLocaleString()}
              </div>
            </div>
          ))}
        </div>

        {/* Your position callout */}
        {currentUser && (
          <div className="glass-card p-5" style={{ borderColor: "rgba(124,58,237,0.3)", background: "rgba(124,58,237,0.08)" }}>
            <div className="flex items-center gap-3">
              <span className="text-3xl">{currentUser.avatar}</span>
              <div className="flex-1">
                <div className="font-bold">Your Ranking</div>
                <div className="text-sm text-muted">
                  #{currentUser.rank} globally · {currentUser.xp.toLocaleString()} XP this period
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted mb-1">Next rank</div>
                <div className="text-sm font-bold text-amber-400">
                  +{(data[currentUser.rank - 2]?.xp ?? 0) - currentUser.xp} XP
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
