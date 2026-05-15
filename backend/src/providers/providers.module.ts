import { Module } from '@nestjs/common';
import { ProvidersStore } from './providers.store';

@Module({ providers: [ProvidersStore], exports: [ProvidersStore] })
export class ProvidersModule {}
