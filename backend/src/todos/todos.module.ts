import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Family } from '../family/entities/family.entity';
import { Todo } from './entities/todo.entity';
import { TodoComment } from './entities/todo-comment.entity';
import { TodosService } from './services/todos.service';
import { TodosController } from './controllers/todos.controller';
import { TodosGateway } from './gateways/todos.gateway';
import { TODO_REPOSITORY } from './repositories/todo.repository';
import { TypeOrmTodoRepository } from './repositories/typeorm-todo.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Todo, TodoComment, Family])],
  controllers: [TodosController],
  providers: [
    TodosService,
    TodosGateway,
    {
      provide: TODO_REPOSITORY,
      useClass: TypeOrmTodoRepository,
    },
  ],
  exports: [TodosService],
})
export class TodosModule {}
