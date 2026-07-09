import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Railway terminates TLS one hop in front of us. Without this every request
  // arrives wearing the proxy's address, and the login throttler — which keys
  // on the client IP — would bucket the entire internet together. Trust exactly
  // one hop; blanket-trusting X-Forwarded-For would let clients spoof it.
  if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
  }

  const origins = (process.env.CORS_ORIGINS ?? 'http://localhost:5173').split(
    ',',
  );
  app.enableCors({ origin: origins, credentials: true });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  new Logger('Bootstrap').log(
    `Fireplace API ready on http://localhost:${port}/api`,
  );
}

void bootstrap();
