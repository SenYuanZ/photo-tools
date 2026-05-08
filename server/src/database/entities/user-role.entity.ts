import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { RoleOption } from './role.entity';
import { User } from './user.entity';

@Entity('user_roles')
@Index('idx_user_role_unique', ['userId', 'roleCode'], { unique: true })
export class UserRoleAssignment {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id: string;

  @Column({ name: 'user_id', type: 'varchar', length: 36 })
  userId: string;

  @Column({ name: 'role_code', type: 'varchar', length: 32 })
  roleCode: string;

  @Column({ name: 'is_primary', type: 'tinyint', width: 1, default: 0 })
  isPrimary: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => User, (user) => user.userRoles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => RoleOption, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'role_code', referencedColumnName: 'code' })
  role: RoleOption;
}
