import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { ReminderType } from '../../common/enums/app.enums';

// MySQL DATETIME has no timezone. Always serialize and parse it as UTC,
// including when the mysql2 connection returns dateStrings.
export const utcDateTransformer = {
  to: (value: Date | null) =>
    value ? value.toISOString().slice(0, 23).replace('T', ' ') : null,
  from: (value: string | Date | null) => {
    if (typeof value === 'string')
      return new Date(`${value.replace(' ', 'T')}Z`);
    // TypeORM normalizes mysql2 dateStrings to a host-local Date first.
    if (value instanceof Date)
      return new Date(
        Date.UTC(
          value.getFullYear(),
          value.getMonth(),
          value.getDate(),
          value.getHours(),
          value.getMinutes(),
          value.getSeconds(),
          value.getMilliseconds(),
        ),
      );
    return null;
  },
};

@Entity('notifications')
@Index(
  'uq_notification_event',
  ['scheduleId', 'reminderType', 'eventStartAt'],
  {
    unique: true,
  },
)
@Index('idx_notification_inbox', ['userId', 'createdAt', 'id'])
@Index('idx_notification_unread', ['userId', 'readAt', 'invalidatedAt'])
export class ScheduleNotification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id', type: 'varchar', length: 36 })
  userId: string;

  // Keep the snapshot when the schedule is deleted; no cascading FK.
  @Column({ name: 'schedule_id', type: 'varchar', length: 36 })
  scheduleId: string;

  @Column({ type: 'varchar', length: 32, default: 'schedule_reminder' })
  type: string;

  @Column({ name: 'reminder_type', type: 'enum', enum: ReminderType })
  reminderType: ReminderType;

  @Column({
    name: 'event_start_at',
    type: 'datetime',
    precision: 3,
    transformer: utcDateTransformer,
  })
  eventStartAt: Date;

  @Column({
    name: 'due_at',
    type: 'datetime',
    precision: 3,
    transformer: utcDateTransformer,
  })
  dueAt: Date;

  @Column({ type: 'varchar', length: 100 })
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column({
    name: 'read_at',
    type: 'datetime',
    precision: 3,
    nullable: true,
    transformer: utcDateTransformer,
  })
  readAt: Date | null;

  @Column({
    name: 'invalidated_at',
    type: 'datetime',
    precision: 3,
    nullable: true,
    transformer: utcDateTransformer,
  })
  invalidatedAt: Date | null;

  @Column({
    name: 'created_at',
    type: 'datetime',
    precision: 3,
    transformer: utcDateTransformer,
  })
  createdAt: Date;
}
