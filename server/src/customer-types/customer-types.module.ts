import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerTypeOption } from '../database/entities/customer-type.entity';
import { CustomerTypesController } from './customer-types.controller';
import { CustomerTypesService } from './customer-types.service';

@Module({
  imports: [TypeOrmModule.forFeature([CustomerTypeOption])],
  controllers: [CustomerTypesController],
  providers: [CustomerTypesService],
  exports: [CustomerTypesService],
})
export class CustomerTypesModule {}
