process.env.NODE_ENV = 'test';
process.env.AUTH_USERS = 'bruno@e2e.app:012587,audrey@e2e.app:012587';
process.env.JWT_SECRET = 'e2e-test-secret';
// Tight on purpose: the other e2e suites leave the limits wide open, so this is
// the only place the guard is actually the subject.
process.env.LOGIN_MAX_ATTEMPTS = '3';
process.env.LOGIN_WINDOW_MS = '60000';
process.env.LOGIN_BLOCK_MS = '60000';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

const RIGHT_PATTERN = '012587';
const WRONG_PATTERN = '056183';

/**
 * An unlock pattern is only ~18.5 bits, so the login throttle is not a nicety —
 * it is the control that keeps the secret out of reach. These tests pin the
 * three properties that matter: attempts are bounded, a lockout ignores even a
 * correct pattern, and one account's lockout never spills onto the other parent.
 */
describe('Login throttling (e2e)', () => {
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

  const login = (email: string, password: string) =>
    request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password });

  it('bounds attempts, then refuses even the correct pattern', async () => {
    for (let attempt = 0; attempt < 3; attempt++) {
      const res = await login('bruno@e2e.app', WRONG_PATTERN);
      expect(res.status).toBe(401);
    }

    const blocked = await login('bruno@e2e.app', WRONG_PATTERN);
    expect(blocked.status).toBe(429);

    // The lockout is what buys the entropy back: a guesser who happens on the
    // real pattern during the block still gets nothing.
    const rightButLocked = await login('bruno@e2e.app', RIGHT_PATTERN);
    expect(rightButLocked.status).toBe(429);
  });

  it('buckets per email, so one parent cannot lock the other out', async () => {
    const res = await login('audrey@e2e.app', RIGHT_PATTERN);
    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe('string');
  });

  it('leaves GET /auth/me unthrottled — it runs on every app boot', async () => {
    const { body } = await login('audrey@e2e.app', RIGHT_PATTERN);
    const bearer = `Bearer ${body.token}`;

    for (let call = 0; call < 5; call++) {
      const me = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', bearer);
      expect(me.status).toBe(200);
    }
  });
});
