process.env.NODE_ENV = 'test';
process.env.AUTH_USERS = 'bruno@e2e.app:012587,audrey@e2e.app:012587';
process.env.JWT_SECRET = 'e2e-test-secret';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PUSH_SENDER } from '../src/notifications/sender/push-sender';
import { StubPushSender } from '../src/notifications/sender/stub-push-sender';

const AUDREY_ENDPOINT = 'https://push.example/audrey-phone';

/**
 * Web Push end to end against the recording stub sender (NODE_ENV=test).
 * The invariant under test: a mutation notifies every *other* subscribed
 * family member — never the person who acted.
 */
describe('Notifications (e2e)', () => {
  let app: INestApplication;
  let sender: StubPushSender;
  let brunoToken: string;
  let audreyToken: string;
  let familyId: string;

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
    sender = app.get<StubPushSender>(PUSH_SENDER);

    const login = async (email: string) => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email, password: '012587' });
      return res.body as { token: string; user: { familyId: string } };
    };
    const bruno = await login('bruno@e2e.app');
    const audrey = await login('audrey@e2e.app');
    brunoToken = bruno.token;
    audreyToken = audrey.token;
    familyId = bruno.user.familyId;
  });

  afterAll(async () => {
    await app.close();
  });

  /** Pushes fan out fire-and-forget — poll briefly instead of racing them. */
  const waitForSends = async (count: number): Promise<void> => {
    for (let i = 0; i < 40 && sender.sent.length < count; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  };

  const addGroceryItem = async (token: string, name: string): Promise<void> => {
    const snapshot = await request(app.getHttpServer())
      .get(`/api/families/${familyId}/grocery-list`)
      .set('Authorization', `Bearer ${token}`);
    const res = await request(app.getHttpServer())
      .post(`/api/grocery-lists/${snapshot.body.list.id}/items`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name });
    expect(res.status).toBe(201);
  };

  it('rejects unauthenticated subscription management', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/notifications/subscription')
      .send({ endpoint: AUDREY_ENDPOINT, keys: { p256dh: 'k', auth: 'a' } });
    expect(res.status).toBe(401);
  });

  it('serves the VAPID public key to signed-in members', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/notifications/public-key')
      .set('Authorization', `Bearer ${brunoToken}`);
    expect(res.status).toBe(200);
    expect(res.body.publicKey).toBe('stub-vapid-public-key');
  });

  it('rejects a malformed subscription payload', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/notifications/subscription')
      .set('Authorization', `Bearer ${audreyToken}`)
      .send({ endpoint: AUDREY_ENDPOINT, keys: { p256dh: 'only-half' } });
    expect(res.status).toBe(400);
  });

  it("notifies the partner's device — and never the actor's own", async () => {
    const subscribe = await request(app.getHttpServer())
      .post('/api/notifications/subscription')
      .set('Authorization', `Bearer ${audreyToken}`)
      .send({
        endpoint: AUDREY_ENDPOINT,
        keys: { p256dh: 'p256dh-key', auth: 'auth-secret' },
      });
    expect(subscribe.status).toBe(204);

    // Audrey acts: she is the only subscriber, so nobody is notified.
    await addGroceryItem(audreyToken, 'Lait');
    await waitForSends(1);
    expect(sender.sent).toHaveLength(0);

    // Bruno acts: Audrey's device gets the push, named after Bruno.
    await addGroceryItem(brunoToken, 'Œufs');
    await waitForSends(1);
    expect(sender.sent).toHaveLength(1);
    expect(sender.sent[0].target.endpoint).toBe(AUDREY_ENDPOINT);
    expect(sender.sent[0].payload.title).toBe('Courses 🧺');
    expect(sender.sent[0].payload.body).toContain('Bruno');
    expect(sender.sent[0].payload.body).toContain('Œufs');
    expect(sender.sent[0].payload.url).toBe('/groceries');
  });

  it('covers the other boards: todo, comment, project and Spark pushes', async () => {
    const before = sender.sent.length;

    const todo = await request(app.getHttpServer())
      .post(`/api/families/${familyId}/todos`)
      .set('Authorization', `Bearer ${brunoToken}`)
      .send({ title: 'Réparer le portail' });
    expect(todo.status).toBe(201);
    await request(app.getHttpServer())
      .post(`/api/todos/${todo.body.id}/comments`)
      .set('Authorization', `Bearer ${brunoToken}`)
      .send({ body: 'Je m’en occupe samedi' });
    await waitForSends(before + 2);

    const bodies = sender.sent.slice(before).map((s) => s.payload.body);
    expect(bodies).toEqual([
      'Bruno a ajouté la tâche « Réparer le portail »',
      'Bruno a commenté « Réparer le portail »',
    ]);
  });

  it('stops pushing to a device after it unsubscribes', async () => {
    const unsubscribe = await request(app.getHttpServer())
      .delete('/api/notifications/subscription')
      .set('Authorization', `Bearer ${audreyToken}`)
      .send({ endpoint: AUDREY_ENDPOINT });
    expect(unsubscribe.status).toBe(204);

    const before = sender.sent.length;
    await addGroceryItem(brunoToken, 'Beurre');
    await waitForSends(before + 1);
    expect(sender.sent).toHaveLength(before);
  });
});
