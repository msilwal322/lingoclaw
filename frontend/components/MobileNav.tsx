"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Braces, Gauge, MessageCircle, Mic, Swords } from "lucide-react";

const NAV = [
  { href: "/", label: "Home", icon: Gauge },
  { href: "/providers", label: "Models", icon: Braces },
  { href: "/chat", label: "Chat", icon: MessageCircle },
  { href: "/voice", label: "Voice", icon: Mic },
  { href: "/practice", label: "Practice", icon: Swords },
];

export default function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex bg-[#201d1d] border-t border-white/10 font-mono">
      {NAV.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));
        return (
          <Link key={href} href={href} className={`flex-1 flex flex-col items-center gap-1 py-3 text-[11px] ${isActive ? "text-[#fdfcfc]" : "text-[#9a9898]"}`}>
            <Icon size={18} />{label}
          </Link>
        );
      })}
    </nav>
  );
}
