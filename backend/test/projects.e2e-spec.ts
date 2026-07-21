process.env.NODE_ENV = 'test';
process.env.AUTH_USERS = 'bruno@e2e.app:012587,audrey@e2e.app:012587';
process.env.JWT_SECRET = 'e2e-test-secret';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * Full-stack e2e for the projects board against in-memory SQLite. Two logins
 * (Bruno + Audrey) so assignment and family-wide visibility are exercised the
 * way the app really uses them — every "who" is stamped from the JWT, never
 * sent by the client.
 */
describe('Projects (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let audreyToken: string;
  let familyId: string;
  let memberId: string;
  let audreyId: string;

  const auth = (): string => `Bearer ${token}`;
  const server = () => app.getHttpServer();

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

    const bruno = await request(server())
      .post('/api/auth/login')
      .send({ email: 'bruno@e2e.app', password: '012587' });
    token = bruno.body.token;
    memberId = bruno.body.user.memberId;
    familyId = bruno.body.user.familyId;

    const audrey = await request(server())
      .post('/api/auth/login')
      .send({ email: 'audrey@e2e.app', password: '012587' });
    audreyToken = audrey.body.token;
    audreyId = audrey.body.user.memberId;
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects an unauthenticated request', async () => {
    const res = await request(server()).get(
      `/api/families/${familyId}/projects`,
    );
    expect(res.status).toBe(401);
  });

  it('starts with an empty board on a fresh database', async () => {
    const res = await request(server())
      .get(`/api/families/${familyId}/projects`)
      .set('Authorization', auth());
    expect(res.status).toBe(200);
    expect(res.body.projects).toEqual([]);
  });

  it('creates a project (trimmed, active, stamped from the JWT) then renames it', async () => {
    const add = await request(server())
      .post(`/api/families/${familyId}/projects`)
      .set('Authorization', auth())
      .send({ name: '  Refaire la salle de bain ' });
    expect(add.status).toBe(201);
    expect(add.body.name).toBe('Refaire la salle de bain');
    expect(add.body.status).toBe('active');
    expect(add.body.archivedAt).toBeNull();
    expect(add.body.createdBy.id).toBe(memberId);
    expect(add.body.tasks).toEqual([]);

    const patch = await request(server())
      .patch(`/api/projects/${add.body.id}`)
      .set('Authorization', auth())
      .send({ name: 'Salle de bain' });
    expect(patch.status).toBe(200);
    expect(patch.body.name).toBe('Salle de bain');
  });

  it('runs the task flow: add → assign to Audrey → escalate to blocking → complete', async () => {
    const project = await request(server())
      .post(`/api/families/${familyId}/projects`)
      .set('Authorization', auth())
      .send({ name: 'Voyage d’été' });
    const projectId = project.body.id;

    const add = await request(server())
      .post(`/api/projects/${projectId}/tasks`)
      .set('Authorization', auth())
      .send({ title: '  Réserver le camping ' });
    expect(add.status).toBe(201);
    const task = add.body.tasks[0];
    expect(task.title).toBe('Réserver le camping');
    expect(task.priority).toBe('medium');
    expect(task.status).toBe('open');
    expect(task.assigneeId).toBeNull();
    expect(task.createdBy.id).toBe(memberId);

    const assign = await request(server())
      .patch(`/api/projects/${projectId}/tasks/${task.id}`)
      .set('Authorization', auth())
      .send({ assigneeId: audreyId, priority: 'blocking' });
    expect(assign.status).toBe(200);
    expect(assign.body.tasks[0].assignee.id).toBe(audreyId);
    expect(assign.body.tasks[0].priority).toBe('blocking');

    const unassign = await request(server())
      .patch(`/api/projects/${projectId}/tasks/${task.id}`)
      .set('Authorization', auth())
      .send({ assigneeId: null });
    expect(unassign.status).toBe(200);
    expect(unassign.body.tasks[0].assigneeId).toBeNull();

    const toggle = await request(server())
      .post(`/api/projects/${projectId}/tasks/${task.id}/toggle`)
      .set('Authorization', auth())
      .send({});
    expect(toggle.status).toBe(201);
    expect(toggle.body.tasks[0].status).toBe('done');
    expect(toggle.body.tasks[0].completedBy.id).toBe(memberId);
    expect(typeof toggle.body.tasks[0].completedAt).toBe('string');
  });

  it('rejects assigning someone outside the family', async () => {
    const project = await request(server())
      .post(`/api/families/${familyId}/projects`)
      .set('Authorization', auth())
      .send({ name: 'Test' });

    const res = await request(server())
      .post(`/api/projects/${project.body.id}/tasks`)
      .set('Authorization', auth())
      .send({
        title: 'X',
        assigneeId: '00000000-0000-4000-8000-000000000000',
      });
    expect(res.status).toBe(404);
  });

  it('adds then removes a comment on a task, carrying the signed-in author', async () => {
    const project = await request(server())
      .post(`/api/families/${familyId}/projects`)
      .set('Authorization', auth())
      .send({ name: 'Potager' });
    const projectId = project.body.id;

    const withTask = await request(server())
      .post(`/api/projects/${projectId}/tasks`)
      .set('Authorization', auth())
      .send({ title: 'Préparer la terre' });
    const taskId = withTask.body.tasks[0].id;

    const comment = await request(server())
      .post(`/api/projects/${projectId}/tasks/${taskId}/comments`)
      .set('Authorization', `Bearer ${audreyToken}`)
      .send({ body: '  Je m’en occupe samedi ' });
    expect(comment.status).toBe(201);
    expect(comment.body.tasks[0].comments).toHaveLength(1);
    expect(comment.body.tasks[0].comments[0].body).toBe(
      'Je m’en occupe samedi',
    );
    expect(comment.body.tasks[0].comments[0].author.id).toBe(audreyId);
    const commentId = comment.body.tasks[0].comments[0].id;

    const del = await request(server())
      .delete(
        `/api/projects/${projectId}/tasks/${taskId}/comments/${commentId}`,
      )
      .set('Authorization', auth());
    expect(del.status).toBe(200);
    expect(del.body.tasks[0].comments).toHaveLength(0);
  });

  it('archives then unarchives a project', async () => {
    const project = await request(server())
      .post(`/api/families/${familyId}/projects`)
      .set('Authorization', auth())
      .send({ name: 'Garage' });
    const projectId = project.body.id;

    const archive = await request(server())
      .post(`/api/projects/${projectId}/archive`)
      .set('Authorization', auth())
      .send({});
    expect(archive.status).toBe(201);
    expect(archive.body.status).toBe('archived');
    expect(typeof archive.body.archivedAt).toBe('string');

    const unarchive = await request(server())
      .post(`/api/projects/${projectId}/unarchive`)
      .set('Authorization', auth())
      .send({});
    expect(unarchive.status).toBe(201);
    expect(unarchive.body.status).toBe('active');
    expect(unarchive.body.archivedAt).toBeNull();
  });

  it('deletes a task, then the whole project', async () => {
    const project = await request(server())
      .post(`/api/families/${familyId}/projects`)
      .set('Authorization', auth())
      .send({ name: 'Éphémère' });
    const projectId = project.body.id;

    const withTask = await request(server())
      .post(`/api/projects/${projectId}/tasks`)
      .set('Authorization', auth())
      .send({ title: 'Temporaire' });
    const taskId = withTask.body.tasks[0].id;

    const delTask = await request(server())
      .delete(`/api/projects/${projectId}/tasks/${taskId}`)
      .set('Authorization', auth());
    expect(delTask.status).toBe(200);
    expect(delTask.body.tasks).toEqual([]);

    const delProject = await request(server())
      .delete(`/api/projects/${projectId}`)
      .set('Authorization', auth());
    expect(delProject.status).toBe(204);

    const snapshot = await request(server())
      .get(`/api/families/${familyId}/projects`)
      .set('Authorization', auth());
    const ids = snapshot.body.projects.map((p: { id: string }) => p.id);
    expect(ids).not.toContain(projectId);
  });

  it('shares the same board across the family (Audrey sees Bruno’s project)', async () => {
    const res = await request(server())
      .get(`/api/families/${familyId}/projects`)
      .set('Authorization', `Bearer ${audreyToken}`);
    expect(res.status).toBe(200);
    const names = res.body.projects.map((p: { name: string }) => p.name);
    expect(names).toContain('Salle de bain');
  });

  it('rejects invalid payloads (empty name, unknown priority, malformed assignee)', async () => {
    const project = await request(server())
      .post(`/api/families/${familyId}/projects`)
      .set('Authorization', auth())
      .send({ name: 'Validation' });
    const projectId = project.body.id;

    const emptyName = await request(server())
      .post(`/api/families/${familyId}/projects`)
      .set('Authorization', auth())
      .send({ name: '' });
    expect(emptyName.status).toBe(400);

    const badPriority = await request(server())
      .post(`/api/projects/${projectId}/tasks`)
      .set('Authorization', auth())
      .send({ title: 'X', priority: 'urgent' });
    expect(badPriority.status).toBe(400);

    const badAssignee = await request(server())
      .post(`/api/projects/${projectId}/tasks`)
      .set('Authorization', auth())
      .send({ title: 'X', assigneeId: 'not-a-uuid' });
    expect(badAssignee.status).toBe(400);
  });
});
