import { Test } from '@nestjs/testing';
import { ApiController } from './api.controller';
import { ApiService } from './api.service';
import { StoreModule } from './store/store.module';
describe('ApiController',()=>{let c:ApiController; beforeEach(async()=>{process.env.DATA_FILE='/tmp/lingoclaw-test-db.json'; const m=await Test.createTestingModule({imports:[StoreModule],controllers:[ApiController],providers:[ApiService]}).compile(); c=m.get(ApiController);}); it('is healthy',()=>expect(c.health().ok).toBe(true)); it('returns seeded lessons',()=>expect(c.lessons().length).toBeGreaterThan(0));});
