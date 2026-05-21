import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Todo } from '../entities/todo.entity';
import { TodoComment } from '../entities/todo-comment.entity';
import {
  ITodoRepository,
  NewTodo,
  NewTodoComment,
  TodoChanges,
} from './todo.repository';

@Injectable()
export class TypeOrmTodoRepository implements ITodoRepository {
  constructor(
    @InjectRepository(Todo)
    private readonly todos: Repository<Todo>,
    @InjectRepository(TodoComment)
    private readonly comments: Repository<TodoComment>,
  ) {}

  private readonly relations = {
    createdBy: true,
    completedBy: true,
    comments: { author: true },
  };

  findByFamily(familyId: string): Promise<Todo[]> {
    return this.todos.find({
      where: { familyId },
      relations: this.relations,
      order: { createdAt: 'DESC' },
    });
  }

  findById(id: string): Promise<Todo | null> {
    return this.todos.findOne({ where: { id }, relations: this.relations });
  }

  async create(data: NewTodo): Promise<Todo> {
    const saved = await this.todos.save(this.todos.create(data));
    return this.requireById(saved.id);
  }

  async update(id: string, changes: TodoChanges): Promise<Todo> {
    await this.todos.update({ id }, changes);
    return this.requireById(id);
  }

  async remove(id: string): Promise<void> {
    await this.todos.delete({ id });
  }

  async addComment(data: NewTodoComment): Promise<TodoComment> {
    const saved = await this.comments.save(this.comments.create(data));
    const withAuthor = await this.comments.findOne({
      where: { id: saved.id },
      relations: { author: true },
    });
    if (!withAuthor) {
      throw new Error(`Comment ${saved.id} vanished after write`);
    }
    return withAuthor;
  }

  findCommentById(id: string): Promise<TodoComment | null> {
    return this.comments.findOne({ where: { id } });
  }

  async removeComment(id: string): Promise<void> {
    await this.comments.delete({ id });
  }

  private async requireById(id: string): Promise<Todo> {
    const todo = await this.findById(id);
    if (!todo) {
      throw new Error(`Todo ${id} vanished after write`);
    }
    return todo;
  }
}
