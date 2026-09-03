import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LostObject } from '../entities/lost-object.entity';
import { LostObjectComment } from '../entities/lost-object-comment.entity';
import {
  ILostObjectRepository,
  LostObjectChanges,
  NewLostObject,
  NewLostObjectComment,
} from './lost-object.repository';

@Injectable()
export class TypeOrmLostObjectRepository implements ILostObjectRepository {
  constructor(
    @InjectRepository(LostObject)
    private readonly objects: Repository<LostObject>,
    @InjectRepository(LostObjectComment)
    private readonly comments: Repository<LostObjectComment>,
  ) {}

  private readonly relations = {
    reportedBy: true,
    foundBy: true,
    comments: { author: true },
  };

  findByFamily(familyId: string): Promise<LostObject[]> {
    return this.objects.find({
      where: { familyId },
      relations: this.relations,
      order: { createdAt: 'DESC' },
    });
  }

  findById(id: string): Promise<LostObject | null> {
    return this.objects.findOne({ where: { id }, relations: this.relations });
  }

  async create(data: NewLostObject): Promise<LostObject> {
    const saved = await this.objects.save(this.objects.create(data));
    return this.requireById(saved.id);
  }

  async update(id: string, changes: LostObjectChanges): Promise<LostObject> {
    await this.objects.update({ id }, changes);
    return this.requireById(id);
  }

  async remove(id: string): Promise<void> {
    await this.objects.delete({ id });
  }

  async addComment(data: NewLostObjectComment): Promise<LostObjectComment> {
    const saved = await this.comments.save(this.comments.create(data));
    const withAuthor = await this.comments.findOne({
      where: { id: saved.id },
      relations: { author: true },
    });
    if (!withAuthor) {
      throw new Error(`Comment ${saved.id} vanished after write`);
    }
    return withAuthor;
  }

  findCommentById(id: string): Promise<LostObjectComment | null> {
    return this.comments.findOne({ where: { id } });
  }

  async removeComment(id: string): Promise<void> {
    await this.comments.delete({ id });
  }

  private async requireById(id: string): Promise<LostObject> {
    const object = await this.findById(id);
    if (!object) {
      throw new Error(`Lost object ${id} vanished after write`);
    }
    return object;
  }
}
