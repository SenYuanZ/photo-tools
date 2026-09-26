import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerTypeOption } from '../database/entities/customer-type.entity';
import { RoleOption } from '../database/entities/role.entity';
import { Schedule } from '../database/entities/schedule.entity';
import { ServiceTypeOption } from '../database/entities/service-type.entity';
import { AiSceneController } from './ai-scene.controller';
import { AiSceneService } from './ai-scene.service';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      Schedule,
      ServiceTypeOption,
      RoleOption,
      CustomerTypeOption,
    ]),
  ],
  controllers: [AiSceneController],
  providers: [AiSceneService],
})
export class AiSceneModule {}
