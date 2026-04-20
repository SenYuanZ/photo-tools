import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { InviteCode } from '../database/entities/invite-code.entity';
import { CreateInviteCodeDto } from './dto/create-invite-code.dto';
import { UpdateInviteCodeDto } from './dto/update-invite-code.dto';

type InviteCodeView = InviteCode & {
  remainingUses: number | null;
};

const DISPLAY_VISIBLE = 'Y';

const toView = (item: InviteCode): InviteCodeView => ({
  ...item,
  remainingUses:
    item.maxUses === null ? null : Math.max(0, item.maxUses - item.usedCount),
});

@Injectable()
export class InviteCodesService {
  constructor(
    @InjectRepository(InviteCode)
    private readonly inviteCodesRepository: Repository<InviteCode>,
  ) {}

  async findAll() {
    const list = await this.inviteCodesRepository.find({
      where: { displayStatus: DISPLAY_VISIBLE },
      order: {
        createdAt: 'DESC',
      },
    });

    return list.map(toView);
  }

  async create(payload: CreateInviteCodeDto) {
    const exists = await this.inviteCodesRepository.findOne({
      where: { code: payload.code },
    });
    if (exists) {
      throw new ConflictException('邀请码已存在');
    }

    const entity = this.inviteCodesRepository.create({
      id: uuidv4(),
      code: payload.code,
      isActive: payload.isActive ?? true,
      maxUses: payload.maxUses ?? null,
      usedCount: 0,
      expiresAt: payload.expiresAt ? new Date(payload.expiresAt) : null,
      note: payload.note ?? '',
    });

    return toView(await this.inviteCodesRepository.save(entity));
  }

  async update(id: string, payload: UpdateInviteCodeDto) {
    const inviteCode = await this.inviteCodesRepository.findOne({
      where: { id, displayStatus: DISPLAY_VISIBLE },
    });
    if (!inviteCode) {
      throw new NotFoundException('邀请码不存在');
    }

    if (payload.code && payload.code !== inviteCode.code) {
      const duplicate = await this.inviteCodesRepository.findOne({
        where: { code: payload.code },
      });
      if (duplicate && duplicate.id !== id) {
        throw new ConflictException('邀请码已存在');
      }
    }

    if (
      payload.maxUses !== undefined &&
      payload.maxUses !== null &&
      payload.maxUses < inviteCode.usedCount
    ) {
      throw new BadRequestException('最大使用次数不能小于已使用次数');
    }

    Object.assign(inviteCode, {
      ...payload,
      maxUses:
        payload.maxUses === undefined ? inviteCode.maxUses : payload.maxUses,
      expiresAt:
        payload.expiresAt === undefined
          ? inviteCode.expiresAt
          : payload.expiresAt
            ? new Date(payload.expiresAt)
            : null,
      note: payload.note === undefined ? inviteCode.note : payload.note,
    });

    return toView(await this.inviteCodesRepository.save(inviteCode));
  }
}
