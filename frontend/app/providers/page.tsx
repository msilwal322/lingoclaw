"use client";

import AppShell from "@/components/AppShell";
import { DEFAULT_PROVIDERS, DEFAULT_ROLES, getModelRoles, getProviders, saveModelRoles, saveProviders, type ModelRole, type ProviderConfig } from "@/lib/providers";
import { api } from "@/lib/api";
import { Check, Plus, RotateCcw, Save, Settings2, SlidersHorizontal } from "lucide-react";
import { useEffect, useState } from "react";

const statuses: ProviderConfig["status"][] = ["local", "connected", "needs-key", "disabled"];

export default function ProvidersPage() {
  const [providers, setProviders] = useState<ProviderConfig[]>(DEFAULT_PROVIDERS);
  const [roles, setRoles] = useState<ModelRole[]>(DEFAULT_ROLES);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    Promise.all([api.providers(), api.roles()])
      .then(([nextProviders, nextRoles]) => {
        setProviders(nextProviders);
        setRoles(nextRoles);
      })
      .catch(() => {
        setProviders(getProviders());
        setRoles(getModelRoles());
      });
  }, []);

  function updateProvider(id: string, patch: Partial<ProviderConfig>) {
    setProviders((items) => items.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  function updateRole(id: string, patch: Partial<ModelRole>) {
    setRoles((items) => items.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  async function saveAll() {
    await Promise.all([api.saveProviders(providers), api.saveRoles(roles)]).catch(() => {
      saveProviders(providers);
      saveModelRoles(roles);
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }

  function resetAll() {
    setProviders(DEFAULT_PROVIDERS);
    setRoles(DEFAULT_ROLES);
    void Promise.all([api.saveProviders(DEFAULT_PROVIDERS), api.saveRoles(DEFAULT_ROLES)]).catch(() => {
      saveProviders(DEFAULT_PROVIDERS);
      saveModelRoles(DEFAULT_ROLES);
    });
  }

  return (
    <AppShell>
      <main className="min-h-screen bg-[#201d1d] text-[#fdfcfc] font-mono px-5 md:px-10 py-8">
        <div className="max-w-7xl mx-auto">
          <header className="flex flex-wrap items-start justify-between gap-4 mb-8">
            <div>
              <div className="text-xs text-[#9a9898] mb-2">settings/providers.toml</div>
              <h1 className="text-3xl md:text-4xl font-bold">Provider and model routing</h1>
              <p className="text-[#9a9898] mt-3 max-w-2xl leading-relaxed">Assign different AI providers to different language-learning jobs. Saved through the local Nest backend; only environment variable names are stored, never raw API keys.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={resetAll} className="border border-white/15 rounded px-4 py-2 text-sm hover:bg-[#302c2c] inline-flex items-center gap-2"><RotateCcw size={14}/> reset</button>
              <button onClick={saveAll} className="border border-white/15 rounded px-4 py-2 text-sm bg-[#fdfcfc] text-[#201d1d] hover:bg-[#f1eeee] inline-flex items-center gap-2">{saved ? <Check size={14}/> : <Save size={14}/>} {saved ? "saved" : "save backend"}</button>
            </div>
          </header>

          <section className="grid xl:grid-cols-[1fr_1.15fr] gap-5">
            <div className="border border-white/10 rounded bg-[#161414] overflow-hidden">
              <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2 text-sm font-bold"><Settings2 size={15}/> providers</div>
              <div className="divide-y divide-white/10">
                {providers.map((provider) => (
                  <div key={provider.id} className="p-4 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <input className="bg-transparent font-bold outline-none flex-1" value={provider.name} onChange={(e) => updateProvider(provider.id, { name: e.target.value })} />
                      <select className="bg-[#201d1d] border border-white/15 rounded px-2 py-1 text-xs" value={provider.status} onChange={(e) => updateProvider(provider.id, { status: e.target.value as ProviderConfig["status"] })}>
                        {statuses.map((s) => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-2">
                      <label className="text-[11px] text-[#9a9898]">base url<input className="mt-1 w-full bg-[#201d1d] border border-white/10 rounded px-3 py-2 text-[#fdfcfc]" value={provider.baseUrl} onChange={(e) => updateProvider(provider.id, { baseUrl: e.target.value })} /></label>
                      <label className="text-[11px] text-[#9a9898]">api key env/ref<input className="mt-1 w-full bg-[#201d1d] border border-white/10 rounded px-3 py-2 text-[#fdfcfc]" value={provider.apiKeyRef} onChange={(e) => updateProvider(provider.id, { apiKeyRef: e.target.value })} /></label>
                    </div>
                    <p className="text-xs text-[#9a9898] leading-relaxed">{provider.notes}</p>
                    <div className="flex flex-wrap gap-2">{provider.models.map((m) => <span key={m} className="text-[11px] border border-white/10 rounded px-2 py-1 text-[#9a9898]">{m}</span>)}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border border-white/10 rounded bg-[#161414] overflow-hidden">
              <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2 text-sm font-bold"><SlidersHorizontal size={15}/> role routing</div>
              <div className="divide-y divide-white/10">
                {roles.map((role) => {
                  const selectedProvider = providers.find((p) => p.id === role.providerId) ?? providers[0];
                  return (
                    <div key={role.id} className="p-4 grid lg:grid-cols-[180px_1fr] gap-4">
                      <div>
                        <div className="font-bold text-sm mb-1">{role.label}</div>
                        <p className="text-xs text-[#9a9898] leading-relaxed">{role.purpose}</p>
                      </div>
                      <div className="grid sm:grid-cols-[1fr_1fr_90px] gap-2">
                        <select className="bg-[#201d1d] border border-white/15 rounded px-3 py-2 text-sm" value={role.providerId} onChange={(e) => updateRole(role.id, { providerId: e.target.value, model: (providers.find((p) => p.id === e.target.value)?.models[0] ?? role.model) })}>
                          {providers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        <select className="bg-[#201d1d] border border-white/15 rounded px-3 py-2 text-sm" value={role.model} onChange={(e) => updateRole(role.id, { model: e.target.value })}>
                          {selectedProvider.models.map((m) => <option key={m}>{m}</option>)}
                        </select>
                        <input type="number" step="0.1" min="0" max="1" className="bg-[#201d1d] border border-white/15 rounded px-3 py-2 text-sm" value={role.temperature} onChange={(e) => updateRole(role.id, { temperature: Number(e.target.value) })} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <button className="mt-5 border border-dashed border-white/15 rounded px-4 py-3 text-sm text-[#9a9898] hover:text-[#fdfcfc] inline-flex items-center gap-2"><Plus size={14}/> add provider placeholder</button>
        </div>
      </main>
    </AppShell>
  );
}
