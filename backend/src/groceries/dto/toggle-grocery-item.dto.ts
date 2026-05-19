import { IsUUID } from 'class-validator';

/**
 * Marks an item done/pending. We record *who* toggled it so the other
 * shopper sees "Dad got the milk".
 */
export class ToggleGroceryItemDto {
  @IsUUID()
  memberId!: string;
}
