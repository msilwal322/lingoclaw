"use client";

import { useState, useEffect } from "react";
import { Terminal, TrendingUp, Users } from "lucide-react";
import AppShell from "@/components/AppShell";
import { LEADERBOARD } from "@/lib/mock-data";
import type { LeaderboardUser } from "@/lib/mock-data";
import { api } from "@/lib/api";

type Period = "weekly" | "monthly" | "alltime";

const PERIOD_LABELS: Record<Period, string> = {
  weekly: "This Week",
  monthly: "This Month",
  alltime: "All Time",
};

export default function LeaderboardPage() {
  const [period, setPeriod] = useState<Period>("weekly");
  const [baseData, setBaseData] = useState<LeaderboardUser[]>(LEADERBOARD);

  useEffect(() => {
    api.leaderboard().then(setBaseData).catch(() => {});
  }, []);

  const data = baseData.map((u) => ({
    ...u,
    xp: Math.round(u.xp * (period === "weekly" ? 0.02 : period === "monthly" ? 0.08 : 1)),
  }));

  const currentUser = data.find((u) => u.isCurrentUser);

  return (
    <AppShell>
      <div className="min-h-screen bg-[#201d1d] text-[#fdfcfc] font-mono px-6 py-8 max-w-2xl mx-auto">
        <div className="flex items-center gap-2 text-xs text-[#9a9898] mb-2">
          <Terminal size={14} /> ~/community
        </div>
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-1">Community benchmarks</h1>
          <p className="text-muted text-sm">See how your learning pace compares with other learners.</p>
        </div>

        {/* Period tabs */}
        <div className="flex items-center gap-1 p-1 rounded mb-8 bg-[#252121]">
          {(["weekly", "monthly", "alltime"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`flex-1 py-2.5 rounded text-sm font-semibold transition-all ${
                period === p
                  ? "text-white bg-[#007aff]"
                  : "text-muted hover:text-[#fdfcfc]"
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>

        {/* Stats overview */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="border border-white/10 rounded p-4 bg-[#252121]">
            <div className="flex items-center gap-2 text-sm mb-2">
              <Users size={14} style={{color: "#5ac8fa"}} />
              <span className="text-muted">Active learners</span>
            </div>
            <div className="text-2xl font-bold">2,847</div>
          </div>
          <div className="border border-white/10 rounded p-4 bg-[#252121]">
            <div className="flex items-center gap-2 text-sm mb-2">
              <TrendingUp size={14} style={{color: "#30d158"}} />
              <span className="text-muted">Avg. progress</span>
            </div>
            <div className="text-2xl font-bold">47 lessons</div>
          </div>
        </div>

        {/* List */}
        <div className="space-y-2 mb-6">
          {data.map((user) => (
            <div
              key={user.rank}
              className={`flex items-center gap-4 p-4 rounded border transition-all ${
                user.isCurrentUser
                  ? "border-[#007aff]/40 bg-[#007aff]/10"
                  : "border-white/10 bg-[#252121] hover:bg-[#302c2c]"
              }`}
            >
              <span className={`w-7 text-center font-bold text-sm ${user.isCurrentUser ? "text-[#007aff]" : "text-muted"}`}>
                {user.rank}
              </span>
              <span className="text-2xl">{user.avatar}</span>
              <div className="flex-1 min-w-0">
                <div className={`font-semibold text-sm flex items-center gap-2 ${user.isCurrentUser ? "text-[#007aff]" : ""}`}>
                  {user.name}
                  {user.isCurrentUser && <span className="text-xs bg-[#007aff]/20 text-[#007aff] px-2 py-0.5 rounded border border-[#007aff]/30">You</span>}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted mt-0.5">
                  <span>{user.country}</span>
                  <span className="flex items-center gap-1" style={{color: "#ff9f0a"}}>
                    {user.streak}d streak
                  </span>
                </div>
              </div>
              <div className="font-bold text-sm">
                {user.xp.toLocaleString()}
              </div>
            </div>
          ))}
        </div>

        {/* Your position callout */}
        {currentUser && (
          <div className="border rounded p-5 bg-[#252121]" style={{borderColor: "#007aff", background: "rgba(0,122,255,0.08)"}}>
            <div className="flex items-center gap-3">
              <span className="text-3xl">{currentUser.avatar}</span>
              <div className="flex-1">
                <div className="font-bold">Your position</div>
                <div className="text-sm text-muted">
                  #{currentUser.rank} • {currentUser.xp.toLocaleString()} lessons completed
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted mb-1">Next benchmark</div>
                <div className="text-sm font-bold" style={{color: "#007aff"}}>
                  +{(data[currentUser.rank - 2]?.xp ?? 0) - currentUser.xp}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="border border-white/10 rounded p-4 mt-6 text-xs text-muted bg-[#252121] leading-relaxed">
          <div style={{color: "#007aff"}} className="mb-1">◆ benchmarks, not competition</div>
          This leaderboard shows relative progress for context. Learning is personal—use these numbers as motivation, not pressure.
        </div>
      </div>
    </AppShell>
  );
}
