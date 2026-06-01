process.env.NODE_ENV = 'test';
process.env.AUTH_USERS = 'bruno@e2e.app:test-pass,audrey@e2e.app:test-pass';
process.env.JWT_SECRET = 'e2e-test-secret';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * Full-stack e2e against an in-memory SQLite database (NODE_ENV=test), so it
 * runs in CI with no Docker/Postgres. The bootstrap seeder reconciles the
 * `Home` family + two parents (Bruno, Audrey) from AUTH_USERS, so we log in
 * once and use the JWT — the server stamps "who" from the session, never the
 * request body.
 */
describe('Groceries (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let familyId: string;
  let listId: string;
  let memberId: string;

  const auth = (): string => `Bearer ${token}`;

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
      .send({ email: 'bruno@e2e.app', password: 'test-pass' });
    token = login.body.token;
    memberId = login.body.user.memberId;
    familyId = login.body.user.familyId;
  });

  afterAll(async () => {
    await app.close();
  });

  it('exposes a public health probe', async () => {
    const res = await request(app.getHttpServer()).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', service: 'fireplace-api' });
  });

  it('seeds exactly one Home family with Bruno and Audrey', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/families')
      .set('Authorization', auth());
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('Home');
    expect(res.body[0].id).toBe(familyId);

    const members = await request(app.getHttpServer())
      .get(`/api/families/${familyId}/members`)
      .set('Authorization', auth());
    const names = members.body.map((m: { name: string }) => m.name).sort();
    expect(names).toEqual(['Audrey', 'Bruno']);
    expect(
      members.body.every((m: { role: string }) => m.role === 'parent'),
    ).toBe(true);
  });

  it('returns a snapshot with the aisle catalogue and an empty list', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/families/${familyId}/grocery-list`)
      .set('Authorization', auth());
    expect(res.status).toBe(200);
    expect(res.body.list.familyId).toBe(familyId);
    expect(res.body.categories.length).toBeGreaterThan(5);
    expect(res.body.items).toEqual([]);
    listId = res.body.list.id;
  });

  it('rejects an invalid item (validation pipe)', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/grocery-lists/${listId}/items`)
      .set('Authorization', auth())
      .send({ name: '' });
    expect(res.status).toBe(400);
  });

  it('runs the full shopping flow: add → check → clear (stamped from the JWT)', async () => {
    const add = await request(app.getHttpServer())
      .post(`/api/grocery-lists/${listId}/items`)
      .set('Authorization', auth())
      .send({ name: '  Bananas ', quantity: 6 });
    expect(add.status).toBe(201);
    expect(add.body.name).toBe('Bananas');
    expect(add.body.addedById).toBe(memberId);
    const itemId = add.body.id;

    const toggle = await request(app.getHttpServer())
      .post(`/api/grocery-items/${itemId}/toggle`)
      .set('Authorization', auth())
      .send({});
    expect(toggle.status).toBe(201);
    expect(toggle.body.status).toBe('done');
    expect(toggle.body.checkedById).toBe(memberId);

    const clear = await request(app.getHttpServer())
      .delete(`/api/grocery-lists/${listId}/cart`)
      .set('Authorization', auth());
    expect(clear.status).toBe(200);
    expect(clear.body.removedIds).toContain(itemId);

    const after = await request(app.getHttpServer())
      .get(`/api/families/${familyId}/grocery-list`)
      .set('Authorization', auth());
    expect(after.body.items).toEqual([]);
  });

  it('updates then deletes an item', async () => {
    const add = await request(app.getHttpServer())
      .post(`/api/grocery-lists/${listId}/items`)
      .set('Authorization', auth())
      .send({ name: 'Bread' });
    const itemId = add.body.id;

    const patch = await request(app.getHttpServer())
      .patch(`/api/grocery-items/${itemId}`)
      .set('Authorization', auth())
      .send({ quantity: 2, note: 'wholegrain' });
    expect(patch.body.quantity).toBe(2);
    expect(patch.body.note).toBe('wholegrain');

    const del = await request(app.getHttpServer())
      .delete(`/api/grocery-items/${itemId}`)
      .set('Authorization', auth());
    expect(del.status).toBe(204);
  });

  it('blocks grocery routes without a token', async () => {
    const res = await request(app.getHttpServer()).get(
      `/api/families/${familyId}/grocery-list`,
    );
    expect(res.status).toBe(401);
  });
});
