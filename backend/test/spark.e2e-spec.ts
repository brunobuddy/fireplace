process.env.NODE_ENV = 'test';
process.env.AUTH_USERS = 'parent@fireplace.app:test-pass';
process.env.JWT_SECRET = 'e2e-test-secret';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * Full-stack e2e against in-memory SQLite (NODE_ENV=test → the question
 * generator is the deterministic stub, so no OpenAI call). The seeder gives us
 * a demo family with two parents (Alex, Sam), a child (Robin) and one seeded
 * Spark question. The whole flow is: see the question → answer secretly →
 * partner stays hidden → reveal → lock → regenerate.
 */
describe('Spark (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let familyId: string;
  let alexId: string;
  let samId: string;
  let robinId: string;

  const auth = (): string => `Bearer ${token}`;

  const getView = (memberId: string) =>
    request(app.getHttpServer())
      .get(`/api/families/${familyId}/spark`)
      .query({ memberId })
      .set('Authorization', auth());

  const answer = (memberId: string, text: string) =>
    request(app.getHttpServer())
      .post(`/api/families/${familyId}/spark/answer`)
      .set('Authorization', auth())
      .send({ memberId, text });

  const regenerate = (memberId: string) =>
    request(app.getHttpServer())
      .post(`/api/families/${familyId}/spark/regenerate`)
      .query({ memberId })
      .set('Authorization', auth());

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
      .send({ email: 'parent@fireplace.app', password: 'test-pass' });
    token = login.body.token;

    const families = await request(app.getHttpServer())
      .get('/api/families')
      .set('Authorization', auth());
    familyId = families.body[0].id;

    const members = await request(app.getHttpServer())
      .get(`/api/families/${familyId}/members`)
      .set('Authorization', auth());
    const parents = members.body.filter(
      (m: { role: string }) => m.role === 'parent',
    );
    alexId = parents[0].id;
    samId = parents[1].id;
    robinId = members.body.find((m: { role: string }) => m.role === 'child').id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects an unauthenticated request', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/families/${familyId}/spark`)
      .query({ memberId: alexId });
    expect(res.status).toBe(401);
  });

  it('serves a seeded question with two parents and nothing revealed', async () => {
    const res = await getView(alexId);
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
    const first = await answer(alexId, 'Alex answers first');
    expect(first.status).toBe(201);
    expect(first.body.viewerHasAnswered).toBe(true);
    expect(first.body.revealed).toBe(false);
    const alexSlot = first.body.participants.find(
      (p: { memberId: string }) => p.memberId === alexId,
    );
    expect(alexSlot.text).toBe('Alex answers first');

    // Sam must NOT be able to read Alex's answer yet.
    const samView = await getView(samId);
    const alexFromSam = samView.body.participants.find(
      (p: { memberId: string }) => p.memberId === alexId,
    );
    expect(alexFromSam.hasAnswered).toBe(true);
    expect(alexFromSam.text).toBeNull();
  });

  it('reveals both answers once the second parent answers', async () => {
    const second = await answer(samId, 'Sam answers second');
    expect(second.status).toBe(201);
    expect(second.body.revealed).toBe(true);

    const view = await getView(alexId);
    expect(view.body.revealed).toBe(true);
    const texts = view.body.participants
      .map((p: { text: string }) => p.text)
      .sort();
    expect(texts).toEqual(['Alex answers first', 'Sam answers second']);
  });

  it('locks further answers once revealed', async () => {
    const late = await answer(alexId, 'changed my mind');
    expect(late.status).toBe(403);
  });

  it('forbids the child from answering', async () => {
    await regenerate(alexId); // clear the revealed state with a fresh question
    const res = await answer(robinId, 'I want to play too');
    expect(res.status).toBe(403);
  });

  it('regenerates a fresh, unanswered question', async () => {
    const before = await getView(alexId);
    const beforeText = before.body.question.text;

    const regen = await regenerate(alexId);
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
    const res = await answer(alexId, '');
    expect(res.status).toBe(400);
  });
});
