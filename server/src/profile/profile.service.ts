import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../database/entities/user.entity';
import { RoleOption } from '../database/entities/role.entity';
import { UserRoleAssignment } from '../database/entities/user-role.entity';
import {
  normalizeUploadUrl,
  normalizeUploadUrls,
} from '../common/utils/upload-url.util';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateProfileRolesDto } from './dto/update-profile-roles.dto';

const DISPLAY_VISIBLE = 'Y';

@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(RoleOption)
    private readonly rolesRepository: Repository<RoleOption>,
    @InjectRepository(UserRoleAssignment)
    private readonly userRolesRepository: Repository<UserRoleAssignment>,
  ) {}

  private async getUserRoles(userId: string, fallbackRole?: string) {
    const assignments = await this.userRolesRepository.find({
      where: { userId },
      order: {
        isPrimary: 'DESC',
        createdAt: 'ASC',
      },
    });

    const roles = assignments.map((item) => item.roleCode);
    if (!roles.length && fallbackRole) {
      return [fallbackRole];
    }
    return roles;
  }

  async get(userId: string) {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      select: {
        id: true,
        account: true,
        nickname: true,
        role: true,
        avatarUrl: true,
        bio: true,
        portfolioImages: true,
        portfolioPublic: true,
      },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    const roles = await this.getUserRoles(userId, user.role);

    return {
      ...user,
      roles,
      avatarUrl: normalizeUploadUrl(user.avatarUrl),
      bio: user.bio || '',
      portfolioImages: normalizeUploadUrls(user.portfolioImages),
      portfolioPublic: Boolean(user.portfolioPublic),
    };
  }

  async update(userId: string, payload: UpdateProfileDto) {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    if (payload.nickname !== undefined) {
      user.nickname = payload.nickname;
    }

    if (payload.avatarUrl !== undefined) {
      user.avatarUrl = normalizeUploadUrl(payload.avatarUrl);
    }

    if (payload.bio !== undefined) {
      user.bio = payload.bio;
    }

    if (payload.portfolioImages !== undefined) {
      user.portfolioImages = normalizeUploadUrls(payload.portfolioImages);
    }

    if (payload.portfolioPublic !== undefined) {
      user.portfolioPublic = payload.portfolioPublic;
    }

    const saved = await this.usersRepository.save(user);
    const roles = await this.getUserRoles(userId, saved.role);

    return {
      id: saved.id,
      account: saved.account,
      nickname: saved.nickname,
      role: saved.role,
      roles,
      avatarUrl: normalizeUploadUrl(saved.avatarUrl),
      bio: saved.bio || '',
      portfolioImages: normalizeUploadUrls(saved.portfolioImages),
      portfolioPublic: Boolean(saved.portfolioPublic),
    };
  }

  async getRoles(userId: string) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    const [roles, assignments] = await Promise.all([
      this.rolesRepository.find({
        where: {
          isActive: true,
          displayStatus: DISPLAY_VISIBLE,
        },
        order: {
          sortOrder: 'ASC',
          createdAt: 'ASC',
        },
      }),
      this.userRolesRepository.find({ where: { userId } }),
    ]);

    const assignmentMap = new Map(
      assignments.map((item) => [item.roleCode, item]),
    );
    const selectedRoles = roles
      .filter((role) => assignmentMap.has(role.code))
      .map((role) => ({
        code: role.code,
        name: role.name,
        isPrimary: Boolean(assignmentMap.get(role.code)?.isPrimary),
      }));

    return {
      availableRoles: roles.map((item) => ({
        code: item.code,
        name: item.name,
      })),
      selectedRoles,
      primaryRoleCode:
        selectedRoles.find((item) => item.isPrimary)?.code ||
        selectedRoles[0]?.code ||
        user.role,
    };
  }

  async updateRoles(userId: string, payload: UpdateProfileRolesDto) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    const uniqueRoleCodes = [
      ...new Set(payload.roleCodes.map((item) => item.trim())),
    ];
    if (!uniqueRoleCodes.length) {
      throw new BadRequestException('至少保留一个角色');
    }

    const availableRoles = await this.rolesRepository.find({
      where: {
        isActive: true,
        displayStatus: DISPLAY_VISIBLE,
      },
    });
    const availableCodeSet = new Set(availableRoles.map((item) => item.code));
    const invalidRole = uniqueRoleCodes.find(
      (item) => !availableCodeSet.has(item),
    );
    if (invalidRole) {
      throw new BadRequestException(`角色 ${invalidRole} 不存在或已停用`);
    }

    const primaryRoleCode =
      payload.primaryRoleCode?.trim() || uniqueRoleCodes[0];
    if (!uniqueRoleCodes.includes(primaryRoleCode)) {
      throw new BadRequestException('主角色必须包含在角色列表中');
    }

    await this.userRolesRepository.delete({ userId });
    const assignments = uniqueRoleCodes.map((roleCode) =>
      this.userRolesRepository.create({
        id: uuidv4(),
        userId,
        roleCode,
        isPrimary: roleCode === primaryRoleCode,
      }),
    );
    await this.userRolesRepository.save(assignments);

    user.role = primaryRoleCode;
    await this.usersRepository.save(user);

    return this.getRoles(userId);
  }
}
