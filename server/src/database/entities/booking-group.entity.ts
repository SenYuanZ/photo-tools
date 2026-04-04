import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Schedule } from './schedule.entity';
import { User } from './user.entity';

@Entity('booking_groups')
export class BookingGroup {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ name: 'model_name', type: 'varchar', length: 64 })
  modelName: string;

  @Column({ name: 'model_phone', type: 'varchar', length: 20 })
  modelPhone: string;

  @Column({ type: 'varchar', length: 255, default: '' })
  location: string;

  @Column({ type: 'varchar', length: 255, default: '' })
  note: string;

  @Column({ name: 'created_by', type: 'varchar', length: 36 })
  createdBy: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @OneToMany(() => Schedule, (schedule) => schedule.bookingGroup)
  schedules: Schedule[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
