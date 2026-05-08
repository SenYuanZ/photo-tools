import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('roles')
export class RoleOption {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id: string;

  @Column({ type: 'varchar', length: 32, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 64 })
  name: string;

  @Column({ name: 'sort_order', type: 'int', default: 100 })
  sortOrder: number;

  @Column({ name: 'is_active', type: 'tinyint', width: 1, default: 1 })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'display_status', type: 'char', length: 1, default: 'Y' })
  displayStatus: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
