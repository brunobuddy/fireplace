import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { Member } from '../../family/entities/member.entity';
import { PushSubscription } from '../entities/push-subscription.entity';
import {
  IPushSender,
  PUSH_SENDER,
  PushPayload,
  PushSubscriptionGoneError,
} from '../sender/push-sender';
import { SaveSubscriptionDto } from '../dto/save-subscription.dto';

/**
 * Web Push use cases: manage device subscriptions and fan a message out to
 * everyone in the family *except* the person who acted — the whole point is
 * telling the others. Delivery is best-effort by design: a failed push must
 * never fail (or slow) the mutation that triggered it, so feature services
 * call {@link notifyOthers} fire-and-forget and every error stops here.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(PushSubscription)
    private readonly subscriptions: Repository<PushSubscription>,
    @InjectRepository(Member)
    private readonly members: Repository<Member>,
    @Inject(PUSH_SENDER)
    private readonly sender: IPushSender,
  ) {}

  /** `null` means push is not configured — the client hides the toggle. */
  getPublicKey(): { publicKey: string | null } {
    return { publicKey: this.sender.publicKey };
  }

  /**
   * Upsert by endpoint: the browser may re-subscribe the same device, and a
   * shared device switching accounts must re-own the row, not duplicate it.
   */
  async saveSubscription(
    memberId: string,
    familyId: string,
    dto: SaveSubscriptionDto,
  ): Promise<void> {
    const existing = await this.subscriptions.findOne({
      where: { endpoint: dto.endpoint },
    });
    const row = existing ?? this.subscriptions.create();
    row.endpoint = dto.endpoint;
    row.p256dh = dto.keys.p256dh;
    row.auth = dto.keys.auth;
    row.memberId = memberId;
    row.familyId = familyId;
    await this.subscriptions.save(row);
  }

  /** Scoped to the caller — nobody deletes another member's subscription. */
  async removeSubscription(memberId: string, endpoint: string): Promise<void> {
    await this.subscriptions.delete({ endpoint, memberId });
  }

  /**
   * Push `build(actorName)` to every family device except the actor's own.
   * Never throws; revoked subscriptions (404/410) are pruned as they surface.
   */
  async notifyOthers(
    actorMemberId: string,
    familyId: string,
    build: (actorName: string) => PushPayload,
  ): Promise<void> {
    if (!this.sender.publicKey) {
      return;
    }
    try {
      const targets = await this.subscriptions.find({
        where: { familyId, memberId: Not(actorMemberId) },
      });
      if (targets.length === 0) {
        return;
      }
      const actor = await this.members.findOne({
        where: { id: actorMemberId },
      });
      const payload = build(actor?.name ?? 'Quelqu’un');
      await Promise.all(targets.map((t) => this.deliver(t, payload)));
    } catch (error) {
      this.logger.warn(`Push fan-out failed: ${describe(error)}`);
    }
  }

  private async deliver(
    target: PushSubscription,
    payload: PushPayload,
  ): Promise<void> {
    try {
      await this.sender.send(target, payload);
    } catch (error) {
      if (error instanceof PushSubscriptionGoneError) {
        await this.subscriptions.delete({ endpoint: target.endpoint });
        return;
      }
      this.logger.warn(`Push to ${target.endpoint} failed: ${describe(error)}`);
    }
  }
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}
