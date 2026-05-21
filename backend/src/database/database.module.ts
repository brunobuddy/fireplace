import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { buildDatabaseConfig } from '../config/database.config';
import { Family } from '../family/entities/family.entity';
import { Member } from '../family/entities/member.entity';
import { GroceryList } from '../groceries/entities/grocery-list.entity';
import { GroceryCategory } from '../groceries/entities/grocery-category.entity';
import { Todo } from '../todos/entities/todo.entity';
import { TodoComment } from '../todos/entities/todo-comment.entity';
import { SeederService } from './seed/seeder.service';

/**
 * Owns the database connection (env-driven config) and the bootstrap seeder.
 * Global so feature modules only need `TypeOrmModule.forFeature(...)`.
 */
@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({ useFactory: buildDatabaseConfig }),
    TypeOrmModule.forFeature([
      Family,
      Member,
      GroceryList,
      GroceryCategory,
      Todo,
      TodoComment,
    ]),
  ],
  providers: [SeederService],
})
export class DatabaseModule {}
