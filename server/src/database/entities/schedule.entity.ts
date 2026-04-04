import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  DepositStatus,
  ReminderType,
  ServiceTypeCode,
} from '../../common/enums/app.enums';
import { BookingGroup } from './booking-group.entity';
import { Customer } from './customer.entity';
import { User } from './user.entity';

@Entity('schedules')
@Index('idx_user_date', ['userId', 'date'])
export class Schedule {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id: string;

  @Column({ name: 'user_id', type: 'varchar', length: 36 })
  userId: string;

  @Column({ name: 'customer_id', type: 'varchar', length: 36 })
  customerId: string;

  @Column({
    name: 'service_type_code',
    type: 'varchar',
    length: 32,
    default: ServiceTypeCode.PHOTOGRAPHY,
  })
  serviceTypeCode: string;

  @Column({
    name: 'booking_group_id',
    type: 'varchar',
    length: 36,
    nullable: true,
  })
  bookingGroupId: string | null;

  @ManyToOne(() => User, (user) => user.schedules, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Customer, (customer) => customer.schedules, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @ManyToOne(() => BookingGroup, (group) => group.schedules, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'booking_group_id' })
  bookingGroup: BookingGroup | null;

  @Column({ type: 'date' })
  date: string;

  @Column({ name: 'start_time', type: 'char', length: 5 })
  startTime: string;

  @Column({ name: 'end_time', type: 'char', length: 5 })
  endTime: string;

  @Column({ type: 'varchar', length: 255 })
  location: string;

  @Column({ type: 'varchar', length: 255, default: '' })
  note: string;

  @Column({
    name: 'deposit_status',
    type: 'enum',
    enum: DepositStatus,
    default: DepositStatus.UNPAID,
  })
  depositStatus: DepositStatus;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: {
      to: (value?: number) => value ?? 0,
      from: (value: string | number) => Number(value),
    },
  })
  amount: number;

  @Column({ type: 'json' })
  reminders: ReminderType[];

  @Column({ name: 'reference_images', type: 'json', nullable: true })
  referenceImages: string[] | null;

  @Column({ name: 'service_meta', type: 'json', nullable: true })
  serviceMeta: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
