import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DepositStatus } from '../../common/enums/app.enums';
import { Schedule } from './schedule.entity';
import { User } from './user.entity';

@Entity('customers')
@Index('uniq_user_phone', ['userId', 'phone'], { unique: true })
export class Customer {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id: string;

  @Column({ name: 'user_id', type: 'varchar', length: 36 })
  userId: string;

  @ManyToOne(() => User, (user) => user.customers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', length: 64 })
  name: string;

  @Column({ type: 'varchar', length: 20 })
  phone: string;

  @Column({ name: 'is_long_term', type: 'tinyint', width: 1, default: 1 })
  isLongTerm: boolean;

  @Column({ type: 'varchar', length: 32 })
  type: string;

  @Column({ type: 'varchar', length: 255, default: '' })
  style: string;

  @Column({ type: 'varchar', length: 255, default: '' })
  hobby: string;

  @Column({ name: 'special_need', type: 'varchar', length: 255, default: '' })
  specialNeed: string;

  @Column({
    name: 'deposit_status',
    type: 'enum',
    enum: DepositStatus,
    default: DepositStatus.UNPAID,
  })
  depositStatus: DepositStatus;

  @Column({ name: 'tail_payment_date', type: 'date', nullable: true })
  tailPaymentDate: string | null;

  @Column({ type: 'varchar', length: 255, default: '' })
  outfit: string;

  @Column({ type: 'varchar', length: 255, default: '' })
  location: string;

  @Column({ type: 'varchar', length: 255, default: '' })
  companions: string;

  @Column({ type: 'json', nullable: true })
  tags: string[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'display_status', type: 'char', length: 1, default: 'Y' })
  displayStatus: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => Schedule, (schedule) => schedule.customer)
  schedules: Schedule[];
}
