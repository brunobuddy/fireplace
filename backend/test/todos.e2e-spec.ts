process.env.NODE_ENV = 'test';
process.env.AUTH_USERS = 'bruno@e2e.app:012587,audrey@e2e.app:012587';
process.env.JWT_SECRET = 'e2e-test-secret';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * Full-stack e2e against in-memory SQLite (NODE_ENV=test). The bootstrap
 * seeder reconciles `Home` + Bruno + Audrey from AUTH_USERS, so we log in once
 * and the server stamps "who created/commented" from the JWT — no member id is
 * sent in any request body.
 */
describe('Todos (e2e)', () => {
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
      `/api/families/${familyId}/todos`,
    );
    expect(res.status).toBe(401);
  });

  it('starts with an empty board on a fresh database', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/families/${familyId}/todos`)
      .set('Authorization', auth());
    expect(res.status).toBe(200);
    expect(res.body.todos).toEqual([]);
  });

  it('runs the full flow: add → re-prioritise → complete (stamped from the JWT)', async () => {
    const add = await request(app.getHttpServer())
      .post(`/api/families/${familyId}/todos`)
      .set('Authorization', auth())
      .send({ title: '  Fix the leaky tap ' });
    expect(add.status).toBe(201);
    expect(add.body.title).toBe('Fix the leaky tap');
    expect(add.body.criticality).toBe('medium');
    expect(add.body.status).toBe('open');
    expect(add.body.createdBy.id).toBe(memberId);
    const todoId = add.body.id;

    const patch = await request(app.getHttpServer())
      .patch(`/api/todos/${todoId}`)
      .set('Authorization', auth())
      .send({ criticality: 'high', description: 'Kitchen sink' });
    expect(patch.status).toBe(200);
    expect(patch.body.criticality).toBe('high');
    expect(patch.body.description).toBe('Kitchen sink');

    const toggle = await request(app.getHttpServer())
      .post(`/api/todos/${todoId}/toggle`)
      .set('Authorization', auth())
      .send({});
    expect(toggle.status).toBe(201);
    expect(toggle.body.status).toBe('done');
    expect(toggle.body.completedById).toBe(memberId);
    expect(typeof toggle.body.completedAt).toBe('string');
  });

  it('adds then removes a comment, carrying the signed-in member as author', async () => {
    const add = await request(app.getHttpServer())
      .post(`/api/families/${familyId}/todos`)
      .set('Authorization', auth())
      .send({ title: 'Sort the garage' });
    const todoId = add.body.id;

    const comment = await request(app.getHttpServer())
      .post(`/api/todos/${todoId}/comments`)
      .set('Authorization', auth())
      .send({ body: '  I can help on Saturday ' });
    expect(comment.status).toBe(201);
    expect(comment.body.comments).toHaveLength(1);
    expect(comment.body.comments[0].body).toBe('I can help on Saturday');
    expect(comment.body.comments[0].author.id).toBe(memberId);
    const commentId = comment.body.comments[0].id;

    const del = await request(app.getHttpServer())
      .delete(`/api/todos/${todoId}/comments/${commentId}`)
      .set('Authorization', auth());
    expect(del.status).toBe(200);
    expect(del.body.comments).toHaveLength(0);
  });

  it('deletes a todo', async () => {
    const add = await request(app.getHttpServer())
      .post(`/api/families/${familyId}/todos`)
      .set('Authorization', auth())
      .send({ title: 'Temporary' });
    const todoId = add.body.id;

    const del = await request(app.getHttpServer())
      .delete(`/api/todos/${todoId}`)
      .set('Authorization', auth());
    expect(del.status).toBe(204);
  });

  it('rejects an unknown criticality value', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/families/${familyId}/todos`)
      .set('Authorization', auth())
      .send({ title: 'Bad', criticality: 'urgent' });
    expect(res.status).toBe(400);
  });
});
