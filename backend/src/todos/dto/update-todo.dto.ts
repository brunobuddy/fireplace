import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { TodoCriticality } from '../entities/todo.entity';

export class UpdateTodoDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @IsOptional()
  @IsIn(['low', 'medium', 'high'])
  criticality?: TodoCriticality;
}
