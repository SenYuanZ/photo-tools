import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { QueryNotificationsDto } from './dto/query-notifications.dto';
import { NotificationsService } from './notifications.service';

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  list(
    @CurrentUser('sub') userId: string,
    @Query() query: QueryNotificationsDto,
  ) {
    return this.service.list(userId, query);
  }

  @Get('unread-count')
  count(@CurrentUser('sub') userId: string) {
    return this.service.unreadCount(userId);
  }

  @Patch('read-all')
  readAll(@CurrentUser('sub') userId: string) {
    return this.service.readAll(userId);
  }

  @Patch(':id/read')
  read(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.read(userId, id);
  }
}
