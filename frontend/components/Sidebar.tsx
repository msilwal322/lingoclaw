"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  Swords,
  MessageCircle,
  BookMarked,
  Trophy,
  User,
  Zap,
  Flame,
} from "lucide-react";
import { getProfile } from "@/lib/storage";
import { useEffect, useState } from "react";
import type { UserProfile } from "@/lib/storage";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/lesson/l3", label: "Lessons", icon: BookOpen },
  { href: "/practice", label: "Practice", icon: Swords },
  { href: "/chat", label: "AI Tutor", icon: MessageCircle },
  { href: "/stories", label: "Stories", icon: BookMarked },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/profile", label: "Profile", icon: User },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    setProfile(getProfile());
  }, []);

  const goalPct = profile
    ? Math.min(100, Math.round((profile.todayXp / profile.dailyGoalXp) * 100))
    : 0;

  return (
    <aside className="hidden md:flex flex-col w-64 min-h-screen bg-surface border-r border-white/5 p-4 gap-2 fixed left-0 top-0 z-40">
      {/* Logo */}
      <Link href="/dashboard" className="flex items-center gap-3 px-4 py-3 mb-2">
        <span className="text-2xl">🐾</span>
        <span className="text-xl font-black gradient-text">LingoClaw</span>
      </Link>

      {/* Nav items */}
      <nav className="flex-1 flex flex-col gap-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive =
            pathname === href ||
            (href !== "/dashboard" && pathname.startsWith(href.split("/")[1] ? `/${href.split("/")[1]}` : href));
          return (
            <Link key={href} href={href} className={`nav-item ${isActive ? "active" : ""}`}>
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Daily goal widget */}
      {profile && (
        <div className="glass-card p-4 mt-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted uppercase tracking-wider">Daily Goal</span>
            <span className="text-xs font-bold text-purple-400">
              {profile.todayXp}/{profile.dailyGoalXp} XP
            </span>
          </div>
          <div className="xp-bar-track mb-3">
            <div className="xp-bar-fill" style={{ width: `${goalPct}%` }} />
          </div>
          <div className="flex items-center justify-between">
            <span className="streak-badge text-xs">
              <Flame size={12} />
              {profile.streak} day streak
            </span>
            <span className="flex items-center gap-1 text-xs font-bold text-amber-400">
              <Zap size={12} />
              {profile.totalXp.toLocaleString()} XP
            </span>
          </div>
        </div>
      )}
    </aside>
  );
}
