import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserRole } from '../../common/enums/app.enums';
import { Customer } from './customer.entity';
import { Schedule } from './schedule.entity';
import { UserSetting } from './user-setting.entity';

@Entity('users')
export class User {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id: string;

  @Column({ type: 'varchar', length: 64, unique: true })
  account: string;

  @Column({ type: 'varchar', length: 128 })
  password: string;

  @Column({ type: 'varchar', length: 64 })
  nickname: string;

  @Column({ name: 'avatar_url', type: 'varchar', length: 255, default: '' })
  avatarUrl: string;

  @Column({ type: 'varchar', length: 255, default: '' })
  bio: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.PHOTOGRAPHER,
  })
  role: UserRole;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToOne(() => UserSetting, (setting) => setting.user)
  setting: UserSetting;

  @OneToMany(() => Customer, (customer) => customer.user)
  customers: Customer[];

  @OneToMany(() => Schedule, (schedule) => schedule.user)
  schedules: Schedule[];

  @Column({ name: 'portfolio_images', type: 'json', nullable: true })
  portfolioImages: string[] | null;
}
