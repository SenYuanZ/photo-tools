import { Controller, Get } from '@nestjs/common';
import { ServiceTypesService } from './service-types.service';

@Controller('service-types')
export class ServiceTypesController {
  constructor(private readonly serviceTypesService: ServiceTypesService) {}

  @Get()
  findAll() {
    return this.serviceTypesService.findAllActive();
  }
}
