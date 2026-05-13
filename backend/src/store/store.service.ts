import { Injectable } from '@nestjs/common';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { seed } from '../seed-data';
@Injectable()
export class StoreService {
  private readonly path = process.env.DATA_FILE ?? join(process.cwd(), 'data', 'db.json');
  private data: any;
  constructor(){ this.load(); }
  private load(){ mkdirSync(dirname(this.path), { recursive: true }); if(!existsSync(this.path)){ this.data = structuredClone(seed); this.save(); } else { this.data = JSON.parse(readFileSync(this.path,'utf8')); }}
  save(){ writeFileSync(this.path, JSON.stringify(this.data,null,2)); }
  get db(){ return this.data; }
}
