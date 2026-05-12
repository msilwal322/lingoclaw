"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, BookOpen, MessageCircle, Trophy, User } from "lucide-react";

const NAV = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/lesson/l3", label: "Lessons", icon: BookOpen },
  { href: "/chat", label: "Tutor", icon: MessageCircle },
  { href: "/leaderboard", label: "Ranks", icon: Trophy },
  { href: "/profile", label: "Profile", icon: User },
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex bg-surface border-t border-white/5">
      {NAV.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href || pathname.startsWith(`/${href.split("/")[1]}`);
        return (
          <Link
            key={href}
            href={href}
            className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
              isActive ? "text-purple-400" : "text-muted"
            }`}
          >
            <Icon size={20} className={isActive ? "text-purple-400" : ""} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
