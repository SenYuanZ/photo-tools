import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { ReminderType, ScheduleStatus } from '../common/enums/app.enums';
import {
  ScheduleNotification,
  utcDateTransformer,
} from '../database/entities/notification.entity';
import { Schedule } from '../database/entities/schedule.entity';
import { QueryNotificationsDto } from './dto/query-notifications.dto';
import { getDueReminders, getEventStart } from './reminder-time.util';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private scanning = false;

  constructor(
    @InjectRepository(ScheduleNotification)
    private readonly repository: Repository<ScheduleNotification>,
    @InjectRepository(Schedule)
    private readonly schedules: Repository<Schedule>,
    private readonly dataSource: DataSource,
  ) {}

  // Also reconcile on reads to cover bulk changes and legacy write paths.
  async invalidate(
    userId?: string,
    scheduleId?: string,
    manager?: EntityManager,
  ) {
    const parameters: string[] = [];
    let scope = '';
    if (userId) {
      scope += ' AND n.user_id = ?';
      parameters.push(userId);
    }
    if (scheduleId) {
      scope += ' AND n.schedule_id = ?';
      parameters.push(scheduleId);
    }
    await (manager ?? this.repository).query(
      `
      UPDATE notifications n LEFT JOIN schedules s ON s.id = n.schedule_id AND s.user_id = n.user_id
      SET n.invalidated_at = UTC_TIMESTAMP(3)
      WHERE n.invalidated_at IS NULL AND (
        s.id IS NULL OR s.display_status <> 'Y' OR s.status <> 'normal'
        OR n.event_start_at <> DATE_SUB(TIMESTAMP(s.date, s.start_time), INTERVAL 8 HOUR)
        OR JSON_CONTAINS(s.reminders, JSON_QUOTE(n.reminder_type)) = 0
      )${scope}`,
      parameters,
    );
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async scan(now = new Date()) {
    if (this.scanning) return;
    this.scanning = true;
    const started = Date.now();
    let generated = 0;
    let failed = 0;
    try {
      await this.invalidate();
      const candidates = await this.schedules
        .createQueryBuilder('s')
        .select('s.id', 'id')
        .where("s.status = 'normal' AND s.display_status = 'Y'")
        .andWhere(
          'DATE_SUB(TIMESTAMP(s.date, s.start_time), INTERVAL 8 HOUR) > :now',
          { now: utcDateTransformer.to(now) },
        )
        .andWhere(
          'DATE_SUB(TIMESTAMP(s.date, s.start_time), INTERVAL 8 HOUR) <= :latest',
          {
            latest: utcDateTransformer.to(
              new Date(now.getTime() + 24 * 60 * 60 * 1000),
            ),
          },
        )
        .orderBy('s.id', 'ASC')
        .getRawMany<{ id: string }>();
      for (const candidate of candidates) {
        try {
          generated += await this.generateForSchedule(candidate.id, now);
        } catch (error) {
          failed++;
          this.logger.error(
            `Reminder scan failed for ${candidate.id}`,
            error instanceof Error ? error.stack : String(error),
          );
        }
      }
      this.logger.log(
        `Reminder scan: generated=${generated} failed=${failed} durationMs=${Date.now() - started}`,
      );
    } catch (error) {
      this.logger.error(
        'Reminder scan failed',
        error instanceof Error ? error.stack : String(error),
      );
    } finally {
      this.scanning = false;
    }
  }

  async generateForSchedule(id: string, now: Date) {
    return this.dataSource.transaction(async (manager) => {
      const schedule = await manager.findOne(Schedule, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!schedule) return 0;
      let count = 0;
      for (const reminder of getDueReminders(schedule, now)) {
        const service = schedule.serviceTypeCode === 'makeup' ? '化妆' : '拍摄';
        try {
          await manager.insert(ScheduleNotification, {
            userId: schedule.userId,
            scheduleId: schedule.id,
            type: 'schedule_reminder',
            ...reminder,
            title: `${service}将在 ${reminder.reminderType === ReminderType.ONE_DAY ? '1 天' : '1 小时'}后开始`,
            content: `${schedule.date} ${schedule.startTime}–${schedule.endTime} · ${schedule.location}`,
            readAt: null,
            invalidatedAt: null,
            createdAt: now,
          });
          count++;
        } catch (error) {
          // Ignore only the expected unique-key conflict, not other DB errors.
          if (
            (error as { driverError?: { code?: string } }).driverError?.code !==
            'ER_DUP_ENTRY'
          )
            throw error;
        }
      }
      return count;
    });
  }

  async list(userId: string, query: QueryNotificationsDto) {
    await this.invalidate(userId);
    const builder = this.repository
      .createQueryBuilder('n')
      .where('n.user_id = :userId', { userId });
    if (query.filter === 'unread')
      builder.andWhere('n.read_at IS NULL AND n.invalidated_at IS NULL');
    const [notifications, total] = await builder
      .orderBy('n.created_at', 'DESC')
      .addOrderBy('n.id', 'DESC')
      .skip((query.page - 1) * query.pageSize)
      .take(query.pageSize)
      .getManyAndCount();
    const ids = notifications.map((item) => item.scheduleId);
    const schedules = ids.length
      ? await this.schedules.find({ where: { userId, id: In(ids) } })
      : [];
    const byId = new Map(schedules.map((s) => [s.id, s]));
    const items = notifications.map((notification) => {
      const schedule = byId.get(notification.scheduleId);
      const visible = schedule?.displayStatus === 'Y';
      const changed =
        visible &&
        getEventStart(schedule).getTime() !==
          notification.eventStartAt.getTime();
      return {
        ...notification,
        scheduleStatus: visible ? schedule.status : null,
        canNavigate: !!visible,
        statusLabel: !visible
          ? '排单已删除'
          : changed
            ? '排单时间已调整'
            : schedule.status === ScheduleStatus.COMPLETED
              ? '已完单'
              : schedule.status === ScheduleStatus.STORED
                ? '已暂存'
                : notification.invalidatedAt
                  ? '提醒已失效'
                  : '',
      };
    });
    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async unreadCount(userId: string) {
    await this.invalidate(userId);
    const row = await this.repository
      .createQueryBuilder('n')
      .select('COUNT(*)', 'unreadCount')
      .addSelect('MAX(n.id)', 'latestId')
      .where(
        'n.user_id = :userId AND n.read_at IS NULL AND n.invalidated_at IS NULL',
        { userId },
      )
      .getRawOne<{ unreadCount: string; latestId: number | null }>();
    return {
      unreadCount: Number(row?.unreadCount ?? 0),
      latestId: row?.latestId ? Number(row.latestId) : null,
    };
  }

  async read(userId: string, id: number) {
    const notification = await this.repository.findOne({
      where: { id, userId },
    });
    if (!notification) throw new NotFoundException('通知不存在');
    await this.repository
      .createQueryBuilder()
      .update()
      .set({ readAt: new Date() })
      .where('id = :id AND user_id = :userId AND read_at IS NULL', {
        id,
        userId,
      })
      .execute();
    return { success: true };
  }

  async readAll(userId: string) {
    const cutoff = await this.repository
      .createQueryBuilder('n')
      .select('MAX(n.id)', 'id')
      .where('n.user_id = :userId', { userId })
      .getRawOne<{ id: number | null }>();
    if (!cutoff?.id) return { updatedCount: 0 };
    const result = await this.repository
      .createQueryBuilder()
      .update()
      .set({ readAt: new Date() })
      .where('user_id = :userId AND id <= :id AND read_at IS NULL', {
        userId,
        id: cutoff.id,
      })
      .execute();
    return { updatedCount: result.affected ?? 0 };
  }
}
