import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Family } from '../../family/entities/family.entity';
import { Todo } from '../entities/todo.entity';
import {
  ITodoRepository,
  TODO_REPOSITORY,
  TodoChanges,
} from '../repositories/todo.repository';
import { CreateTodoDto } from '../dto/create-todo.dto';
import { UpdateTodoDto } from '../dto/update-todo.dto';
import { CreateTodoCommentDto } from '../dto/create-todo-comment.dto';
import { TodosGateway } from '../gateways/todos.gateway';

export interface TodoSnapshot {
  todos: Todo[];
}

@Injectable()
export class TodosService {
  constructor(
    @Inject(TODO_REPOSITORY)
    private readonly todos: ITodoRepository,
    @InjectRepository(Family)
    private readonly families: Repository<Family>,
    private readonly gateway: TodosGateway,
  ) {}

  async getSnapshotForFamily(familyId: string): Promise<TodoSnapshot> {
    const todos = await this.todos.findByFamily(familyId);
    return { todos };
  }

  async addTodo(
    familyId: string,
    dto: CreateTodoDto,
    memberId: string,
  ): Promise<Todo> {
    await this.requireFamily(familyId);
    const todo = await this.todos.create({
      familyId,
      title: dto.title.trim(),
      description: dto.description?.trim() || null,
      criticality: dto.criticality ?? 'medium',
      createdById: memberId,
    });
    this.gateway.emitTodoAdded(todo);
    return todo;
  }

  async updateTodo(id: string, dto: UpdateTodoDto): Promise<Todo> {
    const current = await this.requireTodo(id);
    const changes = this.buildChanges(dto);
    if (Object.keys(changes).length === 0) {
      return current;
    }
    const updated = await this.todos.update(id, changes);
    this.gateway.emitTodoUpdated(updated);
    return updated;
  }

  async toggleTodo(id: string, memberId: string): Promise<Todo> {
    const current = await this.requireTodo(id);
    const nowDone = current.status !== 'done';
    const updated = await this.todos.update(id, {
      status: nowDone ? 'done' : 'open',
      completedById: nowDone ? memberId : null,
      completedAt: nowDone ? new Date().toISOString() : null,
    });
    this.gateway.emitTodoUpdated(updated);
    return updated;
  }

  async removeTodo(id: string): Promise<void> {
    const todo = await this.requireTodo(id);
    await this.todos.remove(id);
    this.gateway.emitTodoRemoved({ id, familyId: todo.familyId });
  }

  async addComment(
    todoId: string,
    dto: CreateTodoCommentDto,
    memberId: string,
  ): Promise<Todo> {
    await this.requireTodo(todoId);
    await this.todos.addComment({
      todoId,
      authorId: memberId,
      body: dto.body.trim(),
    });
    const updated = await this.requireTodo(todoId);
    this.gateway.emitTodoUpdated(updated);
    return updated;
  }

  async removeComment(todoId: string, commentId: string): Promise<Todo> {
    await this.requireTodo(todoId);
    const comment = await this.todos.findCommentById(commentId);
    if (!comment || comment.todoId !== todoId) {
      throw new NotFoundException(`Comment ${commentId} not found`);
    }
    await this.todos.removeComment(commentId);
    const updated = await this.requireTodo(todoId);
    this.gateway.emitTodoUpdated(updated);
    return updated;
  }

  private buildChanges(dto: UpdateTodoDto): TodoChanges {
    const changes: TodoChanges = {};
    if (dto.title !== undefined) {
      changes.title = dto.title.trim();
    }
    if (dto.description !== undefined) {
      changes.description = dto.description?.trim() || null;
    }
    if (dto.criticality !== undefined) {
      changes.criticality = dto.criticality;
    }
    return changes;
  }

  private async requireFamily(familyId: string): Promise<Family> {
    const family = await this.families.findOne({ where: { id: familyId } });
    if (!family) {
      throw new NotFoundException(`Family ${familyId} not found`);
    }
    return family;
  }

  private async requireTodo(id: string): Promise<Todo> {
    const todo = await this.todos.findById(id);
    if (!todo) {
      throw new NotFoundException(`Todo ${id} not found`);
    }
    return todo;
  }
}
