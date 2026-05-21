import { IsUUID } from 'class-validator';

export class ToggleTodoDto {
  @IsUUID()
  memberId!: string;
}
