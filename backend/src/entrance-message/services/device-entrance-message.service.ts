import { createHash, timingSafeEqual } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Family } from '../../family/entities/family.entity';
import { HOUSEHOLD_FAMILY_NAME } from '../../database/seed/seeder.service';
import { EntranceMessageService } from './entrance-message.service';
import { formatForDevice } from './entrance-message.view';

/**
 * Read-only access for the e-ink screen at the entrance. It cannot draw the
 * unlock pattern, so it carries a static `DEVICE_TOKEN` instead. Fail closed:
 * with no token configured, nothing is authorized.
 */
@Injectable()
export class DeviceEntranceMessageService {
  private readonly logger = new Logger(DeviceEntranceMessageService.name);

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(Family)
    private readonly families: Repository<Family>,
    private readonly messages: EntranceMessageService,
  ) {}

  /** `Authorization: Bearer <DEVICE_TOKEN>`, compared in constant time. */
  isAuthorized(header: string | undefined): boolean {
    const expected = this.config.get<string>('DEVICE_TOKEN')?.trim();
    if (!expected) {
      this.logger.warn('Device request refused: DEVICE_TOKEN is not set');
      return false;
    }
    const match = /^Bearer\s+(\S+)\s*$/.exec(header ?? '');
    if (!match) {
      return false;
    }
    // Hash both sides so the comparison runs on equal lengths and leaks
    // neither the token nor its length through timing.
    return timingSafeEqual(sha256(match[1]), sha256(expected));
  }

  /** The device rendering of the message, or null when there is none. */
  async render(): Promise<string | null> {
    const familyId = await this.resolveFamilyId();
    if (!familyId) {
      return null;
    }
    const view = await this.messages.findView(familyId);
    return view ? formatForDevice(view) : null;
  }

  /**
   * `DEVICE_FAMILY_ID` when set; otherwise the household the seeder creates
   * (by its fixed name), falling back to the oldest family.
   */
  private async resolveFamilyId(): Promise<string | null> {
    const configured = this.config.get<string>('DEVICE_FAMILY_ID')?.trim();
    if (configured) {
      return configured;
    }
    const household =
      (await this.families.findOne({
        where: { name: HOUSEHOLD_FAMILY_NAME },
        order: { createdAt: 'ASC' },
      })) ??
      (await this.families.findOne({ where: {}, order: { createdAt: 'ASC' } }));
    return household?.id ?? null;
  }
}

function sha256(value: string): Buffer {
  return createHash('sha256').update(value, 'utf8').digest();
}
