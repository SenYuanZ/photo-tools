import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { SettingsService } from './settings.service';

@UseGuards(JwtAuthGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  get(@CurrentUser('sub') userId: string) {
    return this.settingsService.get(userId);
  }

  @Patch()
  update(
    @CurrentUser('sub') userId: string,
    @Body() payload: UpdateSettingsDto,
  ) {
    return this.settingsService.update(userId, payload);
  }
}
