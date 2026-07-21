import {
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ProjectTaskPriority } from '../entities/project-task.entity';

export class CreateProjectTaskDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsIn(['low', 'medium', 'high', 'blocking'])
  priority?: ProjectTaskPriority;

  /** Member responsible for the task — must belong to the same family. */
  @IsOptional()
  @IsUUID()
  assigneeId?: string;
}
