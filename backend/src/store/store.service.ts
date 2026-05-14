import { Injectable } from '@nestjs/common';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { seed } from '../seed-data';

@Injectable()
export class StoreService {
  private readonly path = process.env.DATA_FILE ?? join(process.cwd(), 'data', 'db.json');
  private data: any;

  constructor(){ this.load(); }

  private mergeById(existing: any[] = [], defaults: any[] = []) {
    const byId = new Map(existing.map((item) => [item.id, item]));
    let changed = false;
    for (const item of defaults) {
      if (!byId.has(item.id)) {
        existing.push(structuredClone(item));
        changed = true;
      }
    }
    return changed;
  }

  private hydrateMissingDefaults() {
    if (!this.data.providers) this.data.providers = [];
    if (!this.data.roles) this.data.roles = [];

    const providersChanged = this.mergeById(this.data.providers, seed.providers as any[]);
    const rolesChanged = this.mergeById(this.data.roles, seed.roles as any[]);

    let providerFieldsChanged = false;
    for (const existing of this.data.providers as any[]) {
      const seeded = (seed.providers as any[]).find((item) => item.id === existing.id);
      if (!seeded) continue;

      const mergedModels = Array.from(new Set([...(existing.models ?? []), ...(seeded.models ?? [])]));
      if (JSON.stringify(mergedModels) !== JSON.stringify(existing.models ?? [])) {
        existing.models = mergedModels;
        providerFieldsChanged = true;
      }

      if (!existing.notes && seeded.notes) {
        existing.notes = seeded.notes;
        providerFieldsChanged = true;
      }
      if (!existing.kind && seeded.kind) {
        existing.kind = seeded.kind;
        providerFieldsChanged = true;
      }
    }

    let practiceChanged = false;
    if (!this.data.practiceContent) {
      this.data.practiceContent = structuredClone(seed.practiceContent);
      practiceChanged = true;
    }

    if (providersChanged || rolesChanged || providerFieldsChanged || practiceChanged) this.save();
  }

  private load(){
    mkdirSync(dirname(this.path), { recursive: true });
    if(!existsSync(this.path)){
      this.data = structuredClone(seed);
      this.save();
    } else {
      this.data = JSON.parse(readFileSync(this.path,'utf8'));
      this.hydrateMissingDefaults();
    }
  }

  save(){ writeFileSync(this.path, JSON.stringify(this.data,null,2)); }
  get db(){ return this.data; }
}
