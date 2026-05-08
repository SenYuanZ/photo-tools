import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { compare, hash } from 'bcryptjs';
import { DataSource, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { ReminderType, ThemeName } from '../common/enums/app.enums';
import { InviteCode } from '../database/entities/invite-code.entity';
import { RoleOption } from '../database/entities/role.entity';
import { UserRoleAssignment } from '../database/entities/user-role.entity';
import { UserSetting } from '../database/entities/user-setting.entity';
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { User } from '../database/entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

const DISPLAY_VISIBLE = 'Y';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(UserRoleAssignment)
    private readonly userRolesRepository: Repository<UserRoleAssignment>,
    private readonly jwtService: JwtService,
    private readonly dataSource: DataSource,
  ) {}

  async login(payload: LoginDto) {
    const user = await this.usersRepository.findOne({
      where: { account: payload.account, displayStatus: DISPLAY_VISIBLE },
    });
    if (!user) {
      throw new UnauthorizedException('账号或密码错误');
    }

    const isPasswordValid = await compare(payload.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('账号或密码错误');
    }

    const roleAssignments = await this.userRolesRepository.find({
      where: { userId: user.id },
      order: { isPrimary: 'DESC', createdAt: 'ASC' },
    });
    const roles = roleAssignments.map((item) => item.roleCode);
    const normalizedRoles = roles.length ? roles : [user.role];

    const tokenPayload: JwtPayload = {
      sub: user.id,
      account: user.account,
    };

    return {
      token: await this.jwtService.signAsync(tokenPayload),
      user: {
        id: user.id,
        account: user.account,
        nickname: user.nickname,
        role: user.role,
        roles: normalizedRoles,
      },
    };
  }

  async register(payload: RegisterDto) {
    const account = payload.account.trim();
    const nickname = payload.nickname.trim();
    const inviteCodeText = payload.inviteCode.trim().toUpperCase();

    const exists = await this.usersRepository.findOne({ where: { account } });
    if (exists) {
      throw new ConflictException('账号已存在，请更换账号');
    }

    const result = await this.dataSource.transaction(async (manager) => {
      const primaryRoleCode = payload.role ?? 'photographer';
      const roleExists = await manager.findOne(RoleOption, {
        where: {
          code: primaryRoleCode,
          isActive: true,
          displayStatus: DISPLAY_VISIBLE,
        },
      });
      if (!roleExists) {
        throw new BadRequestException('角色不存在或已停用');
      }

      const inviteCode = await manager
        .createQueryBuilder(InviteCode, 'inviteCode')
        .setLock('pessimistic_write')
        .where('inviteCode.code = :code', { code: inviteCodeText })
        .andWhere('inviteCode.display_status = :visible', {
          visible: DISPLAY_VISIBLE,
        })
        .getOne();

      if (!inviteCode) {
        throw new BadRequestException('邀请码不存在');
      }

      if (!inviteCode.isActive) {
        throw new BadRequestException('邀请码已停用');
      }

      if (inviteCode.expiresAt && inviteCode.expiresAt.getTime() < Date.now()) {
        throw new BadRequestException('邀请码已过期');
      }

      if (
        inviteCode.maxUses !== null &&
        inviteCode.usedCount >= inviteCode.maxUses
      ) {
        throw new BadRequestException('邀请码使用次数已达上限');
      }

      const user = manager.create(User, {
        id: uuidv4(),
        account,
        nickname,
        password: await hash(payload.password, 10),
        role: primaryRoleCode,
      });
      await manager.save(user);

      const assignment = manager.create(UserRoleAssignment, {
        id: uuidv4(),
        userId: user.id,
        roleCode: primaryRoleCode,
        isPrimary: true,
      });
      await manager.save(assignment);

      const settings = manager.create(UserSetting, {
        userId: user.id,
        theme: ThemeName.PINK,
        defaultReminders: [ReminderType.ONE_DAY, ReminderType.ONE_HOUR],
        backupEnabled: true,
      });
      await manager.save(settings);

      inviteCode.usedCount += 1;
      await manager.save(inviteCode);

      return user;
    });

    const roleAssignments = await this.userRolesRepository.find({
      where: { userId: result.id },
      order: { isPrimary: 'DESC', createdAt: 'ASC' },
    });
    const roles = roleAssignments.map((item) => item.roleCode);
    const normalizedRoles = roles.length ? roles : [result.role];

    const tokenPayload: JwtPayload = {
      sub: result.id,
      account: result.account,
    };

    return {
      token: await this.jwtService.signAsync(tokenPayload),
      user: {
        id: result.id,
        account: result.account,
        nickname: result.nickname,
        role: result.role,
        roles: normalizedRoles,
      },
    };
  }
}
