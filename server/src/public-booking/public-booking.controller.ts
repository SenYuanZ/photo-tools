import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';
import type { Request } from 'express';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import sharp from 'sharp';
import { CreatePublicBookingDto } from './dto/create-public-booking.dto';
import { QueryPublicAvailabilityDto } from './dto/query-public-availability.dto';
import { PublicBookingService } from './public-booking.service';

const uploadDir = join(process.cwd(), 'uploads', 'references');
const uploadThumbDir = join(uploadDir, 'thumbs');
mkdirSync(uploadDir, { recursive: true });
mkdirSync(uploadThumbDir, { recursive: true });

const imageExtSet = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const imageMimeSet = new Set(['image/jpeg', 'image/png', 'image/webp']);

@Controller('public')
export class PublicBookingController {
  constructor(private readonly publicBookingService: PublicBookingService) {}

  @Get('photographers')
  listPhotographers() {
    return this.publicBookingService.listProviders('photography');
  }

  @Get('providers')
  listProviders(@Query('serviceTypeCode') serviceTypeCode?: string) {
    return this.publicBookingService.listProviders(serviceTypeCode);
  }

  @Get('service-types')
  listServiceTypes() {
    return this.publicBookingService.listServiceTypes();
  }

  @Get('availability')
  getAvailability(@Query() query: QueryPublicAvailabilityDto) {
    const providerId = query.providerId || query.photographerId;
    if (!providerId) {
      throw new BadRequestException('请选择服务提供者');
    }

    return this.publicBookingService.getAvailability(
      providerId,
      query.date,
      query.serviceTypeCode,
    );
  }

  @Post('bookings')
  createBooking(@Body() payload: CreatePublicBookingDto) {
    return this.publicBookingService.createBooking(payload);
  }

  @Post('reference-images')
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
  async uploadReferenceImages(
    @UploadedFiles() files: Express.Multer.File[],
    @Req() request: Request,
  ) {
    if (!files?.length) {
      throw new BadRequestException('请上传 jpg/png/webp 图片文件');
    }

    const protocol =
      request.headers['x-forwarded-proto']?.toString() ||
      request.protocol ||
      'http';
    const host = request.get('host') || '127.0.0.1:3000';

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
            url: `${protocol}://${host}/uploads/references/${filename}`,
            thumbnail: `${protocol}://${host}/uploads/references/thumbs/${filename}`,
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
}
