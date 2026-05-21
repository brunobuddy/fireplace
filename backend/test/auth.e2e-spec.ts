process.env.NODE_ENV = 'test';
process.env.AUTH_USERS = 'parent@fireplace.app:test-pass';
process.env.JWT_SECRET = 'e2e-test-secret';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

/** Auth gate e2e: login, token validation, and protected-route behaviour. */
describe('Auth (e2e)', () => {
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

  it('logs in with valid credentials and returns a token + user', async () => {
    const res = await login('parent@fireplace.app', 'test-pass');
    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe('string');
    expect(res.body.user).toEqual({ email: 'parent@fireplace.app' });
  });

  it('is case-insensitive on the email', async () => {
    const res = await login('Parent@Fireplace.App', 'test-pass');
    expect(res.status).toBe(200);
  });

  it('rejects a wrong password with 401', async () => {
    const res = await login('parent@fireplace.app', 'nope');
    expect(res.status).toBe(401);
  });

  it('rejects a malformed login body with 400 (validation)', async () => {
    const res = await login('not-an-email', '');
    expect(res.status).toBe(400);
  });

  it('blocks a protected route without a token', async () => {
    const res = await request(app.getHttpServer()).get('/api/families');
    expect(res.status).toBe(401);
  });

  it('allows protected routes and /auth/me with a valid token', async () => {
    const { body } = await login('parent@fireplace.app', 'test-pass');
    const bearer = `Bearer ${body.token}`;

    const families = await request(app.getHttpServer())
      .get('/api/families')
      .set('Authorization', bearer);
    expect(families.status).toBe(200);

    const me = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', bearer);
    expect(me.status).toBe(200);
    expect(me.body).toEqual({ email: 'parent@fireplace.app' });
  });

  it('rejects a garbage token with 401', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/families')
      .set('Authorization', 'Bearer not.a.real.token');
    expect(res.status).toBe(401);
  });

  it('leaves the health probe public', async () => {
    const res = await request(app.getHttpServer()).get('/api/health');
    expect(res.status).toBe(200);
  });
});
