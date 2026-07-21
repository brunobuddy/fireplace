import {
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ProjectTaskPriority } from '../entities/project-task.entity';

export class UpdateProjectTaskDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsIn(['low', 'medium', 'high', 'blocking'])
  priority?: ProjectTaskPriority;

  /**
   * `null` explicitly unassigns (IsOptional lets null through untouched);
   * omitting the field leaves the assignee as-is.
   */
  @IsOptional()
  @IsUUID()
  assigneeId?: string | null;
}
