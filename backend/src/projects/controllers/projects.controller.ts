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
import { ProjectsService, ProjectSnapshot } from '../services/projects.service';
import { ProjectTasksService } from '../services/project-tasks.service';
import { Project } from '../entities/project.entity';
import { CreateProjectDto } from '../dto/create-project.dto';
import { UpdateProjectDto } from '../dto/update-project.dto';
import { CreateProjectTaskDto } from '../dto/create-project-task.dto';
import { UpdateProjectTaskDto } from '../dto/update-project-task.dto';
import { CreateTaskCommentDto } from '../dto/create-task-comment.dto';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthUser } from '../../auth/auth.types';

/**
 * Thin HTTP layer over the two project services. Task/comment mutations all
 * answer with the full updated project — the same payload the websocket
 * broadcasts — so the client has one "upsert a project" path.
 */
@Controller()
export class ProjectsController {
  constructor(
    private readonly projects: ProjectsService,
    private readonly tasks: ProjectTasksService,
  ) {}

  @Get('families/:familyId/projects')
  snapshot(
    @Param('familyId', ParseUUIDPipe) familyId: string,
  ): Promise<ProjectSnapshot> {
    return this.projects.getSnapshotForFamily(familyId);
  }

  @Post('families/:familyId/projects')
  add(
    @Param('familyId', ParseUUIDPipe) familyId: string,
    @Body() dto: CreateProjectDto,
    @CurrentUser() user: AuthUser,
  ): Promise<Project> {
    return this.projects.addProject(familyId, dto, user.memberId);
  }

  @Patch('projects/:id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectDto,
  ): Promise<Project> {
    return this.projects.updateProject(id, dto);
  }

  @Post('projects/:id/archive')
  archive(@Param('id', ParseUUIDPipe) id: string): Promise<Project> {
    return this.projects.setArchived(id, true);
  }

  @Post('projects/:id/unarchive')
  unarchive(@Param('id', ParseUUIDPipe) id: string): Promise<Project> {
    return this.projects.setArchived(id, false);
  }

  @Delete('projects/:id')
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.projects.removeProject(id);
  }

  @Post('projects/:id/tasks')
  addTask(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateProjectTaskDto,
    @CurrentUser() user: AuthUser,
  ): Promise<Project> {
    return this.tasks.addTask(id, dto, user.memberId);
  }

  @Patch('projects/:projectId/tasks/:taskId')
  updateTask(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() dto: UpdateProjectTaskDto,
  ): Promise<Project> {
    return this.tasks.updateTask(projectId, taskId, dto);
  }

  @Post('projects/:projectId/tasks/:taskId/toggle')
  toggleTask(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<Project> {
    return this.tasks.toggleTask(projectId, taskId, user.memberId);
  }

  @Delete('projects/:projectId/tasks/:taskId')
  removeTask(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
  ): Promise<Project> {
    return this.tasks.removeTask(projectId, taskId);
  }

  @Post('projects/:projectId/tasks/:taskId/comments')
  addComment(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() dto: CreateTaskCommentDto,
    @CurrentUser() user: AuthUser,
  ): Promise<Project> {
    return this.tasks.addComment(projectId, taskId, dto, user.memberId);
  }

  @Delete('projects/:projectId/tasks/:taskId/comments/:commentId')
  removeComment(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Param('commentId', ParseUUIDPipe) commentId: string,
  ): Promise<Project> {
    return this.tasks.removeComment(projectId, taskId, commentId);
  }
}
