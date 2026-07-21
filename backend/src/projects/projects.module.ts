import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Family } from '../family/entities/family.entity';
import { Member } from '../family/entities/member.entity';
import { Project } from './entities/project.entity';
import { ProjectTask } from './entities/project-task.entity';
import { ProjectTaskComment } from './entities/project-task-comment.entity';
import { ProjectsService } from './services/projects.service';
import { ProjectTasksService } from './services/project-tasks.service';
import { ProjectsController } from './controllers/projects.controller';
import { ProjectsGateway } from './gateways/projects.gateway';
import { PROJECT_REPOSITORY } from './repositories/project.repository';
import { TypeOrmProjectRepository } from './repositories/typeorm-project.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Project,
      ProjectTask,
      ProjectTaskComment,
      Family,
      Member,
    ]),
    AuthModule,
  ],
  controllers: [ProjectsController],
  providers: [
    ProjectsService,
    ProjectTasksService,
    ProjectsGateway,
    {
      provide: PROJECT_REPOSITORY,
      useClass: TypeOrmProjectRepository,
    },
  ],
  exports: [ProjectsService],
})
export class ProjectsModule {}
