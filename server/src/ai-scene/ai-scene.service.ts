import {
  BadGatewayException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { CustomerTypeOption } from '../database/entities/customer-type.entity';
import { RoleOption } from '../database/entities/role.entity';
import { Schedule } from '../database/entities/schedule.entity';
import { ServiceTypeOption } from '../database/entities/service-type.entity';
import type { SceneStreamDto } from './dto/scene-stream.dto';
import type { SaveSceneResultDto } from './dto/save-scene-result.dto';
import type { SceneContext } from './types/scene.types';

const DISPLAY_VISIBLE = 'Y';
const SCHEDULE_NOTE_MAX_LENGTH = 255;

@Injectable()
export class AiSceneService {
  constructor(
    @InjectRepository(Schedule)
    private readonly schedulesRepository: Repository<Schedule>,
    @InjectRepository(ServiceTypeOption)
    private readonly serviceTypesRepository: Repository<ServiceTypeOption>,
    @InjectRepository(RoleOption)
    private readonly rolesRepository: Repository<RoleOption>,
    @InjectRepository(CustomerTypeOption)
    private readonly customerTypesRepository: Repository<CustomerTypeOption>,
    private readonly configService: ConfigService,
  ) {}

  async createUpstreamRequest(
    userId: string,
    dto: SceneStreamDto,
    signal: AbortSignal,
  ): Promise<Response> {
    const context = await this.buildContext(userId, dto.scheduleId);
    const baseUrl = (
      this.configService.get<string>('PHOTO_AGENT_URL') ||
      'http://localhost:3001'
    ).replace(/\/$/, '');
    const token = this.configService.get<string>('PHOTO_AGENT_TOKEN');
    const timeoutMs = Number(
      this.configService.get<string>('AI_SCENE_TIMEOUT_MS') || '90000',
    );
    const requestSignal = AbortSignal.any([
      signal,
      AbortSignal.timeout(timeoutMs),
    ]);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) headers['x-internal-token'] = token;

    try {
      const response = await fetch(`${baseUrl}/scene/stream`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ scene: dto.scene, context }),
        signal: requestSignal,
      });
      if (!response.ok) {
        const message = await response.text().catch(() => '场景生成服务不可用');
        throw new BadGatewayException(message || '场景生成服务不可用');
      }
      return response;
    } catch (error) {
      if (error instanceof BadGatewayException) throw error;
      if ((error as Error).name === 'AbortError') throw error;
      throw new BadGatewayException(
        `场景生成服务连接失败：${(error as Error).message}`,
      );
    }
  }

  async saveResult(
    userId: string,
    scheduleId: string,
    dto: SaveSceneResultDto,
  ) {
    const schedule = await this.schedulesRepository.findOne({
      where: { id: scheduleId, userId, displayStatus: DISPLAY_VISIBLE },
    });
    if (!schedule) throw new NotFoundException('排单不存在');
    const contextSnapshot = await this.buildContext(userId, scheduleId);

    const existingMeta =
      schedule.serviceMeta && typeof schedule.serviceMeta === 'object'
        ? schedule.serviceMeta
        : {};
    const aiPlan = {
      scene: dto.scene,
      generatedAt: new Date().toISOString(),
      promptVersion: 'scene-v3',
      model: this.configService.get<string>('longcat.model') || '',
      contextSnapshot,
      result: dto.result,
      adoptedAt: new Date().toISOString(),
    };
    schedule.serviceMeta = { ...existingMeta, aiPlan };

    if (dto.saveToNote !== false) {
      const title =
        typeof dto.result.title === 'string' ? dto.result.title : 'AI 拍摄方案';
      const summary =
        typeof dto.result.summary === 'string' ? dto.result.summary : '';
      const addition = [`【${title}】`, summary].filter(Boolean).join(' ');
      const separator = schedule.note ? '\n\n' : '';
      const availableLength =
        SCHEDULE_NOTE_MAX_LENGTH - schedule.note.length - separator.length;
      if (availableLength > 0) {
        schedule.note = `${schedule.note}${separator}${addition.slice(0, availableLength)}`;
      }
    }

    return this.schedulesRepository.save(schedule);
  }

  private async buildContext(
    userId: string,
    scheduleId: string,
  ): Promise<SceneContext> {
    const schedule = await this.schedulesRepository.findOne({
      where: { id: scheduleId, userId, displayStatus: DISPLAY_VISIBLE },
      relations: ['customer'],
    });
    if (!schedule || !schedule.customer)
      throw new NotFoundException('排单不存在');

    const [serviceType, customerType, roles] = await Promise.all([
      this.serviceTypesRepository.findOne({
        where: { code: schedule.serviceTypeCode },
      }),
      this.customerTypesRepository.findOne({
        where: { code: schedule.customer.type },
      }),
      schedule.serviceRoleCodes?.length
        ? this.rolesRepository.find({
            where: {
              code: In(schedule.serviceRoleCodes),
              isActive: true,
              displayStatus: DISPLAY_VISIBLE,
            },
          })
        : Promise.resolve([]),
    ]);

    const aiBrief =
      schedule.serviceMeta?.aiBrief &&
      typeof schedule.serviceMeta.aiBrief === 'object' &&
      !Array.isArray(schedule.serviceMeta.aiBrief)
        ? (schedule.serviceMeta.aiBrief as SceneContext['aiBrief'])
        : undefined;

    return {
      serviceType: schedule.serviceTypeCode,
      serviceTypeName: serviceType?.name || schedule.serviceTypeCode,
      serviceRoles: roles.length
        ? roles.map((role) => role.name)
        : schedule.serviceRoleCodes || [],
      customerType: schedule.customer.type,
      customerTypeName: customerType?.name || schedule.customer.type,
      style: schedule.customer.style || '',
      hobby: schedule.customer.hobby || '',
      specialNeed: schedule.customer.specialNeed || '',
      outfit: schedule.customer.outfit || '',
      companions: schedule.customer.companions || '',
      aiBrief,
      date: schedule.date,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      location: schedule.location || '',
      note: schedule.note || '',
      referenceImageCount: schedule.referenceImages?.length || 0,
    };
  }
}
