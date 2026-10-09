import { ReminderType, ScheduleStatus } from '../common/enums/app.enums';
import { Schedule } from '../database/entities/schedule.entity';

export const CATCHUP_MS = 10 * 60 * 1000;
export const getEventStart = (schedule: Pick<Schedule, 'date' | 'startTime'>) =>
  new Date(`${schedule.date}T${schedule.startTime}:00+08:00`);

export function getDueReminders(schedule: Schedule, now: Date) {
  if (
    schedule.status !== ScheduleStatus.NORMAL ||
    schedule.displayStatus !== 'Y'
  )
    return [];
  const eventStartAt = getEventStart(schedule);
  if (!Number.isFinite(eventStartAt.getTime()) || eventStartAt <= now)
    return [];
  const rawCreatedAt: unknown = schedule.createdAt;
  const createdAt =
    typeof rawCreatedAt === 'string'
      ? new Date(`${rawCreatedAt.replace(' ', 'T')}+08:00`)
      : rawCreatedAt instanceof Date
        ? // TypeORM also normalizes legacy DATETIME values to a host-local Date.
          // Restore its wall-clock fields as Beijing time before comparing.
          new Date(
            Date.UTC(
              rawCreatedAt.getFullYear(),
              rawCreatedAt.getMonth(),
              rawCreatedAt.getDate(),
              rawCreatedAt.getHours(),
              rawCreatedAt.getMinutes(),
              rawCreatedAt.getSeconds(),
              rawCreatedAt.getMilliseconds(),
            ) -
              8 * 60 * 60 * 1000,
          )
        : new Date(NaN);
  return [...new Set(schedule.reminders ?? [])].flatMap((reminderType) => {
    const offset =
      reminderType === ReminderType.ONE_DAY
        ? 24 * 60 * 60 * 1000
        : 60 * 60 * 1000;
    const dueAt = new Date(eventStartAt.getTime() - offset);
    if (
      dueAt > now ||
      now.getTime() - dueAt.getTime() > CATCHUP_MS ||
      createdAt > dueAt
    )
      return [];
    return [{ reminderType, eventStartAt, dueAt }];
  });
}
