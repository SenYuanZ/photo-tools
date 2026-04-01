import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { compare } from 'bcryptjs';
import { Repository } from 'typeorm';
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { User } from '../database/entities/user.entity';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async login(payload: LoginDto) {
    const user = await this.usersRepository.findOne({
      where: { account: payload.account },
    });
    if (!user) {
      throw new UnauthorizedException('账号或密码错误');
    }

    const isPasswordValid = await compare(payload.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('账号或密码错误');
    }

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
      },
    };
  }
}
