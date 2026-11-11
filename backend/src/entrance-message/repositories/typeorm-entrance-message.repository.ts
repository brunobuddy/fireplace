import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EntranceMessage } from '../entities/entrance-message.entity';
import {
  EntranceMessageWrite,
  IEntranceMessageRepository,
} from './entrance-message.repository';

@Injectable()
export class TypeOrmEntranceMessageRepository implements IEntranceMessageRepository {
  constructor(
    @InjectRepository(EntranceMessage)
    private readonly messages: Repository<EntranceMessage>,
  ) {}

  findByFamily(familyId: string): Promise<EntranceMessage | null> {
    return this.messages.findOne({
      where: { familyId },
      relations: { author: true },
    });
  }

  async upsert(data: EntranceMessageWrite): Promise<EntranceMessage> {
    const existing = await this.messages.findOne({
      where: { familyId: data.familyId },
    });
    if (existing) {
      // An explicit `updatedAt`: re-posting the same text is still fresh news,
      // and TypeORM would skip a save with no changed column.
      await this.messages.update(
        { id: existing.id },
        { text: data.text, authorId: data.authorId, updatedAt: new Date() },
      );
    } else {
      await this.messages.save(this.messages.create(data));
    }
    const saved = await this.findByFamily(data.familyId);
    if (!saved) {
      throw new Error(`Entrance message for ${data.familyId} vanished`);
    }
    return saved;
  }

  async clear(familyId: string): Promise<void> {
    await this.messages.delete({ familyId });
  }
}
