import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

/**
 * One browser's Web Push subscription, owned by the member who enabled
 * notifications on that device. A member can hold several rows (phone +
 * desktop). The endpoint is the push service's unique URL for the device, so
 * it doubles as the natural key: re-subscribing upserts on it, and a 404/410
 * from the push service deletes it.
 */
@Entity('push_subscriptions')
export class PushSubscription extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 1000 })
  endpoint!: string;

  /** Client public key (ECDH) — part of the standard PushSubscription JSON. */
  @Column({ type: 'varchar', length: 255 })
  p256dh!: string;

  /** Auth secret — the other half of the standard PushSubscription JSON. */
  @Column({ type: 'varchar', length: 255 })
  auth!: string;

  @Index()
  @Column({ type: 'uuid' })
  memberId!: string;

  @Index()
  @Column({ type: 'uuid' })
  familyId!: string;
}
