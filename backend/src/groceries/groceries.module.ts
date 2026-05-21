import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { GroceryList } from './entities/grocery-list.entity';
import { GroceryCategory } from './entities/grocery-category.entity';
import { GroceryItem } from './entities/grocery-item.entity';
import { GroceriesService } from './services/groceries.service';
import { GroceriesController } from './controllers/groceries.controller';
import { GroceriesGateway } from './gateways/groceries.gateway';
import { GROCERY_ITEM_REPOSITORY } from './repositories/grocery-item.repository';
import { TypeOrmGroceryItemRepository } from './repositories/typeorm-grocery-item.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([GroceryList, GroceryCategory, GroceryItem]),
    AuthModule,
  ],
  controllers: [GroceriesController],
  providers: [
    GroceriesService,
    GroceriesGateway,
    // Dependency Inversion: bind the port to the TypeORM adapter. Swap this
    // single line to change the persistence technology.
    {
      provide: GROCERY_ITEM_REPOSITORY,
      useClass: TypeOrmGroceryItemRepository,
    },
  ],
  exports: [GroceriesService],
})
export class GroceriesModule {}
