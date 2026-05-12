"use client";

import AppShell from "@/components/AppShell";
import { getModelRoles, getProviders } from "@/lib/providers";
import { Mic, Radio, Volume2, Waves } from "lucide-react";
import { useEffect, useState } from "react";

export default function VoicePage() {
  const [lines, setLines] = useState<string[]>([]);

  useEffect(() => {
    const providers = getProviders();
    const roles = getModelRoles();
    const stt = roles.find((r) => r.id === "stt");
    const brain = roles.find((r) => r.id === "voice-talk");
    const tts = roles.find((r) => r.id === "tts");
    const providerName = (id?: string) => providers.find((p) => p.id === id)?.name ?? id;
    setLines([
      `stt: ${providerName(stt?.providerId)} / ${stt?.model}`,
      `brain: ${providerName(brain?.providerId)} / ${brain?.model}`,
      `tts: ${providerName(tts?.providerId)} / ${tts?.model}`,
    ]);
  }, []);

  return (
    <AppShell>
      <main className="min-h-screen bg-[#201d1d] text-[#fdfcfc] font-mono px-5 md:px-10 py-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-xs text-[#9a9898] mb-2">modules/voice-talk</div>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">Voice talk console</h1>
          <p className="text-[#9a9898] max-w-2xl mb-8">Prototype the loop for spoken practice: speech recognition, tutor model, then text-to-speech. No backend is wired yet; this screen shows how routing will feel.</p>

          <div className="grid lg:grid-cols-[1fr_340px] gap-5">
            <div className="border border-white/10 rounded bg-[#161414] overflow-hidden">
              <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2"><Radio size={15}/> session</div>
              <div className="p-6 min-h-[420px] flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="border border-white/10 rounded p-4 bg-[#201d1d]"><span className="text-[#9a9898]">you:</span> quiero practicar pedir comida en español</div>
                  <div className="border border-white/10 rounded p-4 bg-[#252121]"><span className="text-[#30d158]">tutor:</span> Perfecto. I’ll play the waiter. Answer in Spanish, and I’ll correct only the key mistakes.</div>
                </div>
                <button className="mt-8 w-full border border-white/15 bg-[#fdfcfc] text-[#201d1d] rounded px-5 py-4 font-bold inline-flex items-center justify-center gap-3"><Mic size={18}/> hold to speak</button>
              </div>
            </div>

            <aside className="space-y-4">
              <div className="border border-white/10 rounded bg-[#252121] p-4">
                <div className="flex items-center gap-2 font-bold mb-3"><Waves size={16}/> active pipeline</div>
                <div className="space-y-2">{lines.map((line) => <div key={line} className="text-xs border border-white/10 rounded bg-[#201d1d] px-3 py-2 text-[#9a9898]">{line}</div>)}</div>
              </div>
              <div className="border border-white/10 rounded bg-[#252121] p-4">
                <div className="flex items-center gap-2 font-bold mb-3"><Volume2 size={16}/> voice settings</div>
                <label className="text-xs text-[#9a9898]">target language<select className="mt-1 w-full bg-[#201d1d] border border-white/10 rounded px-3 py-2 text-[#fdfcfc]"><option>Spanish / es</option><option>Japanese / ja</option><option>French / fr</option></select></label>
                <label className="text-xs text-[#9a9898] block mt-3">correction style<select className="mt-1 w-full bg-[#201d1d] border border-white/10 rounded px-3 py-2 text-[#fdfcfc]"><option>minimal interruption</option><option>strict pronunciation</option><option>grammar coach</option></select></label>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </AppShell>
  );
}
