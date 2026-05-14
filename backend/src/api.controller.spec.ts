import { Test } from '@nestjs/testing';
import { ApiController } from './api.controller';
import { ApiService } from './api.service';
import { LlmService } from './llm.service';
import { StoreModule } from './store/store.module';
describe('ApiController',()=>{let c:ApiController; beforeEach(async()=>{process.env.DATA_FILE='/tmp/lingoclaw-test-db.json'; const m=await Test.createTestingModule({imports:[StoreModule],controllers:[ApiController],providers:[ApiService,LlmService]}).compile(); c=m.get(ApiController);}); it('root returns name and endpoints',()=>{const r=c.root(); expect(r.name).toBe('lingoclaw-backend'); expect(Array.isArray(r.endpoints)).toBe(true); expect(r.endpoints.length).toBeGreaterThan(0);}); it('is healthy',()=>expect(c.health().ok).toBe(true)); it('returns seeded lessons',()=>expect(c.lessons().length).toBeGreaterThan(0));});
