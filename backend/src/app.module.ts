import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StoreModule } from './store/store.module';
import { ProvidersModule } from './providers/providers.module';
import { ApiController } from './api.controller';
import { ApiService } from './api.service';
import { LlmService } from './llm.service';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), StoreModule, ProvidersModule],
  controllers: [ApiController],
  providers: [ApiService, LlmService],
})
export class AppModule {}
