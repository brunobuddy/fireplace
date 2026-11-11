import { Transform } from 'class-transformer';
import { IsString, MaxLength } from 'class-validator';
import { ENTRANCE_MESSAGE_MAX_LENGTH } from '../entities/entrance-message.entity';

/**
 * The whole message, replacing the previous one. Trimmed before validation so
 * the 280 limit counts what will actually be shown; an empty string is valid
 * and means "clear the screen".
 */
export class UpdateEntranceMessageDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(ENTRANCE_MESSAGE_MAX_LENGTH)
  text!: string;
}
