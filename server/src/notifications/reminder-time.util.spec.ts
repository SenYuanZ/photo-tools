import { ReminderType, ScheduleStatus } from '../common/enums/app.enums';
import { Schedule } from '../database/entities/schedule.entity';
import { utcDateTransformer } from '../database/entities/notification.entity';
import { getDueReminders, getEventStart } from './reminder-time.util';

const schedule = (patch: Partial<Schedule> = {}) =>
  Object.assign(new Schedule(), {
    date: '2026-10-10',
    startTime: '00:30',
    status: ScheduleStatus.NORMAL,
    displayStatus: 'Y',
    reminders: [ReminderType.ONE_DAY, ReminderType.ONE_HOUR],
    createdAt: new Date('2026-10-01T00:00:00Z'),
    ...patch,
  });

describe('Beijing reminder times', () => {
  it('uses an explicit UTC+8 offset across midnight', () => {
    expect(getEventStart(schedule()).toISOString()).toBe(
      '2026-10-09T16:30:00.000Z',
    );
    expect(
      getDueReminders(schedule(), new Date('2026-10-08T16:30:00Z'))[0]
        .reminderType,
    ).toBe('1d');
    expect(
      getDueReminders(schedule(), new Date('2026-10-09T15:30:00Z'))[0]
        .reminderType,
    ).toBe('1h');
  });
  it('accepts only the ten-minute catchup window', () => {
    expect(
      getDueReminders(schedule(), new Date('2026-10-09T15:29:59Z')),
    ).toEqual([]);
    expect(
      getDueReminders(schedule(), new Date('2026-10-09T15:40:00Z')),
    ).toHaveLength(1);
    expect(
      getDueReminders(schedule(), new Date('2026-10-09T15:40:00.001Z')),
    ).toEqual([]);
  });
  it('skips reminders missed before registration and already started schedules', () => {
    expect(
      getDueReminders(
        schedule({ createdAt: new Date('2026-10-09T23:31:00') }),
        new Date('2026-10-09T15:32:00Z'),
      ),
    ).toEqual([]);
    expect(getDueReminders(schedule(), getEventStart(schedule()))).toEqual([]);
  });
  it.each([
    ScheduleStatus.STORED,
    ScheduleStatus.COMPLETED,
    ScheduleStatus.PENDING_CONFIRM,
  ])('does not remind %s schedules', (status) => {
    expect(
      getDueReminders(schedule({ status }), new Date('2026-10-09T15:30:00Z')),
    ).toEqual([]);
  });
  it('respects empty reminders, hidden rows and duplicate options', () => {
    const now = new Date('2026-10-09T15:30:00Z');
    expect(getDueReminders(schedule({ reminders: [] }), now)).toEqual([]);
    expect(getDueReminders(schedule({ displayStatus: 'N' }), now)).toEqual([]);
    expect(
      getDueReminders(
        schedule({ reminders: [ReminderType.ONE_HOUR, ReminderType.ONE_HOUR] }),
        now,
      ),
    ).toHaveLength(1);
  });
  it('round-trips MySQL dateStrings independently of host timezone', () => {
    const now = new Date('2026-10-09T15:30:12.123Z');
    expect(utcDateTransformer.from(utcDateTransformer.to(now))).toEqual(now);
    expect(
      utcDateTransformer.from(new Date('2026-10-09T15:30:12.123')),
    ).toEqual(now);
    expect(utcDateTransformer.from(null)).toBeNull();
  });
  it('interprets legacy registration dateStrings as Beijing time', () => {
    const row = schedule();
    Object.assign(row, { createdAt: '2026-10-09 23:31:00' });
    expect(getDueReminders(row, new Date('2026-10-09T15:32:00Z'))).toEqual([]);
    Object.assign(row, { createdAt: '2026-10-09 23:29:00' });
    expect(getDueReminders(row, new Date('2026-10-09T15:32:00Z'))).toHaveLength(
      1,
    );
  });
});
