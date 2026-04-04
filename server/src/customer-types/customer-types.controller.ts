import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CustomerTypesService } from './customer-types.service';

@UseGuards(JwtAuthGuard)
@Controller('customer-types')
export class CustomerTypesController {
  constructor(private readonly customerTypesService: CustomerTypesService) {}

  @Get()
  findAll() {
    return this.customerTypesService.findAllActive();
  }
}
