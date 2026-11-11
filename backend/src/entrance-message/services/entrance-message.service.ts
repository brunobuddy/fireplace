import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthUser } from '../../auth/auth.types';
import { Family } from '../../family/entities/family.entity';
import { NotificationsService } from '../../notifications/services/notifications.service';
import {
  ENTRANCE_MESSAGE_REPOSITORY,
  IEntranceMessageRepository,
} from '../repositories/entrance-message.repository';
import { EntranceMessageGateway } from '../gateways/entrance-message.gateway';
import {
  EntranceMessageResponse,
  EntranceMessageView,
  toEntranceMessageView,
} from './entrance-message.view';

/** Longest message excerpt carried in a push body. */
const PUSH_EXCERPT_LENGTH = 100;

/**
 * Use cases for the entrance message: read it, replace it, clear it. The
 * author is always the signed-in member (from the JWT), never the client.
 */
@Injectable()
export class EntranceMessageService {
  constructor(
    @Inject(ENTRANCE_MESSAGE_REPOSITORY)
    private readonly messages: IEntranceMessageRepository,
    @InjectRepository(Family)
    private readonly families: Repository<Family>,
    private readonly gateway: EntranceMessageGateway,
    private readonly notifications: NotificationsService,
  ) {}

  async get(
    familyId: string,
    user: AuthUser,
  ): Promise<EntranceMessageResponse> {
    assertOwnFamily(familyId, user);
    return { message: await this.findView(familyId) };
  }

  /** Current message of any family — for the device endpoint. */
  async findView(familyId: string): Promise<EntranceMessageView | null> {
    const message = await this.messages.findByFamily(familyId);
    return message ? toEntranceMessageView(message) : null;
  }

  /**
   * Replace the family's message; an empty (or whitespace-only) text clears
   * it. Either way every open app gets the new state over the socket.
   */
  async set(
    familyId: string,
    rawText: string,
    user: AuthUser,
  ): Promise<EntranceMessageResponse> {
    assertOwnFamily(familyId, user);
    await this.requireFamily(familyId);
    const text = rawText.trim();
    if (!text) {
      await this.messages.clear(familyId);
      this.gateway.emitUpdated({ familyId, message: null });
      return { message: null };
    }
    const saved = await this.messages.upsert({
      familyId,
      text,
      authorId: user.memberId,
    });
    const message = toEntranceMessageView(saved);
    this.gateway.emitUpdated({ familyId, message });
    // Fire-and-forget: tell the rest of the family, never block the write.
    void this.notifications.notifyOthers(user.memberId, familyId, (actor) => ({
      title: 'Message pour l’entrée 📌',
      body: `${actor} : ${excerpt(text)}`,
      url: '/',
      tag: 'entrance-message',
    }));
    return { message };
  }

  private async requireFamily(familyId: string): Promise<Family> {
    const family = await this.families.findOne({ where: { id: familyId } });
    if (!family) {
      throw new NotFoundException(`Famille ${familyId} introuvable`);
    }
    return family;
  }
}

/** A member only reads and writes their own family's entrance screen. */
function assertOwnFamily(familyId: string, user: AuthUser): void {
  if (user.familyId !== familyId) {
    throw new ForbiddenException('Cette famille n’est pas la vôtre');
  }
}

/** One line, cut on a sensible length for a notification body. */
export function excerpt(text: string): string {
  const oneLine = text.replace(/\s+/g, ' ').trim();
  if (oneLine.length <= PUSH_EXCERPT_LENGTH) {
    return oneLine;
  }
  return `${oneLine.slice(0, PUSH_EXCERPT_LENGTH - 1).trimEnd()}…`;
}
