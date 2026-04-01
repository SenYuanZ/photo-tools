import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { QueryCustomersDto } from './dto/query-customers.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomersService } from './customers.service';

@UseGuards(JwtAuthGuard)
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  findAll(
    @CurrentUser('sub') userId: string,
    @Query() query: QueryCustomersDto,
  ) {
    return this.customersService.findAll(userId, query);
  }

  @Post()
  create(
    @CurrentUser('sub') userId: string,
    @Body() payload: CreateCustomerDto,
  ) {
    return this.customersService.create(userId, payload);
  }

  @Patch(':id')
  update(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() payload: UpdateCustomerDto,
  ) {
    return this.customersService.update(userId, id, payload);
  }

  @Delete(':id')
  remove(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.customersService.remove(userId, id);
  }
}
