import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreateInviteCodeDto } from './dto/create-invite-code.dto';
import { UpdateInviteCodeDto } from './dto/update-invite-code.dto';
import { InviteCodesService } from './invite-codes.service';

@UseGuards(JwtAuthGuard)
@Controller('invite-codes')
export class InviteCodesController {
  constructor(private readonly inviteCodesService: InviteCodesService) {}

  @Get()
  findAll() {
    return this.inviteCodesService.findAll();
  }

  @Post()
  create(@Body() payload: CreateInviteCodeDto) {
    return this.inviteCodesService.create(payload);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() payload: UpdateInviteCodeDto) {
    return this.inviteCodesService.update(id, payload);
  }
}
