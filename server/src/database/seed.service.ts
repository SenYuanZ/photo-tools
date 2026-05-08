import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { hash } from 'bcryptjs';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import {
  DepositStatus,
  ReminderType,
  ServiceTypeCode,
  ThemeName,
} from '../common/enums/app.enums';
import { Customer } from './entities/customer.entity';
import { CustomerTypeOption } from './entities/customer-type.entity';
import { InviteCode } from './entities/invite-code.entity';
import { RoleOption } from './entities/role.entity';
import { Schedule } from './entities/schedule.entity';
import { ServiceTypeOption } from './entities/service-type.entity';
import { UserRoleAssignment } from './entities/user-role.entity';
import { UserSetting } from './entities/user-setting.entity';
import { User } from './entities/user.entity';

const formatDate = (date: Date) => date.toISOString().slice(0, 10);

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(UserSetting)
    private readonly settingsRepository: Repository<UserSetting>,
    @InjectRepository(Customer)
    private readonly customersRepository: Repository<Customer>,
    @InjectRepository(CustomerTypeOption)
    private readonly customerTypesRepository: Repository<CustomerTypeOption>,
    @InjectRepository(InviteCode)
    private readonly inviteCodesRepository: Repository<InviteCode>,
    @InjectRepository(ServiceTypeOption)
    private readonly serviceTypesRepository: Repository<ServiceTypeOption>,
    @InjectRepository(RoleOption)
    private readonly rolesRepository: Repository<RoleOption>,
    @InjectRepository(UserRoleAssignment)
    private readonly userRolesRepository: Repository<UserRoleAssignment>,
    @InjectRepository(Schedule)
    private readonly schedulesRepository: Repository<Schedule>,
  ) {}

  async onApplicationBootstrap() {
    await this.ensureRoles();
    await this.ensureCustomerTypes();
    await this.ensureServiceTypes();
    await this.ensureInviteCodes();
    await this.ensureDemoMakeupUser();

    const existing = await this.usersRepository.findOne({
      where: { account: 'lina_photo' },
    });
    if (existing) {
      await this.ensureUserRoleAssignments(existing.id, 'photographer');
      return;
    }

    const userId = uuidv4();
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 5);

    const user = this.usersRepository.create({
      id: userId,
      account: 'lina_photo',
      nickname: '林娜摄影',
      password: await hash('123456', 10),
      role: 'photographer',
    });
    await this.usersRepository.save(user);
    await this.ensureUserRoleAssignments(user.id, 'photographer');

    const settings = this.settingsRepository.create({
      userId,
      theme: ThemeName.PINK,
      defaultReminders: [ReminderType.ONE_DAY, ReminderType.ONE_HOUR],
      backupEnabled: true,
    });
    await this.settingsRepository.save(settings);

    const customerA = this.customersRepository.create({
      id: uuidv4(),
      userId,
      name: '张小鹿',
      phone: '13812345678',
      type: 'personal',
      style: '日系卡通',
      hobby: '喜欢可爱元素，不喜欢严肃摆姿',
      specialNeed: '带宠物拍摄，需要简单妆造',
      depositStatus: DepositStatus.PAID,
      tailPaymentDate: formatDate(tomorrow),
      outfit: '浅色系连衣裙',
      location: 'XX 公园草坪',
      companions: '闺蜜 1 人',
      tags: ['首次拍摄', '喜欢可爱元素'],
    });

    const customerB = this.customersRepository.create({
      id: uuidv4(),
      userId,
      name: '林一朵',
      phone: '13888886666',
      type: 'couple',
      style: '电影感暖色调',
      hobby: '喜欢街景，偏好抓拍',
      specialNeed: '避免过度磨皮',
      depositStatus: DepositStatus.FULL,
      tailPaymentDate: formatDate(today),
      outfit: '米白和卡其穿搭',
      location: '北岸咖啡街',
      companions: '情侣双人',
      tags: ['复拍'],
    });

    await this.customersRepository.save([customerA, customerB]);

    const schedules = this.schedulesRepository.create([
      {
        id: uuidv4(),
        userId,
        customerId: customerA.id,
        date: formatDate(today),
        startTime: '09:00',
        endTime: '11:30',
        location: 'XX 公园草坪',
        note: '偏爱浅色背景，后期加入卡通贴纸。',
        serviceTypeCode: ServiceTypeCode.PHOTOGRAPHY,
        bookingGroupId: null,
        serviceMeta: null,
        depositStatus: DepositStatus.PAID,
        amount: 500,
        reminders: [ReminderType.ONE_HOUR],
        referenceImages: [],
      },
      {
        id: uuidv4(),
        userId,
        customerId: customerB.id,
        date: formatDate(today),
        startTime: '14:00',
        endTime: '16:00',
        location: '北岸咖啡街',
        note: '希望多抓拍互动镜头。',
        serviceTypeCode: ServiceTypeCode.PHOTOGRAPHY,
        bookingGroupId: null,
        serviceMeta: null,
        depositStatus: DepositStatus.FULL,
        amount: 1200,
        reminders: [ReminderType.ONE_DAY, ReminderType.ONE_HOUR],
        referenceImages: [],
      },
      {
        id: uuidv4(),
        userId,
        customerId: customerB.id,
        date: formatDate(tomorrow),
        startTime: '10:30',
        endTime: '12:00',
        location: '森林公园童趣区',
        note: '带轻便反光板。',
        serviceTypeCode: ServiceTypeCode.PHOTOGRAPHY,
        bookingGroupId: null,
        serviceMeta: null,
        depositStatus: DepositStatus.UNPAID,
        amount: 300,
        reminders: [ReminderType.ONE_DAY],
        referenceImages: [],
      },
      {
        id: uuidv4(),
        userId,
        customerId: customerA.id,
        date: formatDate(nextWeek),
        startTime: '19:00',
        endTime: '20:30',
        location: '创意园 A 栋',
        note: '商业补拍，需提前布灯。',
        serviceTypeCode: ServiceTypeCode.PHOTOGRAPHY,
        bookingGroupId: null,
        serviceMeta: null,
        depositStatus: DepositStatus.PAID,
        amount: 800,
        reminders: [ReminderType.ONE_DAY],
        referenceImages: [],
      },
    ]);
    await this.schedulesRepository.save(schedules);

    this.logger.log('Seed data created: default user lina_photo / 123456');
  }

  private async ensureServiceTypes() {
    const defaults = [
      {
        code: ServiceTypeCode.PHOTOGRAPHY,
        name: '摄影服务',
        sortOrder: 10,
      },
      {
        code: ServiceTypeCode.MAKEUP,
        name: '妆娘约妆',
        sortOrder: 20,
      },
    ];

    for (const item of defaults) {
      const exists = await this.serviceTypesRepository.findOne({
        where: { code: item.code },
      });
      if (exists) {
        continue;
      }

      const entity = this.serviceTypesRepository.create({
        id: uuidv4(),
        code: item.code,
        name: item.name,
        sortOrder: item.sortOrder,
        isActive: true,
      });

      await this.serviceTypesRepository.save(entity);
    }
  }

  private async ensureCustomerTypes() {
    const defaults = [
      { code: 'personal', name: '个人写真', sortOrder: 10 },
      { code: 'couple', name: '情侣', sortOrder: 20 },
      { code: 'family', name: '亲子', sortOrder: 30 },
      { code: 'business', name: '商业', sortOrder: 40 },
      { code: 'other', name: '其他', sortOrder: 90 },
    ];

    for (const item of defaults) {
      const exists = await this.customerTypesRepository.findOne({
        where: { code: item.code },
      });
      if (exists) {
        continue;
      }

      const entity = this.customerTypesRepository.create({
        id: uuidv4(),
        code: item.code,
        name: item.name,
        sortOrder: item.sortOrder,
        isActive: true,
      });

      await this.customerTypesRepository.save(entity);
    }
  }

  private async ensureInviteCodes() {
    const defaults = [
      {
        code: 'PHOTO2026',
        note: '默认邀请码，可用于摄影师注册',
      },
      {
        code: 'STUDIO888',
        note: '备用邀请码',
      },
    ];

    for (const item of defaults) {
      const exists = await this.inviteCodesRepository.findOne({
        where: { code: item.code },
      });
      if (exists) {
        continue;
      }

      const entity = this.inviteCodesRepository.create({
        id: uuidv4(),
        code: item.code,
        isActive: true,
        maxUses: null,
        usedCount: 0,
        expiresAt: null,
        note: item.note,
      });
      await this.inviteCodesRepository.save(entity);
    }
  }

  private async ensureDemoMakeupUser() {
    const exists = await this.usersRepository.findOne({
      where: { account: 'momo_makeup' },
    });

    if (exists) {
      await this.ensureUserRoleAssignments(exists.id, 'makeup_artist');
      return;
    }

    const user = this.usersRepository.create({
      id: uuidv4(),
      account: 'momo_makeup',
      nickname: '默默妆造',
      password: await hash('123456', 10),
      role: 'makeup_artist',
    });
    await this.usersRepository.save(user);
    await this.ensureUserRoleAssignments(user.id, 'makeup_artist');

    const settings = this.settingsRepository.create({
      userId: user.id,
      theme: ThemeName.PINK,
      defaultReminders: [ReminderType.ONE_DAY, ReminderType.ONE_HOUR],
      backupEnabled: true,
    });
    await this.settingsRepository.save(settings);
  }

  private async ensureRoles() {
    const defaults = [
      { code: 'photographer', name: '摄影', sortOrder: 10 },
      { code: 'videographer', name: '摄像', sortOrder: 20 },
      { code: 'makeup_artist', name: '妆娘', sortOrder: 30 },
      { code: 'hair_stylist', name: '毛娘', sortOrder: 40 },
      { code: 'retoucher', name: '后期', sortOrder: 50 },
      { code: 'vfx_artist', name: '特效', sortOrder: 60 },
      { code: 'model', name: '模特', sortOrder: 70 },
      { code: 'editor', name: '剪辑', sortOrder: 80 },
      { code: 'prop_master', name: '道具', sortOrder: 90 },
      { code: 'ticket_agent', name: '票代', sortOrder: 100 },
      { code: 'logistics', name: '后勤', sortOrder: 110 },
    ];

    for (const item of defaults) {
      const exists = await this.rolesRepository.findOne({
        where: { code: item.code },
      });
      if (exists) {
        continue;
      }

      const entity = this.rolesRepository.create({
        id: uuidv4(),
        code: item.code,
        name: item.name,
        sortOrder: item.sortOrder,
        isActive: true,
      });
      await this.rolesRepository.save(entity);
    }
  }

  private async ensureUserRoleAssignments(userId: string, primaryRoleCode: string) {
    const exists = await this.userRolesRepository.findOne({
      where: {
        userId,
        roleCode: primaryRoleCode,
      },
    });

    if (!exists) {
      const entity = this.userRolesRepository.create({
        id: uuidv4(),
        userId,
        roleCode: primaryRoleCode,
        isPrimary: true,
      });
      await this.userRolesRepository.save(entity);
      return;
    }

    if (!exists.isPrimary) {
      exists.isPrimary = true;
      await this.userRolesRepository.save(exists);
    }
  }
}
