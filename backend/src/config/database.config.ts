import { TypeOrmModuleOptions } from '@nestjs/typeorm';

/**
 * Builds the TypeORM connection options from the environment.
 *
 * - `test`            → in-memory SQLite (suites need no running database).
 * - `DATABASE_URL` set → that connection string (Railway / managed Postgres).
 * - otherwise          → discrete DB_* vars (local docker-compose Postgres).
 *
 * Entities are auto-loaded by the feature modules via `forFeature`
 * (`autoLoadEntities`), so this file never needs editing when a new module
 * is added (OCP).
 */
export function buildDatabaseConfig(): TypeOrmModuleOptions {
  if (process.env.NODE_ENV === 'test') {
    return {
      type: 'better-sqlite3',
      database: ':memory:',
      autoLoadEntities: true,
      synchronize: true,
      dropSchema: true,
    };
  }

  return {
    type: 'postgres',
    ...connectionTarget(),
    autoLoadEntities: true,
    // Scaffold convenience: keep the schema in sync from the entities.
    // In production this is OFF unless DB_SYNCHRONIZE=true is set explicitly
    // (Railway has no migration step yet — set it on first deploy).
    synchronize: shouldSynchronize(),
    ssl: useSsl() ? { rejectUnauthorized: false } : false,
  };
}

function connectionTarget() {
  const url = process.env.DATABASE_URL;
  if (url) {
    return { url };
  }
  return {
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5432),
    username: process.env.DB_USERNAME ?? 'fireplace',
    password: process.env.DB_PASSWORD ?? 'fireplace',
    database: process.env.DB_NAME ?? 'fireplace',
  };
}

function shouldSynchronize(): boolean {
  if (process.env.DB_SYNCHRONIZE) {
    return process.env.DB_SYNCHRONIZE === 'true';
  }
  return process.env.NODE_ENV !== 'production';
}

function useSsl(): boolean {
  if (process.env.DB_SSL) {
    return process.env.DB_SSL === 'true';
  }
  // Managed providers (incl. Railway external URLs) usually require TLS.
  return /sslmode=require/.test(process.env.DATABASE_URL ?? '');
}
