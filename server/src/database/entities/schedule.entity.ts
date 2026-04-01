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
import { DepositStatus, ReminderType } from '../../common/enums/app.enums';
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

  @ManyToOne(() => User, (user) => user.schedules, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Customer, (customer) => customer.schedules, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

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

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
