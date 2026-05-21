import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { TodosService, TodoSnapshot } from '../services/todos.service';
import { Todo } from '../entities/todo.entity';
import { CreateTodoDto } from '../dto/create-todo.dto';
import { UpdateTodoDto } from '../dto/update-todo.dto';
import { ToggleTodoDto } from '../dto/toggle-todo.dto';
import { CreateTodoCommentDto } from '../dto/create-todo-comment.dto';

@Controller()
export class TodosController {
  constructor(private readonly todos: TodosService) {}

  @Get('families/:familyId/todos')
  snapshot(
    @Param('familyId', ParseUUIDPipe) familyId: string,
  ): Promise<TodoSnapshot> {
    return this.todos.getSnapshotForFamily(familyId);
  }

  @Post('families/:familyId/todos')
  add(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Body() dto: CreateTodoDto,
  ): Promise<Todo> {
    return this.todos.addTodo(familyId, dto);
  }

  @Patch('todos/:id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTodoDto,
  ): Promise<Todo> {
    return this.todos.updateTodo(id, dto);
  }

  @Post('todos/:id/toggle')
  toggle(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ToggleTodoDto,
  ): Promise<Todo> {
    return this.todos.toggleTodo(id, dto);
  }

  @Delete('todos/:id')
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.todos.removeTodo(id);
  }

  @Post('todos/:id/comments')
  addComment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateTodoCommentDto,
  ): Promise<Todo> {
    return this.todos.addComment(id, dto);
  }

  @Delete('todos/:todoId/comments/:commentId')
  removeComment(
    @Param('todoId', ParseUUIDPipe) todoId: string,
    @Param('commentId', ParseUUIDPipe) commentId: string,
  ): Promise<Todo> {
    return this.todos.removeComment(todoId, commentId);
  }
}
