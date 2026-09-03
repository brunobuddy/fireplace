import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { GroceryList } from './entities/grocery-list.entity';
import { GroceryCategory } from './entities/grocery-category.entity';
import { GroceryItem } from './entities/grocery-item.entity';
import { GroceriesService } from './services/groceries.service';
import { GroceriesController } from './controllers/groceries.controller';
import { GroceriesGateway } from './gateways/groceries.gateway';
import { GROCERY_ITEM_REPOSITORY } from './repositories/grocery-item.repository';
import { TypeOrmGroceryItemRepository } from './repositories/typeorm-grocery-item.repository';
import { CATEGORY_CLASSIFIER } from './categorizer/category-classifier';
import { ManifestCategoryClassifier } from './categorizer/manifest-category-classifier';
import { StubCategoryClassifier } from './categorizer/stub-category-classifier';

@Module({
  imports: [
    TypeOrmModule.forFeature([GroceryList, GroceryCategory, GroceryItem]),
    AuthModule,
    NotificationsModule,
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
    // Auto-categorizer: deterministic stub under test, Manifest in dev/prod.
    // The Manifest adapter degrades gracefully when MANIFEST_API_KEY is unset
    // (items land in Uncategorized; users re-bucket by tap or drag).
    {
      provide: CATEGORY_CLASSIFIER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        process.env.NODE_ENV === 'test'
          ? new StubCategoryClassifier()
          : new ManifestCategoryClassifier(config),
    },
  ],
  exports: [GroceriesService],
})
export class GroceriesModule {}
