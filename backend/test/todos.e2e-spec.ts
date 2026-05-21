process.env.NODE_ENV = 'test';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Todos (e2e)', () => {
  let app: INestApplication;
  let familyId: string;
  let memberId: string;

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

    const families = await request(app.getHttpServer()).get('/api/families');
    familyId = families.body[0].id;
    const members = await request(app.getHttpServer()).get(
      `/api/families/${familyId}/members`,
    );
    memberId = members.body[0].id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('seeds demo todos and exposes who created and who commented', async () => {
    const res = await request(app.getHttpServer()).get(
      `/api/families/${familyId}/todos`,
    );
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.todos)).toBe(true);

    const dentist = res.body.todos.find(
      (t: { title: string }) => t.title === 'Book the dentist for Robin',
    );
    expect(dentist).toBeDefined();
    expect(dentist.criticality).toBe('high');
    expect(dentist.createdBy.name).toBe('Sam');
    expect(dentist.comments).toHaveLength(1);
    expect(dentist.comments[0].author.name).toBe('Alex');
    expect(dentist.comments[0].body).toContain('Tuesday');
  });

  it('runs the full flow: add → re-prioritise → complete', async () => {
    const add = await request(app.getHttpServer())
      .post(`/api/families/${familyId}/todos`)
      .send({ title: '  Fix the leaky tap ', createdById: memberId });
    expect(add.status).toBe(201);
    expect(add.body.title).toBe('Fix the leaky tap');
    expect(add.body.criticality).toBe('medium');
    expect(add.body.status).toBe('open');
    expect(add.body.createdBy.id).toBe(memberId);
    const todoId = add.body.id;

    const patch = await request(app.getHttpServer())
      .patch(`/api/todos/${todoId}`)
      .send({ criticality: 'high', description: 'Kitchen sink' });
    expect(patch.status).toBe(200);
    expect(patch.body.criticality).toBe('high');
    expect(patch.body.description).toBe('Kitchen sink');

    const toggle = await request(app.getHttpServer())
      .post(`/api/todos/${todoId}/toggle`)
      .send({ memberId });
    expect(toggle.status).toBe(201);
    expect(toggle.body.status).toBe('done');
    expect(toggle.body.completedById).toBe(memberId);
    expect(typeof toggle.body.completedAt).toBe('string');
  });

  it('adds then removes a comment, carrying the author', async () => {
    const add = await request(app.getHttpServer())
      .post(`/api/families/${familyId}/todos`)
      .send({ title: 'Sort the garage', createdById: memberId });
    const todoId = add.body.id;

    const comment = await request(app.getHttpServer())
      .post(`/api/todos/${todoId}/comments`)
      .send({ body: '  I can help on Saturday ', authorId: memberId });
    expect(comment.status).toBe(201);
    expect(comment.body.comments).toHaveLength(1);
    expect(comment.body.comments[0].body).toBe('I can help on Saturday');
    expect(comment.body.comments[0].author.id).toBe(memberId);
    const commentId = comment.body.comments[0].id;

    const del = await request(app.getHttpServer()).delete(
      `/api/todos/${todoId}/comments/${commentId}`,
    );
    expect(del.status).toBe(200);
    expect(del.body.comments).toHaveLength(0);
  });

  it('deletes a todo', async () => {
    const add = await request(app.getHttpServer())
      .post(`/api/families/${familyId}/todos`)
      .send({ title: 'Temporary', createdById: memberId });
    const todoId = add.body.id;

    const del = await request(app.getHttpServer()).delete(
      `/api/todos/${todoId}`,
    );
    expect(del.status).toBe(204);
  });

  it('rejects an unknown criticality value', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/families/${familyId}/todos`)
      .send({ title: 'Bad', criticality: 'urgent', createdById: memberId });
    expect(res.status).toBe(400);
  });
});
