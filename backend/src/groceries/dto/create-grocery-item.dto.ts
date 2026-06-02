import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/**
 * Body for "add an item". The category is intentionally NOT here — auto-
 * categorization runs server-side after the row is persisted, and users
 * re-bucket through the row's category picker (or drag-and-drop) via the
 * PATCH endpoint. Keeping the add path category-free is the whole reason
 * the LLM categorizer exists: on mobile, picking an aisle while typing is
 * too much friction.
 */
export class CreateGroceryItemDto {
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(999)
  quantity?: number;

  @IsOptional()
  @IsString()
  @MaxLength(24)
  unit?: string;

  @IsOptional()
  @IsString()
  @MaxLength(280)
  note?: string;
}
