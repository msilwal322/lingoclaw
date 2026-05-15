"use client";

import AppShell from "@/components/AppShell";
import { type CompatibilityFamily, type ModelCapability, type ModelRole, type ProviderConfig, type ProviderModel, ALL_CAPABILITIES, COMPATIBILITY_FAMILIES, PROVIDER_STATUSES } from "@/lib/providers";
import { api } from "@/lib/api";
import { Check, ChevronDown, ChevronUp, Plus, RotateCcw, Save, Settings2, SlidersHorizontal, Trash2, X } from "lucide-react";
import { useEffect, useReducer, useState } from "react";

// ── small helpers ─────────────────────────────────────────────────────────────

function CapBadge({ cap }: { cap: ModelCapability }) {
  const colours: Record<ModelCapability, string> = {
    chat: "text-[#9a9898] border-white/15",
    realtime: "text-[#30d158] border-[#30d158]/40",
    tts: "text-[#0a84ff] border-[#0a84ff]/40",
    stt: "text-[#ffd60a] border-[#ffd60a]/40",
  };
  return (
    <span className={`text-[10px] border rounded px-1.5 py-0.5 ${colours[cap]}`}>{cap}</span>
  );
}

function modelHasCap(model: ProviderModel | undefined, cap: ModelCapability) {
  return model?.capabilities.includes(cap) ?? false;
}

// ── Add-provider modal ────────────────────────────────────────────────────────

type AddProviderForm = { name: string; compatibilityFamily: CompatibilityFamily; baseUrl: string; apiKeyRef: string; apiVersion: string; status: ProviderConfig["status"]; notes: string };
const emptyProviderForm = (): AddProviderForm => ({ name: "", compatibilityFamily: "openai-compatible", baseUrl: "", apiKeyRef: "", apiVersion: "", status: "needs-key", notes: "" });

function AddProviderModal({ onClose, onCreated }: { onClose: () => void; onCreated: (p: ProviderConfig) => void }) {
  const [form, setForm] = useState<AddProviderForm>(emptyProviderForm());
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setErr("Name is required"); return; }
    setSaving(true);
    setErr(null);
    try {
      const id = form.name.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      const created = await api.createProvider({
        ...form,
        id,
        apiKeyRef: form.apiKeyRef || null,
        apiVersion: form.apiVersion || null,
        models: [],
      });
      onCreated(created);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to create provider");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={submit} className="w-full max-w-lg bg-[#1a1717] border border-white/15 rounded-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-sm">Add provider</h2>
          <button type="button" onClick={onClose}><X size={15} /></button>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <label className="text-[11px] text-[#9a9898]">
            name *
            <input required className="mt-1 w-full bg-[#201d1d] border border-white/10 rounded px-3 py-2 text-[#fdfcfc] text-sm" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </label>
          <label className="text-[11px] text-[#9a9898]">
            compatibility family
            <select className="mt-1 w-full bg-[#201d1d] border border-white/10 rounded px-3 py-2 text-sm" value={form.compatibilityFamily} onChange={(e) => setForm((f) => ({ ...f, compatibilityFamily: e.target.value as CompatibilityFamily }))}>
              {COMPATIBILITY_FAMILIES.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </label>
          <label className="text-[11px] text-[#9a9898] sm:col-span-2">
            base URL
            <input className="mt-1 w-full bg-[#201d1d] border border-white/10 rounded px-3 py-2 text-[#fdfcfc] text-sm" placeholder="https://…" value={form.baseUrl} onChange={(e) => setForm((f) => ({ ...f, baseUrl: e.target.value }))} />
          </label>
          <label className="text-[11px] text-[#9a9898]">
            api key ref <span className="text-[#9a9898]/60">(env var name or literal)</span>
            <input className="mt-1 w-full bg-[#201d1d] border border-white/10 rounded px-3 py-2 text-[#fdfcfc] text-sm" placeholder="MY_API_KEY or none" value={form.apiKeyRef} onChange={(e) => setForm((f) => ({ ...f, apiKeyRef: e.target.value }))} />
          </label>
          <label className="text-[11px] text-[#9a9898]">
            api version <span className="text-[#9a9898]/60">(optional)</span>
            <input className="mt-1 w-full bg-[#201d1d] border border-white/10 rounded px-3 py-2 text-[#fdfcfc] text-sm" placeholder="e.g. 2025-04-01-preview" value={form.apiVersion} onChange={(e) => setForm((f) => ({ ...f, apiVersion: e.target.value }))} />
          </label>
          <label className="text-[11px] text-[#9a9898]">
            status
            <select className="mt-1 w-full bg-[#201d1d] border border-white/10 rounded px-3 py-2 text-sm" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as ProviderConfig["status"] }))}>
              {PROVIDER_STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>
          <label className="text-[11px] text-[#9a9898] sm:col-span-2">
            notes
            <textarea className="mt-1 w-full bg-[#201d1d] border border-white/10 rounded px-3 py-2 text-[#fdfcfc] text-sm resize-none" rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
          </label>
        </div>

        {err && <p className="text-xs text-[#ff9f0a]">{err}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="border border-white/15 rounded px-4 py-2 text-sm hover:bg-[#302c2c]">cancel</button>
          <button type="submit" disabled={saving} className="border border-white/15 rounded px-4 py-2 text-sm bg-[#fdfcfc] text-[#201d1d] hover:bg-[#f1eeee] disabled:opacity-50">
            {saving ? "creating…" : "create"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Add-model modal ───────────────────────────────────────────────────────────

function AddModelModal({ providerId, onClose, onAdded }: { providerId: string; onClose: () => void; onAdded: (m: ProviderModel) => void }) {
  const [name, setName] = useState("");
  const [caps, setCaps] = useState<Set<ModelCapability>>(new Set(["chat"]));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function toggleCap(c: ModelCapability) {
    setCaps((prev) => { const n = new Set(prev); n.has(c) ? n.delete(c) : n.add(c); return n; });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setErr("Model name is required"); return; }
    setSaving(true);
    setErr(null);
    try {
      const model = await api.addModel(providerId, { name: name.trim(), capabilities: [...caps] });
      onAdded(model);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to add model");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={submit} className="w-full max-w-sm bg-[#1a1717] border border-white/15 rounded-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-sm">Add model to <code className="text-[#9a9898]">{providerId}</code></h2>
          <button type="button" onClick={onClose}><X size={15} /></button>
        </div>
        <label className="text-[11px] text-[#9a9898] block">
          model name *
          <input required className="mt-1 w-full bg-[#201d1d] border border-white/10 rounded px-3 py-2 text-[#fdfcfc] text-sm" placeholder="gpt-4.1-mini" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <div>
          <div className="text-[11px] text-[#9a9898] mb-2">capabilities</div>
          <div className="flex flex-wrap gap-2">
            {ALL_CAPABILITIES.map((c) => (
              <button key={c} type="button" onClick={() => toggleCap(c)}
                className={`text-xs border rounded px-2 py-1 transition-colors ${caps.has(c) ? "border-[#fdfcfc] text-[#fdfcfc] bg-white/10" : "border-white/15 text-[#9a9898]"}`}>
                {c}
              </button>
            ))}
          </div>
        </div>
        {err && <p className="text-xs text-[#ff9f0a]">{err}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="border border-white/15 rounded px-4 py-2 text-sm hover:bg-[#302c2c]">cancel</button>
          <button type="submit" disabled={saving} className="border border-white/15 rounded px-4 py-2 text-sm bg-[#fdfcfc] text-[#201d1d] hover:bg-[#f1eeee] disabled:opacity-50">
            {saving ? "adding…" : "add model"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

type ModalState =
  | { kind: "none" }
  | { kind: "add-provider" }
  | { kind: "add-model"; providerId: string };

export default function ProvidersPage() {
  const [providers, setProviders] = useState<ProviderConfig[]>([]);
  const [roles, setRoles] = useState<ModelRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>({ kind: "none" });
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  // track inline edits to provider fields (persisted on save)
  const [providerEdits, setProviderEdits] = useReducer(
    (state: Record<string, Partial<ProviderConfig>>, action: { id: string; patch: Partial<ProviderConfig> }) => ({
      ...state,
      [action.id]: { ...(state[action.id] ?? {}), ...action.patch },
    }),
    {},
  );

  useEffect(() => {
    Promise.all([api.providers(), api.roles()])
      .then(([p, r]) => { setProviders(p); setRoles(r); })
      .catch((e) => setLoadError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  function toggleExpanded(id: string) {
    setExpanded((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  function patchProvider(id: string, patch: Partial<ProviderConfig>) {
    setProviderEdits({ id, patch });
    setProviders((prev) => prev.map((p) => p.id === id ? { ...p, ...patch } : p));
  }

  function patchRole(id: string, patch: Partial<ModelRole>) {
    setRoles((prev) => prev.map((r) => r.id === id ? { ...r, ...patch } : r));
  }

  async function saveAll() {
    setSaveError(null);
    try {
      // Save all providers
      await Promise.all(providers.map((p) => {
        const edits = providerEdits[p.id] ?? {};
        return api.updateProvider(p.id, edits);
      }));
      await api.saveRoles(roles);
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Save failed");
    }
  }

  async function reload() {
    setLoading(true);
    setLoadError(null);
    try {
      const [p, r] = await Promise.all([api.providers(), api.roles()]);
      setProviders(p);
      setRoles(r);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Reload failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteProvider(id: string) {
    if (!confirm(`Delete provider "${id}" and all its models? Roles will be unassigned.`)) return;
    try {
      await api.deleteProvider(id);
      setProviders((prev) => prev.filter((p) => p.id !== id));
      // Clear any roles that referenced this provider
      setRoles((prev) => prev.map((r) => r.providerId === id ? { ...r, providerId: null, modelId: null, model: null } : r));
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Delete failed");
    }
  }

  async function handleDeleteModel(providerId: string, modelId: string) {
    try {
      const res = await api.deleteModel(providerId, modelId);
      setProviders((prev) => prev.map((p) => p.id !== providerId ? p : { ...p, models: p.models.filter((m) => m.id !== modelId) }));
      if (res.unassignedRoles.length > 0) {
        setRoles((prev) => prev.map((r) => res.unassignedRoles.includes(r.id) ? { ...r, modelId: null, model: null } : r));
      }
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Model delete failed");
    }
  }

  function handleRoleProviderChange(roleId: string, newProviderId: string) {
    const provider = providers.find((p) => p.id === newProviderId);
    const firstModel = provider?.models[0];
    patchRole(roleId, {
      providerId: newProviderId,
      modelId: firstModel?.id ?? null,
      model: firstModel?.name ?? null,
    });
  }

  function handleRoleModelChange(roleId: string, modelId: string) {
    const model = providers.flatMap((p) => p.models).find((m) => m.id === modelId);
    patchRole(roleId, { modelId, model: model?.name ?? null });
  }

  if (loading) return (
    <AppShell>
      <main className="min-h-screen bg-[#201d1d] text-[#fdfcfc] font-mono px-5 md:px-10 py-8 flex items-center justify-center">
        <p className="text-sm text-[#9a9898]">Loading…</p>
      </main>
    </AppShell>
  );

  if (loadError) return (
    <AppShell>
      <main className="min-h-screen bg-[#201d1d] text-[#fdfcfc] font-mono px-5 md:px-10 py-8 flex items-center justify-center">
        <p className="text-sm text-[#ff9f0a]">Error: {loadError}</p>
      </main>
    </AppShell>
  );

  return (
    <AppShell>
      {modal.kind === "add-provider" && (
        <AddProviderModal
          onClose={() => setModal({ kind: "none" })}
          onCreated={(p) => { setProviders((prev) => [...prev, p]); setModal({ kind: "none" }); }}
        />
      )}
      {modal.kind === "add-model" && (
        <AddModelModal
          providerId={modal.providerId}
          onClose={() => setModal({ kind: "none" })}
          onAdded={(m) => {
            setProviders((prev) => prev.map((p) => p.id !== modal.providerId ? p : { ...p, models: [...p.models, m] }));
            setModal({ kind: "none" });
          }}
        />
      )}

      <main className="min-h-screen bg-[#201d1d] text-[#fdfcfc] font-mono px-5 md:px-10 py-8">
        <div className="max-w-7xl mx-auto">
          <header className="flex flex-wrap items-start justify-between gap-4 mb-6">
            <div>
              <div className="text-xs text-[#9a9898] mb-2">settings / providers</div>
              <h1 className="text-3xl md:text-4xl font-bold">Provider and model routing</h1>
              <p className="text-[#9a9898] mt-3 max-w-2xl leading-relaxed">
                Assign AI providers to language-learning roles. Models carry capability tags (chat, realtime, tts, stt) that govern role routing. Only env var names are stored, never raw API keys.
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="flex gap-2">
                <button onClick={reload} className="border border-white/15 rounded px-4 py-2 text-sm hover:bg-[#302c2c] inline-flex items-center gap-2">
                  <RotateCcw size={14} /> reload
                </button>
                <button onClick={saveAll} className="border border-white/15 rounded px-4 py-2 text-sm bg-[#fdfcfc] text-[#201d1d] hover:bg-[#f1eeee] inline-flex items-center gap-2">
                  {saved ? <Check size={14} /> : <Save size={14} />} {saved ? "saved" : "save all"}
                </button>
              </div>
              {saveError && <p className="text-xs text-[#ff9f0a]">{saveError}</p>}
            </div>
          </header>

          <div className="mb-6 border border-white/10 rounded bg-[#252121] p-4">
            <div className="text-sm font-bold mb-2">Capability tags</div>
            <div className="flex flex-wrap gap-3 text-xs text-[#9a9898]">
              <span><CapBadge cap="chat" /> — standard LLM chat completions</span>
              <span><CapBadge cap="realtime" /> — WebRTC voice streaming (required for voice-talk realtime)</span>
              <span><CapBadge cap="tts" /> — text-to-speech synthesis</span>
              <span><CapBadge cap="stt" /> — speech-to-text transcription</span>
            </div>
          </div>

          <div className="grid xl:grid-cols-[1fr_1.15fr] gap-5">
            {/* ── Providers panel ───────────────────────────────────────── */}
            <div className="border border-white/10 rounded bg-[#161414] overflow-hidden">
              <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2 text-sm font-bold">
                <Settings2 size={15} /> providers
              </div>

              <div className="divide-y divide-white/10">
                {providers.map((provider) => {
                  const open = expanded.has(provider.id);
                  return (
                    <div key={provider.id} className="p-4 space-y-3">
                      {/* Header row */}
                      <div className="flex items-center justify-between gap-2">
                        <button className="flex-1 flex items-center gap-2 text-left" onClick={() => toggleExpanded(provider.id)}>
                          <span className="font-bold text-sm flex-1">{provider.name}</span>
                          <span className="text-[10px] border border-white/15 rounded px-1.5 py-0.5 text-[#9a9898]">{provider.compatibilityFamily}</span>
                          {open ? <ChevronUp size={13} className="text-[#9a9898]" /> : <ChevronDown size={13} className="text-[#9a9898]" />}
                        </button>
                        <select
                          className="bg-[#201d1d] border border-white/15 rounded px-2 py-1 text-[11px]"
                          value={provider.status}
                          onChange={(e) => patchProvider(provider.id, { status: e.target.value as ProviderConfig["status"] })}
                        >
                          {PROVIDER_STATUSES.map((s) => <option key={s}>{s}</option>)}
                        </select>
                        <button className="text-[#9a9898] hover:text-[#ff453a]" title="Delete provider" onClick={() => handleDeleteProvider(provider.id)}>
                          <Trash2 size={13} />
                        </button>
                      </div>

                      {/* Expanded edit fields */}
                      {open && (
                        <div className="space-y-2 pt-1">
                          <div className="grid sm:grid-cols-2 gap-2">
                            <label className="text-[11px] text-[#9a9898]">
                              name
                              <input className="mt-1 w-full bg-[#201d1d] border border-white/10 rounded px-3 py-2 text-[#fdfcfc] text-sm" value={provider.name} onChange={(e) => patchProvider(provider.id, { name: e.target.value })} />
                            </label>
                            <label className="text-[11px] text-[#9a9898]">
                              compatibility family
                              <select className="mt-1 w-full bg-[#201d1d] border border-white/10 rounded px-3 py-2 text-sm" value={provider.compatibilityFamily} onChange={(e) => patchProvider(provider.id, { compatibilityFamily: e.target.value as CompatibilityFamily })}>
                                {COMPATIBILITY_FAMILIES.map((f) => <option key={f} value={f}>{f}</option>)}
                              </select>
                            </label>
                            <label className="text-[11px] text-[#9a9898] sm:col-span-2">
                              base URL
                              <input className="mt-1 w-full bg-[#201d1d] border border-white/10 rounded px-3 py-2 text-[#fdfcfc] text-sm" value={provider.baseUrl} onChange={(e) => patchProvider(provider.id, { baseUrl: e.target.value })} />
                            </label>
                            <label className="text-[11px] text-[#9a9898]">
                              api key ref
                              <input className="mt-1 w-full bg-[#201d1d] border border-white/10 rounded px-3 py-2 text-[#fdfcfc] text-sm" value={provider.apiKeyRef ?? ""} onChange={(e) => patchProvider(provider.id, { apiKeyRef: e.target.value || null })} />
                            </label>
                            <label className="text-[11px] text-[#9a9898]">
                              api version <span className="text-[#9a9898]/60">(optional)</span>
                              <input className="mt-1 w-full bg-[#201d1d] border border-white/10 rounded px-3 py-2 text-[#fdfcfc] text-sm" placeholder="leave blank for default" value={provider.apiVersion ?? ""} onChange={(e) => patchProvider(provider.id, { apiVersion: e.target.value || null })} />
                            </label>
                            <label className="text-[11px] text-[#9a9898] sm:col-span-2">
                              notes
                              <textarea className="mt-1 w-full bg-[#201d1d] border border-white/10 rounded px-3 py-2 text-[#fdfcfc] text-sm resize-none" rows={2} value={provider.notes} onChange={(e) => patchProvider(provider.id, { notes: e.target.value })} />
                            </label>
                          </div>
                        </div>
                      )}

                      {/* Models */}
                      <div>
                        <div className="text-[11px] text-[#9a9898] mb-1">models</div>
                        <div className="flex flex-wrap gap-2">
                          {provider.models.map((m) => (
                            <div key={m.id} className="flex items-center gap-1 border border-white/10 rounded px-2 py-1 group">
                              <span className="text-[11px]">{m.name}</span>
                              <div className="flex gap-1 ml-1">
                                {m.capabilities.map((c) => <CapBadge key={c} cap={c} />)}
                              </div>
                              <button
                                className="ml-1 text-[#9a9898] opacity-0 group-hover:opacity-100 hover:text-[#ff453a] transition-opacity"
                                title="Delete model"
                                onClick={() => handleDeleteModel(provider.id, m.id)}
                              >
                                <X size={11} />
                              </button>
                            </div>
                          ))}
                          <button
                            className="text-[11px] border border-dashed border-white/15 rounded px-2 py-1 text-[#9a9898] hover:text-[#fdfcfc] hover:border-white/30 inline-flex items-center gap-1"
                            onClick={() => setModal({ kind: "add-model", providerId: provider.id })}
                          >
                            <Plus size={10} /> model
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-4 border-t border-white/10">
                <button
                  className="border border-dashed border-white/15 rounded px-4 py-2 text-sm text-[#9a9898] hover:text-[#fdfcfc] hover:border-white/30 inline-flex items-center gap-2 w-full justify-center"
                  onClick={() => setModal({ kind: "add-provider" })}
                >
                  <Plus size={14} /> add provider
                </button>
              </div>
            </div>

            {/* ── Role routing panel ────────────────────────────────────── */}
            <div className="border border-white/10 rounded bg-[#161414] overflow-hidden">
              <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2 text-sm font-bold">
                <SlidersHorizontal size={15} /> role routing
              </div>
              <div className="divide-y divide-white/10">
                {roles.map((role) => {
                  const selectedProvider = providers.find((p) => p.id === role.providerId);
                  const selectedModel = selectedProvider?.models.find((m) => m.id === role.modelId);
                  const isVoiceRole = ["stt", "voice-talk", "tts"].includes(role.id);
                  const isRealtimeCapable = modelHasCap(selectedModel, "realtime");

                  return (
                    <div key={role.id} className="p-4 grid lg:grid-cols-[180px_1fr] gap-4">
                      <div>
                        <div className="font-bold text-sm mb-1 flex items-center gap-2">
                          {role.label}
                          {isVoiceRole && <span className="text-[10px] border border-white/15 rounded px-1.5 py-0.5 text-[#9a9898]">voice</span>}
                        </div>
                        <p className="text-xs text-[#9a9898] leading-relaxed">{role.purpose}</p>
                        {role.id === "voice-talk" && isRealtimeCapable && (
                          <div className="mt-2 text-[10px] text-[#30d158] border border-[#30d158]/30 rounded px-2 py-1">
                            ✓ realtime-capable model selected
                          </div>
                        )}
                        {role.id === "voice-talk" && selectedModel && !isRealtimeCapable && (
                          <div className="mt-2 text-[10px] text-[#ff9f0a] border border-[#ff9f0a]/30 rounded px-2 py-1">
                            ⚠ model lacks "realtime" capability
                          </div>
                        )}
                        {!selectedProvider && (
                          <div className="mt-2 text-[10px] text-[#9a9898] border border-white/10 rounded px-2 py-1">
                            no provider assigned
                          </div>
                        )}
                      </div>
                      <div className="grid sm:grid-cols-[1fr_1fr_90px_40px] gap-2 items-center">
                        {/* Provider picker */}
                        <select
                          className="bg-[#201d1d] border border-white/15 rounded px-3 py-2 text-sm"
                          value={role.providerId ?? ""}
                          onChange={(e) => handleRoleProviderChange(role.id, e.target.value)}
                        >
                          <option value="">— none —</option>
                          {providers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>

                        {/* Model picker */}
                        <select
                          className="bg-[#201d1d] border border-white/15 rounded px-3 py-2 text-sm"
                          value={role.modelId ?? ""}
                          onChange={(e) => handleRoleModelChange(role.id, e.target.value)}
                        >
                          <option value="">— none —</option>
                          {(selectedProvider?.models ?? []).map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name}{m.capabilities.length > 0 ? ` [${m.capabilities.join(",")}]` : ""}
                            </option>
                          ))}
                        </select>

                        {/* Temperature */}
                        <input
                          type="number" step="0.1" min="0" max="1"
                          className="bg-[#201d1d] border border-white/15 rounded px-3 py-2 text-sm"
                          value={role.temperature}
                          onChange={(e) => patchRole(role.id, { temperature: Number(e.target.value) })}
                        />

                        {/* Enable toggle */}
                        <button
                          title={role.enabled ? "Disable" : "Enable"}
                          onClick={() => patchRole(role.id, { enabled: !role.enabled })}
                          className={`rounded border px-2 py-1.5 text-xs ${role.enabled ? "border-[#30d158]/40 text-[#30d158]" : "border-white/15 text-[#9a9898]"}`}
                        >
                          {role.enabled ? "on" : "off"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </main>
    </AppShell>
  );
}
