import { Injectable } from '@nestjs/common';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { seed } from '../seed-data';

@Injectable()
export class StoreService {
  private readonly path = process.env.DATA_FILE ?? join(process.cwd(), 'data', 'db.json');
  private data: any;

  constructor() { this.load(); }

  private load() {
    mkdirSync(dirname(this.path), { recursive: true });
    if (!existsSync(this.path)) {
      this.data = structuredClone(seed);
      this.save();
    } else {
      this.data = JSON.parse(readFileSync(this.path, 'utf8'));
      this.hydrateMissingDefaults();
    }
  }

  private hydrateMissingDefaults() {
    // providers and roles are now managed by ProvidersStore (SQLite)
    let changed = false;

    if (!this.data.practiceContent) {
      this.data.practiceContent = structuredClone(seed.practiceContent);
      changed = true;
    }
    if (!this.data.chatSessions) { this.data.chatSessions = []; changed = true; }
    if (!this.data.chatMessages) { this.data.chatMessages = []; changed = true; }
    if (!this.data.voiceSessions) { this.data.voiceSessions = []; changed = true; }
    if (!this.data.voiceMessages) { this.data.voiceMessages = []; changed = true; }

    if (changed) this.save();
  }

  save() { writeFileSync(this.path, JSON.stringify(this.data, null, 2)); }
  get db() { return this.data; }
}
