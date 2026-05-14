"use client";

import AppShell from "@/components/AppShell";
import { type ModelRole, type ProviderConfig } from "@/lib/providers";
import { api } from "@/lib/api";
import { ArrowRight, Braces, CheckCircle2, Code2, MessageCircle, Mic, Play, Terminal, Volume2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

const modules = [
  { href: "/providers", icon: Braces, title: "Configure providers", desc: "Map each language task to a model: chat, voice, translation, lesson generation, TTS, STT." },
  { href: "/chat", icon: MessageCircle, title: "Tutor chat", desc: "A model-routed conversation surface for corrections and grammar explanations." },
  { href: "/voice", icon: Mic, title: "Voice talk", desc: "A prototype console for STT → tutor brain → TTS voice loops." },
  { href: "/dashboard", icon: Play, title: "Generate lessons", desc: "Turn your provider setup into adaptive lessons and practice queues." },
];

function statusColor(status: ProviderConfig["status"]) {
  if (status === "local" || status === "connected") return "text-[#30d158]";
  if (status === "needs-key") return "text-[#ff9f0a]";
  return "text-[#9a9898]";
}

export default function WorkbenchPage() {
  const [providers, setProviders] = useState<ProviderConfig[]>([]);
  const [roles, setRoles] = useState<ModelRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.providers(), api.roles()])
      .then(([nextProviders, nextRoles]) => {
        setProviders(nextProviders);
        setRoles(nextRoles);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load providers"))
      .finally(() => setLoading(false));
  }, []);

  const active = providers.filter((p) => p.status === "local" || p.status === "connected").length;

  return (
    <AppShell>
      <div className="min-h-screen bg-[#201d1d] text-[#fdfcfc] font-mono">
        <section className="px-5 md:px-10 py-8 border-b border-white/10">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-10">
              <div>
                <div className="text-xs text-[#9a9898] mb-2">~/lingoclaw</div>
                <h1 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight">Open language learning workbench.</h1>
              </div>
              <Link href="/providers" className="inline-flex items-center gap-2 border border-white/15 bg-[#302c2c] hover:bg-[#3a3535] rounded px-4 py-3 text-sm">
                edit model routing <ArrowRight size={15} />
              </Link>
            </div>

            <div className="grid lg:grid-cols-[1.15fr_.85fr] gap-5">
              <div className="border border-white/10 rounded bg-[#161414] overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 text-xs text-[#9a9898]">
                  <Terminal size={14} /> lingoclaw init --local --providers
                </div>
                <div className="p-5 md:p-7 space-y-4 text-sm leading-relaxed">
                  <p><span className="text-[#30d158]">●</span> Bring your own models. Route different language-learning jobs to different providers.</p>
                  <p><span className="text-[#007aff]">◆</span> Use local models for private practice, cloud models for stronger feedback, and dedicated voice engines for speech.</p>
                  <p><span className="text-[#ff9f0a]">▲</span> No login wall. No fake learner metrics. Configure, learn, inspect, modify.</p>
                  {loading ? (
                    <div className="grid sm:grid-cols-3 gap-3 pt-4">
                      {["providers", "model roles", "local/ready"].map((label) => (
                        <div key={label} className="border border-white/10 rounded p-3"><div className="text-2xl font-bold text-[#9a9898]">—</div><div className="text-[#9a9898] text-xs">{label}</div></div>
                      ))}
                    </div>
                  ) : error ? (
                    <p className="text-xs text-[#ff9f0a] pt-4">Could not load provider data: {error}</p>
                  ) : (
                    <div className="grid sm:grid-cols-3 gap-3 pt-4">
                      <div className="border border-white/10 rounded p-3"><div className="text-2xl font-bold">{providers.length}</div><div className="text-[#9a9898] text-xs">providers</div></div>
                      <div className="border border-white/10 rounded p-3"><div className="text-2xl font-bold">{roles.length}</div><div className="text-[#9a9898] text-xs">model roles</div></div>
                      <div className="border border-white/10 rounded p-3"><div className="text-2xl font-bold">{active}</div><div className="text-[#9a9898] text-xs">local/ready</div></div>
                    </div>
                  )}
                </div>
              </div>

              <div className="border border-white/10 rounded bg-[#252121] p-4">
                <div className="flex items-center gap-2 text-sm font-bold mb-4"><CheckCircle2 size={16} /> Provider status</div>
                <div className="space-y-2">
                  {loading ? (
                    <p className="text-xs text-[#9a9898]">Loading...</p>
                  ) : error ? (
                    <p className="text-xs text-[#ff9f0a]">{error}</p>
                  ) : (
                    providers.slice(0, 5).map((provider) => (
                      <div key={provider.id} className="flex items-center justify-between gap-3 border border-white/10 rounded px-3 py-2 bg-[#201d1d]">
                        <div><div className="text-sm">{provider.name}</div><div className="text-[11px] text-[#9a9898]">{provider.kind} · {provider.models[0]}</div></div>
                        <div className={`text-xs ${statusColor(provider.status)}`}>{provider.status}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="px-5 md:px-10 py-8 max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
            {modules.map((module) => (
              <Link href={module.href} key={module.title} className="border border-white/10 rounded bg-[#252121] hover:bg-[#302c2c] p-5 transition-colors">
                <module.icon size={20} className="mb-5 text-[#fdfcfc]" />
                <h2 className="font-bold mb-2">{module.title}</h2>
                <p className="text-sm text-[#9a9898] leading-relaxed">{module.desc}</p>
              </Link>
            ))}
          </div>

          <div className="border border-white/10 rounded bg-[#161414] overflow-hidden">
            <div className="px-4 py-3 border-b border-white/10 text-sm flex items-center gap-2"><Code2 size={15} /> model role map</div>
            <div className="divide-y divide-white/10">
              {loading ? (
                <p className="p-4 text-xs text-[#9a9898]">Loading...</p>
              ) : error ? (
                <p className="p-4 text-xs text-[#ff9f0a]">{error}</p>
              ) : (
                roles.map((role) => {
                  const provider = providers.find((p) => p.id === role.providerId);
                  const Icon = role.id === "tts" ? Volume2 : role.id === "stt" || role.id === "voice-talk" ? Mic : MessageCircle;
                  return (
                    <div key={role.id} className="grid md:grid-cols-[220px_1fr_260px] gap-3 p-4 items-center">
                      <div className="flex items-center gap-3"><Icon size={16} /><span className="font-bold text-sm">{role.label}</span></div>
                      <p className="text-sm text-[#9a9898]">{role.purpose}</p>
                      <div className="text-xs border border-white/10 rounded px-3 py-2 bg-[#201d1d] truncate">{provider?.name ?? role.providerId} / {role.model}</div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
