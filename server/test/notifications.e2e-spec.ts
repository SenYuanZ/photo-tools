import { randomUUID } from 'node:crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { config } from 'dotenv';
import { createConnection, Connection } from 'mysql2/promise';
import request from 'supertest';
import type { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { JwtStrategy } from '../src/auth/jwt.strategy';
import {
  ReminderType,
  ScheduleStatus,
  DepositStatus,
} from '../src/common/enums/app.enums';
import { CustomerTypesService } from '../src/customer-types/customer-types.service';
import { ServiceTypesService } from '../src/service-types/service-types.service';
import { BookingGroup } from '../src/database/entities/booking-group.entity';
import { Customer } from '../src/database/entities/customer.entity';
import { ScheduleNotification } from '../src/database/entities/notification.entity';
import { RoleOption } from '../src/database/entities/role.entity';
import { Schedule } from '../src/database/entities/schedule.entity';
import { UserRoleAssignment } from '../src/database/entities/user-role.entity';
import { UserSetting } from '../src/database/entities/user-setting.entity';
import { User } from '../src/database/entities/user.entity';
import { NotificationsController } from '../src/notifications/notifications.controller';
import { NotificationsService } from '../src/notifications/notifications.service';
import { SchedulesService } from '../src/schedules/schedules.service';
import { CustomersService } from '../src/customers/customers.service';

// The application uses uuid's ESM package; keep its UUID behavior in Jest CJS.
jest.mock('uuid', () => ({ v4: () => randomUUID() }));

// Opt in: creates and removes only its own uniquely named test database.
// It never initializes, resets or seeds the configured application database.
const mysqlDescribe =
  process.env.NOTIFICATIONS_MYSQL_E2E === '1' ? describe : describe.skip;
mysqlDescribe('Notifications (isolated MySQL + JWT HTTP)', () => {
  const database = `photo_order_notification_test_${randomUUID().replace(/-/g, '')}`;
  const now = new Date('2026-10-10T06:00:00Z');
  let connection: Connection;
  let source: DataSource;
  let app: INestApplication<App>;
  let service: NotificationsService;
  let schedulesService: SchedulesService;
  let customersService: CustomersService;
  let schemaCreated = false;
  const jwt = new JwtService({ secret: 'notification-test-only' });
  const token = (sub = 'u1') => jwt.sign({ sub, account: sub });

  beforeAll(async () => {
    config({ path: ['.env.local', '.env'], quiet: true });
    const options = {
      host: process.env.DB_HOST ?? '127.0.0.1',
      port: Number(process.env.DB_PORT ?? 3306),
      user: process.env.DB_USERNAME ?? 'root',
      password: process.env.DB_PASSWORD ?? 'admin123',
    };
    connection = await createConnection(options);
    await connection.query(
      `CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4`,
    );
    schemaCreated = true;
    source = new DataSource({
      type: 'mysql',
      ...options,
      username: options.user,
      database,
      extra: { dateStrings: true },
      synchronize: true,
      entities: [
        User,
        UserSetting,
        Customer,
        Schedule,
        BookingGroup,
        RoleOption,
        UserRoleAssignment,
        ScheduleNotification,
      ],
    });
    await source.initialize();
    service = new NotificationsService(
      source.getRepository(ScheduleNotification),
      source.getRepository(Schedule),
      source,
    );
    schedulesService = new SchedulesService(
      source.getRepository(Schedule),
      source.getRepository(Customer),
      source.getRepository(UserSetting),
      source.getRepository(User),
      source.getRepository(UserRoleAssignment),
      source.getRepository(BookingGroup),
      {} as CustomerTypesService,
      {
        ensureUsableCode: (code: string) => Promise.resolve(code),
      } as unknown as ServiceTypesService,
      service,
    );
    customersService = new CustomersService(
      source.getRepository(Customer),
      source.getRepository(Schedule),
      {} as CustomerTypesService,
      service,
    );
    const module = await Test.createTestingModule({
      imports: [PassportModule],
      controllers: [NotificationsController],
      providers: [
        { provide: NotificationsService, useValue: service },
        {
          provide: ConfigService,
          useValue: new ConfigService({ JWT_SECRET: 'notification-test-only' }),
        },
        JwtStrategy,
      ],
    }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  }, 30000);

  beforeEach(async () => {
    await source
      .getRepository(ScheduleNotification)
      .createQueryBuilder()
      .delete()
      .execute();
    await source
      .getRepository(Schedule)
      .createQueryBuilder()
      .delete()
      .execute();
    await source
      .getRepository(Customer)
      .createQueryBuilder()
      .delete()
      .execute();
    await source.getRepository(User).createQueryBuilder().delete().execute();
    await source.getRepository(User).save([
      { id: 'u1', account: 'u1', password: 'fixture', nickname: '测试摄影师' },
      { id: 'u2', account: 'u2', password: 'fixture', nickname: '测试化妆师' },
    ]);
    await source
      .getRepository(UserSetting)
      .save({ userId: 'u1', defaultReminders: [ReminderType.ONE_HOUR] });
    await source.getRepository(Customer).save({
      id: 'c1',
      userId: 'u1',
      name: '测试客户',
      phone: '13800000001',
      type: 'test',
    });
  });

  const fixture = (patch: Partial<Schedule> = {}) =>
    source.getRepository(Schedule).save({
      id: randomUUID(),
      userId: 'u1',
      customerId: 'c1',
      date: '2026-10-10',
      startTime: '15:00',
      endTime: '16:00',
      location: '测试摄影棚',
      reminders: [ReminderType.ONE_HOUR],
      // Match the application's local mysql2 connection. Fixture Dates encode
      // the existing Beijing DATETIME wall-clock fields, independent of TZ.
      createdAt: new Date('2026-10-01T08:00:00'),
      ...patch,
    });

  it('creates the expected schema and indexes without a cascading schedule FK', async () => {
    const runner = source.createQueryRunner();
    const tables = await runner.getTable('notifications');
    await runner.release();
    expect(
      tables?.indices.find((i) => i.name === 'uq_notification_event')?.isUnique,
    ).toBe(true);
    expect(tables?.indices.map((i) => i.name)).toEqual(
      expect.arrayContaining([
        'idx_notification_inbox',
        'idx_notification_unread',
      ]),
    );
    expect(tables?.foreignKeys).toHaveLength(0);
    const ddl: { 'Create Table': string }[] = await source.query(
      'SHOW CREATE TABLE notifications',
    );
    expect(ddl[0]['Create Table']).toContain('datetime(3)');
    expect(ddl[0]['Create Table']).toContain(
      'UNIQUE KEY `uq_notification_event` (`schedule_id`,`reminder_type`,`event_start_at`)',
    );
    for (const name of [
      'event_start_at',
      'due_at',
      'read_at',
      'invalidated_at',
      'created_at',
    ]) {
      expect(
        tables?.columns.find((column) => column.name === name)?.precision,
      ).toBe(3);
    }
  });

  it('inherits defaults only when reminders are absent, preserving explicit empty arrays', async () => {
    const payload = {
      customerId: 'c1',
      serviceTypeCode: 'photography',
      date: '2026-11-01',
      startTime: '10:00',
      endTime: '11:00',
      location: '测试棚',
      depositStatus: DepositStatus.UNPAID,
      amount: 0,
    };
    expect((await schedulesService.create('u1', payload)).reminders).toEqual([
      '1h',
    ]);
    expect(
      (
        await schedulesService.create('u1', {
          ...payload,
          startTime: '12:00',
          endTime: '13:00',
          reminders: [],
        })
      ).reminders,
    ).toEqual([]);
  });

  it('generates once under concurrent transactions and repeated scans', async () => {
    const schedule = await fixture();
    const results = await Promise.all([
      service.generateForSchedule(schedule.id, now),
      service.generateForSchedule(schedule.id, now),
    ]);
    expect(results.reduce((a, b) => a + b, 0)).toBe(1);
    await service.scan(now);
    expect(await source.getRepository(ScheduleNotification).count()).toBe(1);
    const notification = await source
      .getRepository(ScheduleNotification)
      .findOneByOrFail({ scheduleId: schedule.id });
    expect(notification.eventStartAt.toISOString()).toBe(
      '2026-10-10T07:00:00.000Z',
    );
    expect(await service.unreadCount('u1')).toEqual({
      unreadCount: 1,
      latestId: notification.id,
    });
  });

  it('authenticates, validates pagination, scopes lists and makes single read idempotent', async () => {
    const schedule = await fixture();
    await service.generateForSchedule(schedule.id, now);
    await request(app.getHttpServer()).get('/api/notifications').expect(401);
    await request(app.getHttpServer())
      .get('/api/notifications?page=0')
      .auth(token(), { type: 'bearer' })
      .expect(400);
    const response = await request(app.getHttpServer())
      .get('/api/notifications?filter=unread')
      .auth(token(), { type: 'bearer' })
      .expect(200);
    const body = response.body as {
      items: ScheduleNotification[];
      total: number;
      page: number;
      pageSize: number;
    };
    expect(body.total).toBe(1);
    expect(body.pageSize).toBe(20);
    const id = body.items[0].id;
    await request(app.getHttpServer())
      .patch(`/api/notifications/${id}/read`)
      .auth(token('u2'), { type: 'bearer' })
      .expect(404);
    await request(app.getHttpServer())
      .patch(`/api/notifications/${id}/read`)
      .auth(token(), { type: 'bearer' })
      .expect(200);
    const firstRead = (
      await source.getRepository(ScheduleNotification).findOneByOrFail({ id })
    ).readAt;
    await request(app.getHttpServer())
      .patch(`/api/notifications/${id}/read`)
      .auth(token(), { type: 'bearer' })
      .expect(200);
    expect(
      (await source.getRepository(ScheduleNotification).findOneByOrFail({ id }))
        .readAt,
    ).toEqual(firstRead);
    const other = await request(app.getHttpServer())
      .get('/api/notifications')
      .auth(token('u2'), { type: 'bearer' })
      .expect(200);
    expect((other.body as { total: number }).total).toBe(0);
  });

  it('pages historical notifications and marks all current rows read', async () => {
    const first = await fixture();
    const second = await fixture({ serviceTypeCode: 'makeup' });
    await service.generateForSchedule(first.id, now);
    await service.generateForSchedule(second.id, now);
    const page = await service.list('u1', {
      filter: 'all',
      page: 2,
      pageSize: 1,
    });
    expect(page.items).toHaveLength(1);
    expect(page.total).toBe(2);
    const response = await request(app.getHttpServer())
      .patch('/api/notifications/read-all')
      .auth(token(), { type: 'bearer' })
      .expect(200);
    expect((response.body as { updatedCount: number }).updatedCount).toBe(2);
    expect((await service.unreadCount('u1')).unreadCount).toBe(0);
    expect(
      (await service.list('u1', { filter: 'unread', page: 1, pageSize: 20 }))
        .items,
    ).toHaveLength(0);
  });

  it('invalidates on rescheduling and generates a new event without reviving old notifications', async () => {
    const schedule = await fixture();
    await service.generateForSchedule(schedule.id, now);
    await schedulesService.update('u1', schedule.id, {
      startTime: '16:00',
      endTime: '17:00',
    });
    expect((await service.unreadCount('u1')).unreadCount).toBe(0);
    await service.generateForSchedule(
      schedule.id,
      new Date('2026-10-10T07:00:00Z'),
    );
    const list = await service.list('u1', {
      filter: 'all',
      page: 1,
      pageSize: 20,
    });
    expect(list.items).toHaveLength(2);
    expect(list.items.filter((n) => n.invalidatedAt)).toHaveLength(1);
    expect(list.items.find((n) => n.invalidatedAt)?.statusLabel).toBe(
      '排单时间已调整',
    );
  });

  it('handles storing, restoring, completion, reminder disable, schedule deletion and customer deletion', async () => {
    const schedule = await fixture();
    await service.generateForSchedule(schedule.id, now);
    await schedulesService.update('u1', schedule.id, {
      status: ScheduleStatus.STORED,
    });
    expect((await service.unreadCount('u1')).unreadCount).toBe(0);
    await schedulesService.update('u1', schedule.id, {
      status: ScheduleStatus.NORMAL,
    });
    expect(await service.generateForSchedule(schedule.id, now)).toBe(0);
    const disabled = await fixture();
    await service.generateForSchedule(disabled.id, now);
    // Use a direct write to exercise read-time reconciliation of legacy paths.
    await source.getRepository(Schedule).update(disabled.id, { reminders: [] });
    expect((await service.unreadCount('u1')).unreadCount).toBe(0);
    const completed = await fixture();
    await service.generateForSchedule(completed.id, now);
    await schedulesService.complete('u1', completed.id);
    expect((await service.unreadCount('u1')).unreadCount).toBe(0);
    await schedulesService.remove('u1', completed.id);
    const list = await service.list('u1', {
      filter: 'all',
      page: 1,
      pageSize: 20,
    });
    expect(
      list.items.find((n) => n.scheduleId === completed.id)?.canNavigate,
    ).toBe(false);
    const customerDeleted = await fixture();
    await service.generateForSchedule(customerDeleted.id, now);
    await customersService.remove('u1', 'c1');
    expect((await service.unreadCount('u1')).unreadCount).toBe(0);
    expect(
      (
        await service.list('u1', { filter: 'all', page: 1, pageSize: 20 })
      ).items.every((n) => !n.canNavigate),
    ).toBe(true);
  });

  it('enforces catchup and registration boundaries using stored Beijing timestamps', async () => {
    const recent = await fixture();
    const registeredBeforeDue = await fixture({
      createdAt: new Date('2026-10-10T13:59:59'),
    });
    const expired = await fixture({ startTime: '14:49', endTime: '15:49' });
    const lateRegistration = await fixture({
      createdAt: new Date('2026-10-10T14:01:00'),
    });
    const oneDay = await fixture({
      date: '2026-10-11',
      startTime: '14:00',
      reminders: [ReminderType.ONE_DAY],
    });
    await service.scan(new Date('2026-10-10T06:05:00Z'));
    const rows = await source.getRepository(ScheduleNotification).find();
    expect(rows.map((r) => r.scheduleId).sort()).toEqual(
      [recent.id, registeredBeforeDue.id, oneDay.id].sort(),
    );
    expect(
      rows.some(
        (r) =>
          r.scheduleId === expired.id || r.scheduleId === lateRegistration.id,
      ),
    ).toBe(false);
  });

  it('retries a failed schedule on the next scan within the catchup window', async () => {
    await fixture();
    const generate = jest
      .spyOn(service, 'generateForSchedule')
      .mockRejectedValueOnce(new Error('test database outage'));
    await service.scan(now);
    expect(await source.getRepository(ScheduleNotification).count()).toBe(0);
    await service.scan(new Date(now.getTime() + 60000));
    expect(await source.getRepository(ScheduleNotification).count()).toBe(1);
    generate.mockRestore();
  });

  it('does not mark notifications arriving after the read-all cutoff as read', async () => {
    const first = await fixture();
    const second = await fixture();
    await service.generateForSchedule(first.id, now);
    const repository = source.getRepository(ScheduleNotification);
    const cutoff = await repository.findOneByOrFail({ scheduleId: first.id });
    const builder = repository.createQueryBuilder('n');
    jest.spyOn(builder, 'getRawOne').mockImplementationOnce(async () => {
      await service.generateForSchedule(second.id, now);
      return { id: cutoff.id };
    });
    const createBuilder = jest
      .spyOn(repository, 'createQueryBuilder')
      .mockReturnValueOnce(builder);
    expect(await service.readAll('u1')).toEqual({ updatedCount: 1 });
    createBuilder.mockRestore();
    const rows = await repository.find();
    expect(rows.find((r) => r.scheduleId === first.id)?.readAt).not.toBeNull();
    expect(rows.find((r) => r.scheduleId === second.id)?.readAt).toBeNull();
  });

  afterAll(async () => {
    await app?.close();
    if (source?.isInitialized) await source.destroy();
    if (
      schemaCreated &&
      /^photo_order_notification_test_[a-f0-9]{32}$/.test(database)
    ) {
      await connection.query(`DROP DATABASE \`${database}\``);
    }
    await connection?.end();
  });
});
