import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoleOption } from '../database/entities/role.entity';

const DISPLAY_VISIBLE = 'Y';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(RoleOption)
    private readonly rolesRepository: Repository<RoleOption>,
  ) {}

  async findAllActive() {
    return this.rolesRepository.find({
      where: {
        isActive: true,
        displayStatus: DISPLAY_VISIBLE,
      },
      order: {
        sortOrder: 'ASC',
        createdAt: 'ASC',
      },
    });
  }
}
