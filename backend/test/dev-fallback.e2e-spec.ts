process.env.NODE_ENV = 'test';
// Explicitly unset: jest shares one `process.env` across e2e files, and every
// other suite assigns AUTH_USERS at import time.
delete process.env.AUTH_USERS;
process.env.JWT_SECRET = 'e2e-test-secret';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DEV_FALLBACK_PATTERN } from '../src/auth/users/env-user.store';

/**
 * With no AUTH_USERS the dev fallback has to be usable end to end, not merely
 * present in the credential store.
 *
 * It was not: the seeder read AUTH_USERS directly, found nothing, and skipped
 * the household — so the fallback passed the credential check and then died at
 * the member lookup with a 401. Both now resolve through `resolveUsers`.
 */
describe('Dev fallback login (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const login = (email: string) =>
    request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password: DEV_FALLBACK_PATTERN });

  it.each([
    ['bruno@fireplace.local', 'Bruno'],
    ['audrey@fireplace.local', 'Audrey'],
  ])(
    'signs %s in and resolves them to a seeded member',
    async (email, name) => {
      const res = await login(email);
      expect(res.status).toBe(200);
      expect(typeof res.body.token).toBe('string');
      expect(res.body.user).toMatchObject({ email, name, role: 'parent' });
      expect(typeof res.body.user.memberId).toBe('string');
    },
  );

  it('seeds both parents into the same family', async () => {
    const bruno = await login('bruno@fireplace.local');
    const audrey = await login('audrey@fireplace.local');
    expect(bruno.body.user.familyId).toBe(audrey.body.user.familyId);
    expect(bruno.body.user.memberId).not.toBe(audrey.body.user.memberId);
  });
});
