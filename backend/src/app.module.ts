import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { FamilyModule } from './family/family.module';
import { GroceriesModule } from './groceries/groceries.module';
import { TodosModule } from './todos/todos.module';

/**
 * Composition root. Feature modules are independent and added here as the
 * family app grows (agenda, conversations, …) — none of them edit each other.
 * AuthModule registers a global guard, so every API route is protected unless
 * marked `@Public()`.
 *
 * In production the app is a single service: NestJS also serves the built SPA
 * (same origin as the API). In dev the SPA is served by Vite, which proxies
 * `/api` + `/socket.io` here — so the frontend always talks to a relative
 * origin and no CORS is involved.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    AuthModule,
    HealthModule,
    FamilyModule,
    GroceriesModule,
    TodosModule,
    ...spaModule(),
  ],
})
export class AppModule {}

/**
 * Serve the compiled SPA when a build is present (production single-service).
 * Skipped under test and when there's no build (e.g. `npm run dev`, where Vite
 * owns the SPA). Static assets are served as plain files, outside the global
 * auth guard, so the login screen loads for anonymous visitors. `/api` and
 * `/socket.io` are excluded so the API and websocket aren't shadowed by the
 * SPA history fallback.
 */
function spaModule(): DynamicModule[] {
  if (process.env.NODE_ENV === 'test') {
    return [];
  }
  const rootPath =
    process.env.FRONTEND_DIST ??
    join(__dirname, '..', '..', 'frontend', 'dist');
  if (!existsSync(join(rootPath, 'index.html'))) {
    return [];
  }
  return [
    ServeStaticModule.forRoot({
      rootPath,
      exclude: ['/api/(.*)', '/socket.io/(.*)'],
    }),
  ];
}
