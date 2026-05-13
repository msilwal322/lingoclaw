import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const rawOrigin = (process.env.CORS_ORIGIN ?? '*').trim();
  const isWildcard = rawOrigin === '*';
  app.enableCors(
    isWildcard
      ? { origin: '*', credentials: false }
      : { origin: rawOrigin.split(',').map(s => s.trim()), credentials: true },
  );
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(Number(process.env.PORT ?? 3001), '0.0.0.0');
}
bootstrap();
