process.env.NODE_ENV = 'test';
process.env.AUTH_USERS = 'bruno@e2e.app:012587,audrey@e2e.app:012587';
process.env.JWT_SECRET = 'e2e-test-secret';
process.env.DEVICE_TOKEN = 'e2e-device-token-0123456789abcdef';
delete process.env.DEVICE_FAMILY_ID;

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

const DEVICE_TOKEN = process.env.DEVICE_TOKEN;

/**
 * Full-stack e2e against in-memory SQLite (NODE_ENV=test). The author is
 * stamped from the JWT; the device endpoint is read-only, plain text, and
 * guarded by its own static token.
 */
describe('Entrance message (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let familyId: string;
  let memberId: string;

  const auth = (): string => `Bearer ${token}`;
  const url = (): string => `/api/families/${familyId}/entrance-message`;
  const put = (body: unknown) =>
    request(app.getHttpServer())
      .put(url())
      .set('Authorization', auth())
      .send(body as object);
  const device = (header?: string) => {
    const req = request(app.getHttpServer()).get(
      '/api/device/entrance-message',
    );
    return header ? req.set('Authorization', header) : req;
  };

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

    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'audrey@e2e.app', password: '012587' });
    token = login.body.token;
    memberId = login.body.user.memberId;
    familyId = login.body.user.familyId;
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects an unauthenticated request', async () => {
    const res = await request(app.getHttpServer()).get(url());
    expect(res.status).toBe(401);
  });

  it('starts empty: null in the app, 204 on the device', async () => {
    const res = await request(app.getHttpServer())
      .get(url())
      .set('Authorization', auth());
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: null });

    const dev = await device(`Bearer ${DEVICE_TOKEN}`);
    expect(dev.status).toBe(204);
    expect(dev.text).toBe('');
  });

  it('writes a message stamped with the signed-in member', async () => {
    const res = await put({ text: '  Pense aux clés  ' });
    expect(res.status).toBe(200);
    expect(res.body.message).toEqual({
      text: 'Pense aux clés',
      authorId: memberId,
      authorName: 'Audrey',
      updatedAt: expect.any(String),
    });

    const read = await request(app.getHttpServer())
      .get(url())
      .set('Authorization', auth());
    expect(read.body.message.text).toBe('Pense aux clés');
  });

  it('rejects a client-supplied author', async () => {
    const res = await put({ text: 'Coucou', authorId: memberId });
    expect(res.status).toBe(400);
  });

  it('replaces the previous message instead of stacking', async () => {
    await put({ text: 'Premier' });
    const res = await put({ text: 'Second' });
    expect(res.body.message.text).toBe('Second');
    const read = await request(app.getHttpServer())
      .get(url())
      .set('Authorization', auth());
    expect(read.body.message.text).toBe('Second');
  });

  it('enforces the 280-character limit after trimming', async () => {
    expect((await put({ text: 'a'.repeat(281) })).status).toBe(400);
    const padded = await put({ text: `  ${'a'.repeat(280)}  ` });
    expect(padded.status).toBe(200);
    expect(padded.body.message.text).toHaveLength(280);
  });

  it('rejects a non-string text', async () => {
    expect((await put({ text: 42 })).status).toBe(400);
    expect((await put({})).status).toBe(400);
  });

  it('serves the exact plain-text format to the device', async () => {
    await put({ text: 'Ligne 1\r\nLigne 2' });
    const res = await device(`Bearer ${DEVICE_TOKEN}`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('text/plain; charset=utf-8');
    const match = /^author=Audrey\nupdated=(\d+)\n\nLigne 1\nLigne 2\n$/.exec(
      res.text,
    );
    expect(match).not.toBeNull();
    const epoch = Number(match?.[1]);
    expect(Math.abs(epoch - Date.now() / 1000)).toBeLessThan(86_400);
  });

  it('clears on an empty or whitespace-only text', async () => {
    await put({ text: 'À effacer' });
    const res = await put({ text: '   ' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: null });

    const read = await request(app.getHttpServer())
      .get(url())
      .set('Authorization', auth());
    expect(read.body).toEqual({ message: null });
    expect((await device(`Bearer ${DEVICE_TOKEN}`)).status).toBe(204);

    expect((await put({ text: '' })).body).toEqual({ message: null });
  });

  it('refuses the device without a token or with a wrong one', async () => {
    expect((await device()).status).toBe(401);
    expect((await device('Bearer nope')).status).toBe(401);
    expect((await device(`Basic ${DEVICE_TOKEN}`)).status).toBe(401);
    // A user JWT is not a device token.
    expect((await device(auth())).status).toBe(401);
  });

  it('fails closed when DEVICE_TOKEN is unset', async () => {
    delete process.env.DEVICE_TOKEN;
    try {
      expect((await device(`Bearer ${DEVICE_TOKEN}`)).status).toBe(401);
      expect((await device('Bearer ')).status).toBe(401);
      expect((await device()).status).toBe(401);
    } finally {
      process.env.DEVICE_TOKEN = DEVICE_TOKEN;
    }
  });

  it('is read-only on the device route', async () => {
    const res = await request(app.getHttpServer())
      .put('/api/device/entrance-message')
      .set('Authorization', `Bearer ${DEVICE_TOKEN}`)
      .send({ text: 'Intrus' });
    expect(res.status).toBe(404);
  });
});
