process.env.NODE_ENV = 'test';
process.env.AUTH_USERS = 'bruno@e2e.app:test-pass,audrey@e2e.app:test-pass';
process.env.JWT_SECRET = 'e2e-test-secret';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * Full-stack e2e against in-memory SQLite (NODE_ENV=test → the question
 * generator is the deterministic stub, so no OpenAI call). The seeder
 * reconciles the `Home` family with two parents (Bruno, Audrey) and a starter
 * Spark question. The whole flow is: see the question → answer secretly →
 * partner stays hidden → reveal → lock → regenerate. Identity is always read
 * from the JWT — never from a body or query.
 */
describe('Spark (e2e)', () => {
  let app: INestApplication;
  let brunoToken: string;
  let audreyToken: string;
  let familyId: string;
  let brunoId: string;
  let audreyId: string;

  const brunoAuth = (): string => `Bearer ${brunoToken}`;
  const audreyAuth = (): string => `Bearer ${audreyToken}`;

  const getView = (bearer: string) =>
    request(app.getHttpServer())
      .get(`/api/families/${familyId}/spark`)
      .set('Authorization', bearer);

  const answer = (bearer: string, text: string) =>
    request(app.getHttpServer())
      .post(`/api/families/${familyId}/spark/answer`)
      .set('Authorization', bearer)
      .send({ text });

  const regenerate = (bearer: string) =>
    request(app.getHttpServer())
      .post(`/api/families/${familyId}/spark/regenerate`)
      .set('Authorization', bearer)
      .send({});

  const login = (email: string, password: string) =>
    request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password });

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

    const bruno = await login('bruno@e2e.app', 'test-pass');
    brunoToken = bruno.body.token;
    brunoId = bruno.body.user.memberId;
    familyId = bruno.body.user.familyId;

    const audrey = await login('audrey@e2e.app', 'test-pass');
    audreyToken = audrey.body.token;
    audreyId = audrey.body.user.memberId;
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects an unauthenticated request', async () => {
    const res = await request(app.getHttpServer()).get(
      `/api/families/${familyId}/spark`,
    );
    expect(res.status).toBe(401);
  });

  it('serves a seeded question with two parents and nothing revealed', async () => {
    const res = await getView(brunoAuth());
    expect(res.status).toBe(200);
    expect(res.body.question.text).toContain('?');
    expect(res.body.participants).toHaveLength(2);
    expect(res.body.viewerIsParticipant).toBe(true);
    expect(res.body.revealed).toBe(false);
    expect(
      res.body.participants.every((p: { text: null }) => p.text === null),
    ).toBe(true);
  });

  it('keeps the first answer secret from the partner until both answer', async () => {
    const first = await answer(brunoAuth(), 'Bruno answers first');
    expect(first.status).toBe(201);
    expect(first.body.viewerHasAnswered).toBe(true);
    expect(first.body.revealed).toBe(false);
    const brunoSlot = first.body.participants.find(
      (p: { memberId: string }) => p.memberId === brunoId,
    );
    expect(brunoSlot.text).toBe('Bruno answers first');

    // Audrey must NOT be able to read Bruno's answer yet.
    const audreyView = await getView(audreyAuth());
    const brunoFromAudrey = audreyView.body.participants.find(
      (p: { memberId: string }) => p.memberId === brunoId,
    );
    expect(brunoFromAudrey.hasAnswered).toBe(true);
    expect(brunoFromAudrey.text).toBeNull();
  });

  it('reveals both answers once the second parent answers', async () => {
    const second = await answer(audreyAuth(), 'Audrey answers second');
    expect(second.status).toBe(201);
    expect(second.body.revealed).toBe(true);

    const view = await getView(brunoAuth());
    expect(view.body.revealed).toBe(true);
    const texts = view.body.participants
      .map((p: { text: string }) => p.text)
      .sort();
    expect(texts).toEqual(['Audrey answers second', 'Bruno answers first']);
  });

  it('locks further answers once revealed', async () => {
    const late = await answer(brunoAuth(), 'changed my mind');
    expect(late.status).toBe(403);
  });

  it('regenerates a fresh, unanswered question', async () => {
    const before = await getView(brunoAuth());
    const beforeText = before.body.question.text;

    const regen = await regenerate(brunoAuth());
    expect(regen.status).toBe(201);
    expect(regen.body.question.text).not.toBe(beforeText);
    expect(regen.body.revealed).toBe(false);
    expect(
      regen.body.participants.every(
        (p: { hasAnswered: boolean }) => !p.hasAnswered,
      ),
    ).toBe(true);
  });

  it('rejects an empty answer (validation)', async () => {
    const res = await answer(brunoAuth(), '');
    expect(res.status).toBe(400);
  });

  it('audrey is also a parent and can answer', async () => {
    const res = await answer(audreyAuth(), 'a quick yes from audrey');
    expect(res.status).toBe(201);
    expect(res.body.viewerHasAnswered).toBe(true);
    expect(audreyId).toBeDefined();
  });
});
