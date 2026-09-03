import { NotFoundException } from '@nestjs/common';
import { TodosService } from './todos.service';
import { ITodoRepository } from '../repositories/todo.repository';
import { Todo } from '../entities/todo.entity';
import { TodosGateway } from '../gateways/todos.gateway';

const makeTodo = (over: Partial<Todo> = {}): Todo =>
  ({
    id: 'todo-1',
    title: 'Book the dentist',
    description: null,
    criticality: 'medium',
    status: 'open',
    familyId: 'fam-1',
    createdById: 'mem-1',
    completedById: null,
    completedAt: null,
    comments: [],
    ...over,
  }) as Todo;

describe('TodosService', () => {
  let todos: jest.Mocked<ITodoRepository>;
  let gateway: jest.Mocked<
    Pick<TodosGateway, 'emitTodoAdded' | 'emitTodoUpdated' | 'emitTodoRemoved'>
  >;
  let families: { findOne: jest.Mock };
  let notifications: { notifyOthers: jest.Mock };
  let service: TodosService;

  beforeEach(() => {
    todos = {
      findByFamily: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      addComment: jest.fn(),
      findCommentById: jest.fn(),
      removeComment: jest.fn(),
    };
    gateway = {
      emitTodoAdded: jest.fn(),
      emitTodoUpdated: jest.fn(),
      emitTodoRemoved: jest.fn(),
    };
    families = { findOne: jest.fn() };
    notifications = { notifyOthers: jest.fn().mockResolvedValue(undefined) };
    service = new TodosService(
      todos,
      families as never,
      gateway as never,
      notifications as never,
    );
  });

  describe('addTodo', () => {
    it('trims the title, defaults criticality, stamps the signed-in member, broadcasts', async () => {
      families.findOne.mockResolvedValue({ id: 'fam-1' });
      const created = makeTodo({ title: 'Water plants', createdById: 'mem-1' });
      todos.create.mockResolvedValue(created);

      const result = await service.addTodo(
        'fam-1',
        { title: '  Water plants  ' },
        'mem-1',
      );

      expect(todos.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Water plants',
          criticality: 'medium',
          familyId: 'fam-1',
          createdById: 'mem-1',
        }),
      );
      expect(gateway.emitTodoAdded).toHaveBeenCalledWith(created);
      expect(result).toBe(created);
    });

    it('rejects when the family does not exist', async () => {
      families.findOne.mockResolvedValue(null);
      await expect(
        service.addTodo('missing', { title: 'X' }, 'mem-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(todos.create).not.toHaveBeenCalled();
    });
  });

  describe('toggleTodo', () => {
    it('marks an open todo done, stamping who and when', async () => {
      todos.findById.mockResolvedValue(makeTodo({ status: 'open' }));
      const done = makeTodo({ status: 'done', completedById: 'mem-2' });
      todos.update.mockResolvedValue(done);

      const result = await service.toggleTodo('todo-1', 'mem-2');

      expect(todos.update).toHaveBeenCalledWith(
        'todo-1',
        expect.objectContaining({
          status: 'done',
          completedById: 'mem-2',
          completedAt: expect.any(String),
        }),
      );
      expect(gateway.emitTodoUpdated).toHaveBeenCalledWith(done);
      expect(result.status).toBe('done');
    });

    it('reopens a done todo and clears the completion stamps', async () => {
      todos.findById.mockResolvedValue(makeTodo({ status: 'done' }));
      todos.update.mockResolvedValue(makeTodo({ status: 'open' }));

      await service.toggleTodo('todo-1', 'mem-2');

      expect(todos.update).toHaveBeenCalledWith('todo-1', {
        status: 'open',
        completedById: null,
        completedAt: null,
      });
    });
  });

  describe('updateTodo', () => {
    it('changes criticality and broadcasts', async () => {
      todos.findById.mockResolvedValue(makeTodo());
      const updated = makeTodo({ criticality: 'high' });
      todos.update.mockResolvedValue(updated);

      const result = await service.updateTodo('todo-1', {
        criticality: 'high',
      });

      expect(todos.update).toHaveBeenCalledWith('todo-1', {
        criticality: 'high',
      });
      expect(gateway.emitTodoUpdated).toHaveBeenCalledWith(updated);
      expect(result.criticality).toBe('high');
    });

    it('is a no-op (no write, no broadcast) when nothing changes', async () => {
      const current = makeTodo();
      todos.findById.mockResolvedValue(current);

      const result = await service.updateTodo('todo-1', {});

      expect(todos.update).not.toHaveBeenCalled();
      expect(gateway.emitTodoUpdated).not.toHaveBeenCalled();
      expect(result).toBe(current);
    });
  });

  describe('addComment', () => {
    it('persists the comment with the signed-in member, then re-broadcasts the whole todo', async () => {
      const withComment = makeTodo({
        comments: [{ id: 'c1', body: 'On it!' } as never],
      });
      todos.findById.mockResolvedValue(withComment);
      todos.addComment.mockResolvedValue({ id: 'c1' } as never);

      const result = await service.addComment(
        'todo-1',
        { body: '  On it!  ' },
        'mem-2',
      );

      expect(todos.addComment).toHaveBeenCalledWith({
        todoId: 'todo-1',
        authorId: 'mem-2',
        body: 'On it!',
      });
      expect(gateway.emitTodoUpdated).toHaveBeenCalledWith(withComment);
      expect(result).toBe(withComment);
    });
  });

  describe('removeTodo', () => {
    it('removes the todo and broadcasts the removal', async () => {
      todos.findById.mockResolvedValue(makeTodo({ familyId: 'fam-9' }));

      await service.removeTodo('todo-1');

      expect(todos.remove).toHaveBeenCalledWith('todo-1');
      expect(gateway.emitTodoRemoved).toHaveBeenCalledWith({
        id: 'todo-1',
        familyId: 'fam-9',
      });
    });
  });
});
