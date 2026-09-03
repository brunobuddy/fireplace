import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsObject,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

/** The `keys` half of the standard `PushSubscription.toJSON()` shape. */
export class SubscriptionKeysDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  p256dh!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  auth!: string;
}

/** Mirrors what the browser hands back from `pushManager.subscribe()`. */
export class SaveSubscriptionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  endpoint!: string;

  @IsObject()
  @ValidateNested()
  @Type(() => SubscriptionKeysDto)
  keys!: SubscriptionKeysDto;
}

export class RemoveSubscriptionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  endpoint!: string;
}
