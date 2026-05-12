"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookMarked, Bot, Braces, Gauge, Languages, MessageCircle, Mic, Settings, Swords } from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Workbench", icon: Gauge },
  { href: "/providers", label: "Providers", icon: Braces },
  { href: "/chat", label: "Tutor chat", icon: MessageCircle },
  { href: "/voice", label: "Voice talk", icon: Mic },
  { href: "/dashboard", label: "Learn graph", icon: Languages },
  { href: "/practice", label: "Practice", icon: Swords },
  { href: "/stories", label: "Stories", icon: BookMarked },
  { href: "/profile", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-72 min-h-screen bg-[#201d1d] border-r border-white/10 p-4 gap-2 fixed left-0 top-0 z-40 font-mono">
      <Link href="/" className="px-3 py-3 mb-3 border border-white/10 rounded bg-[#252121]">
        <div className="flex items-center gap-2 text-[#fdfcfc] font-bold"><Bot size={18} /> LingoClaw</div>
        <div className="text-[11px] text-[#9a9898] mt-1">open language workbench</div>
      </Link>

      <nav className="flex-1 flex flex-col gap-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link key={href} href={href} className={`flex items-center gap-3 px-3 py-2.5 rounded text-sm transition-colors border ${isActive ? "text-[#fdfcfc] bg-[#302c2c] border-white/15" : "text-[#9a9898] border-transparent hover:text-[#fdfcfc] hover:bg-[#252121]"}`}>
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border border-white/10 rounded p-3 text-xs text-[#9a9898] bg-[#252121] leading-relaxed">
        <div className="text-[#30d158] mb-1">● local-first</div>
        Keys stay in your environment. This UI stores mock provider routing in localStorage only.
      </div>
    </aside>
  );
}
