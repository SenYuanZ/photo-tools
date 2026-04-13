import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { mkdirSync } from 'node:fs';
import { join, extname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import sharp from 'sharp';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { QueryHistoryDto } from './dto/query-history.dto';
import { QuerySchedulesDto } from './dto/query-schedules.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { SchedulesService } from './schedules.service';

const uploadDir = join(process.cwd(), 'uploads', 'references');
const uploadThumbDir = join(uploadDir, 'thumbs');
mkdirSync(uploadDir, { recursive: true });
mkdirSync(uploadThumbDir, { recursive: true });

const imageExtSet = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const imageMimeSet = new Set(['image/jpeg', 'image/png', 'image/webp']);

@UseGuards(JwtAuthGuard)
@Controller()
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Get('schedules')
  findAll(
    @CurrentUser('sub') userId: string,
    @Query() query: QuerySchedulesDto,
  ) {
    return this.schedulesService.findAll(userId, query);
  }

  @Get('schedules/:id')
  findOne(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.schedulesService.findOne(userId, id);
  }

  @Post('schedules')
  create(
    @CurrentUser('sub') userId: string,
    @Body() payload: CreateScheduleDto,
  ) {
    return this.schedulesService.create(userId, payload);
  }

  @Post('schedules/reference-images')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FilesInterceptor('files', 6, {
      storage: memoryStorage(),
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
      fileFilter: (_req, file, callback) => {
        const ext = extname(file.originalname).toLowerCase();
        callback(null, imageExtSet.has(ext) && imageMimeSet.has(file.mimetype));
      },
    }),
  )
  async uploadReferenceImages(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files?.length) {
      throw new BadRequestException('请上传 jpg/png/webp 图片文件');
    }

    try {
      const uploaded = await Promise.all(
        files.map(async (file) => {
          const filename = `${Date.now()}-${randomUUID()}.webp`;
          const fullPath = join(uploadDir, filename);
          const thumbPath = join(uploadThumbDir, filename);

          const image = sharp(file.buffer).rotate();
          await image
            .clone()
            .resize({ width: 1600, withoutEnlargement: true })
            .webp({ quality: 82 })
            .toFile(fullPath);

          await image
            .clone()
            .resize({ width: 360, withoutEnlargement: true })
            .webp({ quality: 72 })
            .toFile(thumbPath);

          return {
            url: `/uploads/references/${filename}`,
            thumbnail: `/uploads/references/thumbs/${filename}`,
          };
        }),
      );

      return {
        urls: uploaded.map((item) => item.url),
        thumbnails: uploaded.map((item) => item.thumbnail),
      };
    } catch {
      throw new BadRequestException('图片处理失败，请更换图片后重试');
    }
  }

  @Patch('schedules/:id')
  update(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() payload: UpdateScheduleDto,
  ) {
    return this.schedulesService.update(userId, id, payload);
  }

  @Delete('schedules/:id')
  remove(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.schedulesService.remove(userId, id);
  }

  @Get('history')
  history(@CurrentUser('sub') userId: string, @Query() query: QueryHistoryDto) {
    return this.schedulesService.history(userId, query);
  }
}
