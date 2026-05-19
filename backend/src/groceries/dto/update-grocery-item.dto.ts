import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/**
 * Partial edit of an item. Every field is optional; only what is sent is
 * changed. `null` on `categoryId` clears the category.
 */
export class UpdateGroceryItemDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(999)
  quantity?: number;

  @IsOptional()
  @IsString()
  @MaxLength(24)
  unit?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(280)
  note?: string | null;

  @IsOptional()
  @IsUUID()
  categoryId?: string | null;
}
