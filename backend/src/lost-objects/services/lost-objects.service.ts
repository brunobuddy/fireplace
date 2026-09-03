import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Family } from '../../family/entities/family.entity';
import { LostObject } from '../entities/lost-object.entity';
import {
  ILostObjectRepository,
  LOST_OBJECT_REPOSITORY,
} from '../repositories/lost-object.repository';
import { CreateLostObjectDto } from '../dto/create-lost-object.dto';
import { CreateLostObjectCommentDto } from '../dto/create-lost-object-comment.dto';
import { LostObjectsGateway } from '../gateways/lost-objects.gateway';
import { NotificationsService } from '../../notifications/services/notifications.service';

export interface LostObjectSnapshot {
  objects: LostObject[];
}

@Injectable()
export class LostObjectsService {
  constructor(
    @Inject(LOST_OBJECT_REPOSITORY)
    private readonly objects: ILostObjectRepository,
    @InjectRepository(Family)
    private readonly families: Repository<Family>,
    private readonly gateway: LostObjectsGateway,
    private readonly notifications: NotificationsService,
  ) {}

  async getSnapshotForFamily(familyId: string): Promise<LostObjectSnapshot> {
    const objects = await this.objects.findByFamily(familyId);
    return { objects };
  }

  async report(
    familyId: string,
    dto: CreateLostObjectDto,
    memberId: string,
  ): Promise<LostObject> {
    await this.requireFamily(familyId);
    const object = await this.objects.create({
      familyId,
      name: dto.name.trim(),
      reportedById: memberId,
    });
    this.gateway.emitAdded(object);
    // Fire-and-forget: tell the rest of the family, never block the report.
    void this.notifications.notifyOthers(memberId, familyId, (actor) => ({
      title: 'Objet perdu 🔍',
      body: `${actor} a perdu « ${object.name} »`,
      url: '/lost-objects',
      tag: `lost-object-${object.id}`,
    }));
    return object;
  }

  async toggleFound(id: string, memberId: string): Promise<LostObject> {
    const current = await this.requireObject(id);
    const nowFound = current.status !== 'found';
    const updated = await this.objects.update(id, {
      status: nowFound ? 'found' : 'lost',
      foundById: nowFound ? memberId : null,
      foundAt: nowFound ? new Date().toISOString() : null,
    });
    this.gateway.emitUpdated(updated);
    if (nowFound) {
      void this.notifications.notifyOthers(
        memberId,
        updated.familyId,
        (actor) => ({
          title: 'Objet retrouvé 🎉',
          body: `${actor} a retrouvé « ${updated.name} »`,
          url: '/lost-objects',
          tag: `lost-object-found-${updated.id}`,
        }),
      );
    }
    return updated;
  }

  async remove(id: string): Promise<void> {
    const object = await this.requireObject(id);
    await this.objects.remove(id);
    this.gateway.emitRemoved({ id, familyId: object.familyId });
  }

  async addComment(
    objectId: string,
    dto: CreateLostObjectCommentDto,
    memberId: string,
  ): Promise<LostObject> {
    await this.requireObject(objectId);
    await this.objects.addComment({
      lostObjectId: objectId,
      authorId: memberId,
      body: dto.body.trim(),
    });
    const updated = await this.requireObject(objectId);
    this.gateway.emitUpdated(updated);
    void this.notifications.notifyOthers(
      memberId,
      updated.familyId,
      (actor) => ({
        title: 'Objet perdu 💬',
        body: `${actor} a suggéré un endroit pour « ${updated.name} »`,
        url: '/lost-objects',
        tag: `lost-object-comment-${objectId}`,
      }),
    );
    return updated;
  }

  async removeComment(
    objectId: string,
    commentId: string,
  ): Promise<LostObject> {
    await this.requireObject(objectId);
    const comment = await this.objects.findCommentById(commentId);
    if (!comment || comment.lostObjectId !== objectId) {
      throw new NotFoundException(`Commentaire ${commentId} introuvable`);
    }
    await this.objects.removeComment(commentId);
    const updated = await this.requireObject(objectId);
    this.gateway.emitUpdated(updated);
    return updated;
  }

  private async requireFamily(familyId: string): Promise<Family> {
    const family = await this.families.findOne({ where: { id: familyId } });
    if (!family) {
      throw new NotFoundException(`Famille ${familyId} introuvable`);
    }
    return family;
  }

  private async requireObject(id: string): Promise<LostObject> {
    const object = await this.objects.findById(id);
    if (!object) {
      throw new NotFoundException(`Objet ${id} introuvable`);
    }
    return object;
  }
}
