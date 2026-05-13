import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StoreModule } from './store/store.module';
import { ApiController } from './api.controller';
import { ApiService } from './api.service';
@Module({ imports: [ConfigModule.forRoot({ isGlobal: true }), StoreModule], controllers: [ApiController], providers: [ApiService] })
export class AppModule {}
