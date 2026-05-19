import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { FamilyModule } from './family/family.module';
import { GroceriesModule } from './groceries/groceries.module';

/**
 * Composition root. Feature modules are independent and added here as the
 * family app grows (agenda, conversations, …) — none of them edit each other.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    HealthModule,
    FamilyModule,
    GroceriesModule,
  ],
})
export class AppModule {}
