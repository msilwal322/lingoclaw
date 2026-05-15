import { Injectable, Logger } from '@nestjs/common';
import Database from 'better-sqlite3';
import { existsSync, mkdirSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { seed } from '../seed-data';
import {
  CompatibilityFamily,
  ModelCapability,
  Provider,
  ProviderModel,
  ProviderWithModels,
  ProviderStatus,
  Role,
  RoleInput,
} from './types';

export function makeModelId(providerId: string, modelName: string): string {
  return `${providerId}:${modelName}`;
}

function inferCompatibilityFamily(providerId: string, kind?: string): CompatibilityFamily {
  if (providerId === 'anthropic' || kind === 'anthropic') return 'anthropic-compatible';
  return 'openai-compatible';
}

function inferCapabilities(modelName: string, providerKind?: string): ModelCapability[] {
  if (providerKind === 'tts') return ['tts'];
  if (providerKind === 'stt') return ['stt'];
  const lower = modelName.toLowerCase();
  if (lower.includes('realtime')) return ['chat', 'realtime'];
  return ['chat'];
}

@Injectable()
export class ProvidersStore {
  private readonly logger = new Logger(ProvidersStore.name);
  private db!: Database.Database;

  constructor() {
    this.open();
  }

  private open() {
    const dbPath = process.env.PROVIDERS_DB ?? join(process.cwd(), 'data', 'providers.db');
    mkdirSync(dirname(dbPath), { recursive: true });
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.migrate();
    this.seedIfEmpty();
  }

  private migrate() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS providers (
        id                  TEXT PRIMARY KEY,
        name                TEXT NOT NULL,
        compatibility_family TEXT NOT NULL DEFAULT 'openai-compatible',
        base_url            TEXT NOT NULL DEFAULT '',
        api_key_ref         TEXT,
        api_version         TEXT,
        status              TEXT NOT NULL DEFAULT 'needs-key',
        notes               TEXT NOT NULL DEFAULT ''
      );

      CREATE TABLE IF NOT EXISTS models (
        id          TEXT PRIMARY KEY,
        provider_id TEXT NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
        name        TEXT NOT NULL,
        capabilities TEXT NOT NULL DEFAULT '["chat"]',
        UNIQUE(provider_id, name)
      );

      CREATE TABLE IF NOT EXISTS roles (
        id          TEXT PRIMARY KEY,
        label       TEXT NOT NULL,
        purpose     TEXT NOT NULL DEFAULT '',
        provider_id TEXT REFERENCES providers(id) ON DELETE SET NULL,
        model_id    TEXT REFERENCES models(id) ON DELETE SET NULL,
        temperature REAL NOT NULL DEFAULT 0.7,
        enabled     INTEGER NOT NULL DEFAULT 1
      );
    `);
  }

  private seedIfEmpty() {
    const { c } = this.db.prepare('SELECT COUNT(*) as c FROM providers').get() as { c: number };
    if (c > 0) return;

    let legacyProviders: any[] = [];
    let legacyRoles: any[] = [];

    const dbPath = process.env.DATA_FILE ?? join(process.cwd(), 'data', 'db.json');
    if (existsSync(dbPath)) {
      try {
        const legacy = JSON.parse(readFileSync(dbPath, 'utf8'));
        legacyProviders = legacy.providers ?? [];
        legacyRoles = legacy.roles ?? [];
      } catch { /* fall through to seed */ }
    }

    if (legacyProviders.length === 0) {
      legacyProviders = seed.providers as any[];
      legacyRoles = seed.roles as any[];
    }

    this.importLegacy(legacyProviders, legacyRoles);
    this.logger.log(`Seeded SQLite from ${legacyProviders.length} legacy providers`);
  }

  private importLegacy(legacyProviders: any[], legacyRoles: any[]) {
    const insProvider = this.db.prepare(`
      INSERT OR IGNORE INTO providers (id, name, compatibility_family, base_url, api_key_ref, api_version, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insModel = this.db.prepare(`
      INSERT OR IGNORE INTO models (id, provider_id, name, capabilities)
      VALUES (?, ?, ?, ?)
    `);
    const insRole = this.db.prepare(`
      INSERT OR IGNORE INTO roles (id, label, purpose, provider_id, model_id, temperature, enabled)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    this.db.transaction(() => {
      for (const p of legacyProviders) {
        // Prefer the explicit field from new seed-data; fall back to inference for old db.json format
        const family: CompatibilityFamily = p.compatibilityFamily ?? inferCompatibilityFamily(p.id, p.kind);
        insProvider.run(
          p.id, p.name, family,
          p.baseUrl ?? '', p.apiKeyRef ?? null, p.apiVersion ?? null,
          p.status ?? 'needs-key', p.notes ?? '',
        );
        for (const entry of (p.models ?? [])) {
          // entry is either a plain string (old db.json) or {name, capabilities} (new seed / new db.json)
          let modelName: string;
          let caps: ModelCapability[];
          if (typeof entry === 'string') {
            modelName = entry;
            caps = inferCapabilities(modelName, p.kind);
          } else if (entry && typeof entry === 'object') {
            modelName = String(entry.name ?? '').trim();
            caps = Array.isArray(entry.capabilities) ? entry.capabilities : inferCapabilities(modelName, p.kind);
          } else {
            continue;
          }
          if (!modelName) continue;
          insModel.run(makeModelId(p.id, modelName), p.id, modelName, JSON.stringify(caps));
        }
      }
      for (const r of legacyRoles) {
        const mid = r.providerId && r.model ? makeModelId(r.providerId, r.model) : null;
        insRole.run(r.id, r.label ?? r.id, r.purpose ?? '', r.providerId ?? null, mid,
          r.temperature ?? 0.7, r.enabled !== false ? 1 : 0);
      }
    })();
  }

  // ── Providers ──────────────────────────────────────────────────────────────

  getProviders(): ProviderWithModels[] {
    const providers = this.db.prepare('SELECT * FROM providers ORDER BY rowid').all() as any[];
    const models = this.db.prepare('SELECT * FROM models ORDER BY rowid').all() as any[];
    return providers.map((p) => this.toProviderWithModels(p, models.filter((m) => m.provider_id === p.id)));
  }

  getProvider(id: string): Provider | undefined {
    const row = this.db.prepare('SELECT * FROM providers WHERE id = ?').get(id) as any;
    return row ? this.toProvider(row) : undefined;
  }

  upsertProvider(p: Provider): ProviderWithModels {
    this.db.prepare(`
      INSERT INTO providers (id, name, compatibility_family, base_url, api_key_ref, api_version, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name                 = excluded.name,
        compatibility_family = excluded.compatibility_family,
        base_url             = excluded.base_url,
        api_key_ref          = excluded.api_key_ref,
        api_version          = excluded.api_version,
        status               = excluded.status,
        notes                = excluded.notes
    `).run(p.id, p.name, p.compatibilityFamily, p.baseUrl, p.apiKeyRef ?? null,
      p.apiVersion ?? null, p.status, p.notes);
    return this.getProviders().find((x) => x.id === p.id)!;
  }

  deleteProvider(id: string): void {
    // ON DELETE CASCADE removes models; ON DELETE SET NULL clears role refs
    this.db.prepare('DELETE FROM providers WHERE id = ?').run(id);
  }

  // ── Models ─────────────────────────────────────────────────────────────────

  getModels(providerId?: string): ProviderModel[] {
    const rows = providerId
      ? (this.db.prepare('SELECT * FROM models WHERE provider_id = ? ORDER BY rowid').all(providerId) as any[])
      : (this.db.prepare('SELECT * FROM models ORDER BY rowid').all() as any[]);
    return rows.map(this.toModel);
  }

  getModel(id: string): ProviderModel | undefined {
    const row = this.db.prepare('SELECT * FROM models WHERE id = ?').get(id) as any;
    return row ? this.toModel(row) : undefined;
  }

  addModel(m: ProviderModel): ProviderModel {
    this.db.prepare(`
      INSERT INTO models (id, provider_id, name, capabilities)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET capabilities = excluded.capabilities
    `).run(m.id, m.providerId, m.name, JSON.stringify(m.capabilities));
    return this.getModel(m.id)!;
  }

  updateModelCapabilities(id: string, capabilities: ModelCapability[]): ProviderModel | undefined {
    const n = (this.db.prepare('UPDATE models SET capabilities = ? WHERE id = ?').run(JSON.stringify(capabilities), id) as any).changes;
    if (n === 0) return undefined;
    return this.getModel(id);
  }

  deleteModel(id: string): string[] {
    const affected = (this.db.prepare('SELECT id FROM roles WHERE model_id = ?').all(id) as any[]).map((r) => r.id);
    this.db.prepare('UPDATE roles SET model_id = NULL WHERE model_id = ?').run(id);
    this.db.prepare('DELETE FROM models WHERE id = ?').run(id);
    return affected;
  }

  getModelsByCapability(capability: ModelCapability): ProviderModel[] {
    // JSON_EACH would be ideal but LIKE suffices for our small set
    const rows = this.db
      .prepare(`SELECT * FROM models WHERE capabilities LIKE ? ORDER BY rowid`)
      .all(`%"${capability}"%`) as any[];
    return rows.map(this.toModel);
  }

  // ── Roles ──────────────────────────────────────────────────────────────────

  getRoles(): Role[] {
    const rows = this.db.prepare(`
      SELECT r.*, m.name AS model_name
      FROM roles r
      LEFT JOIN models m ON r.model_id = m.id
      ORDER BY r.rowid
    `).all() as any[];
    return rows.map(this.toRole);
  }

  getRole(id: string): Role | undefined {
    const row = this.db.prepare(`
      SELECT r.*, m.name AS model_name
      FROM roles r
      LEFT JOIN models m ON r.model_id = m.id
      WHERE r.id = ?
    `).get(id) as any;
    return row ? this.toRole(row) : undefined;
  }

  upsertRole(input: RoleInput): Role {
    const mid = this.resolveModelId(input);
    this.db.prepare(`
      INSERT INTO roles (id, label, purpose, provider_id, model_id, temperature, enabled)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        label       = excluded.label,
        purpose     = excluded.purpose,
        provider_id = excluded.provider_id,
        model_id    = excluded.model_id,
        temperature = excluded.temperature,
        enabled     = excluded.enabled
    `).run(input.id, input.label, input.purpose,
      input.providerId ?? null, mid,
      input.temperature, input.enabled ? 1 : 0);
    return this.getRole(input.id)!;
  }

  saveRoles(inputs: RoleInput[]): Role[] {
    this.db.transaction(() => { inputs.forEach((r) => this.upsertRole(r)); })();
    return this.getRoles();
  }

  private resolveModelId(input: RoleInput): string | null {
    if (input.modelId) return input.modelId;
    if (input.model && input.providerId) {
      const id = makeModelId(input.providerId, input.model);
      // Only use if model actually exists in the DB
      const exists = this.db.prepare('SELECT 1 FROM models WHERE id = ?').get(id);
      if (exists) return id;
    }
    return null;
  }

  // ── Row mappers ────────────────────────────────────────────────────────────

  private toProvider(row: any): Provider {
    return {
      id: row.id,
      name: row.name,
      compatibilityFamily: row.compatibility_family as CompatibilityFamily,
      baseUrl: row.base_url,
      apiKeyRef: row.api_key_ref ?? null,
      apiVersion: row.api_version ?? null,
      status: row.status as ProviderStatus,
      notes: row.notes,
    };
  }

  private toProviderWithModels(pRow: any, mRows: any[]): ProviderWithModels {
    return { ...this.toProvider(pRow), models: mRows.map(this.toModel) };
  }

  private toModel(row: any): ProviderModel {
    return {
      id: row.id,
      providerId: row.provider_id,
      name: row.name,
      capabilities: JSON.parse(row.capabilities) as ModelCapability[],
    };
  }

  private toRole(row: any): Role {
    return {
      id: row.id,
      label: row.label,
      purpose: row.purpose,
      providerId: row.provider_id ?? null,
      modelId: row.model_id ?? null,
      model: row.model_name ?? null,
      temperature: row.temperature,
      enabled: Boolean(row.enabled),
    };
  }
}
