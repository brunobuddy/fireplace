process.env.NODE_ENV = 'test';
process.env.AUTH_USERS = 'bruno@e2e.app:012587,audrey@e2e.app:012587';
process.env.JWT_SECRET = 'e2e-test-secret';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * Full-stack e2e against in-memory SQLite (NODE_ENV=test). Like the other
 * suites, the server stamps "who reported/found" from the JWT — no member id
 * is sent in any request body.
 */
describe('Lost objects (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let familyId: string;
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
      .send({ email: 'bruno@e2e.app', password: '012587' });
    token = login.body.token;
    memberId = login.body.user.memberId;
    familyId = login.body.user.familyId;
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects an unauthenticated request', async () => {
    const res = await request(app.getHttpServer()).get(
      `/api/families/${familyId}/lost-objects`,
    );
    expect(res.status).toBe(401);
  });

  it('starts with an empty list on a fresh database', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/families/${familyId}/lost-objects`)
      .set('Authorization', auth());
    expect(res.status).toBe(200);
    expect(res.body.objects).toEqual([]);
  });

  it('runs the full flow: report → found → lost again (stamped from the JWT)', async () => {
    const add = await request(app.getHttpServer())
      .post(`/api/families/${familyId}/lost-objects`)
      .set('Authorization', auth())
      .send({ name: '  Doudou lapin ' });
    expect(add.status).toBe(201);
    expect(add.body.name).toBe('Doudou lapin');
    expect(add.body.status).toBe('lost');
    expect(add.body.reportedBy.id).toBe(memberId);
    const objectId = add.body.id;

    const found = await request(app.getHttpServer())
      .post(`/api/lost-objects/${objectId}/toggle`)
      .set('Authorization', auth())
      .send({});
    expect(found.status).toBe(201);
    expect(found.body.status).toBe('found');
    expect(found.body.foundById).toBe(memberId);
    expect(typeof found.body.foundAt).toBe('string');

    const lostAgain = await request(app.getHttpServer())
      .post(`/api/lost-objects/${objectId}/toggle`)
      .set('Authorization', auth())
      .send({});
    expect(lostAgain.status).toBe(201);
    expect(lostAgain.body.status).toBe('lost');
    expect(lostAgain.body.foundById).toBeNull();
    expect(lostAgain.body.foundAt).toBeNull();
  });

  it('adds then removes a location suggestion, carrying the signed-in member as author', async () => {
    const add = await request(app.getHttpServer())
      .post(`/api/families/${familyId}/lost-objects`)
      .set('Authorization', auth())
      .send({ name: 'Clés de voiture' });
    const objectId = add.body.id;

    const comment = await request(app.getHttpServer())
      .post(`/api/lost-objects/${objectId}/comments`)
      .set('Authorization', auth())
      .send({ body: '  Regarde dans la veste bleue ' });
    expect(comment.status).toBe(201);
    expect(comment.body.comments).toHaveLength(1);
    expect(comment.body.comments[0].body).toBe('Regarde dans la veste bleue');
    expect(comment.body.comments[0].author.id).toBe(memberId);
    const commentId = comment.body.comments[0].id;

    const del = await request(app.getHttpServer())
      .delete(`/api/lost-objects/${objectId}/comments/${commentId}`)
      .set('Authorization', auth());
    expect(del.status).toBe(200);
    expect(del.body.comments).toHaveLength(0);
  });

  it('deletes a lost object', async () => {
    const add = await request(app.getHttpServer())
      .post(`/api/families/${familyId}/lost-objects`)
      .set('Authorization', auth())
      .send({ name: 'Télécommande' });
    const objectId = add.body.id;

    const del = await request(app.getHttpServer())
      .delete(`/api/lost-objects/${objectId}`)
      .set('Authorization', auth());
    expect(del.status).toBe(204);

    const snap = await request(app.getHttpServer())
      .get(`/api/families/${familyId}/lost-objects`)
      .set('Authorization', auth());
    const ids = snap.body.objects.map((o: { id: string }) => o.id);
    expect(ids).not.toContain(objectId);
  });

  it('rejects an empty name', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/families/${familyId}/lost-objects`)
      .set('Authorization', auth())
      .send({ name: '' });
    expect(res.status).toBe(400);
  });
});
