import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoleOption } from '../database/entities/role.entity';
import { UserRoleAssignment } from '../database/entities/user-role.entity';
import { User } from '../database/entities/user.entity';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, RoleOption, UserRoleAssignment])],
  controllers: [ProfileController],
  providers: [ProfileService],
})
export class ProfileModule {}
