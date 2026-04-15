import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ProfileService } from './profile.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import sharp from 'sharp';

const uploadDir = join(process.cwd(), 'uploads', 'portfolio');
const uploadThumbDir = join(uploadDir, 'thumbs');
mkdirSync(uploadDir, { recursive: true });
mkdirSync(uploadThumbDir, { recursive: true });

const imageExtSet = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const imageMimeSet = new Set(['image/jpeg', 'image/png', 'image/webp']);

@UseGuards(JwtAuthGuard)
@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  get(@CurrentUser('sub') userId: string) {
    return this.profileService.get(userId);
  }

  @Patch()
  update(
    @CurrentUser('sub') userId: string,
    @Body() payload: UpdateProfileDto,
  ) {
    return this.profileService.update(userId, payload);
  }

  @Post('portfolio-images')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FilesInterceptor('files', 6, {
      storage: memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
      fileFilter: (_req, file, callback) => {
        const ext = extname(file.originalname).toLowerCase();
        callback(null, imageExtSet.has(ext) && imageMimeSet.has(file.mimetype));
      },
    }),
  )
  async uploadPortfolioImages(@UploadedFiles() files: Express.Multer.File[]) {
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
            url: `/uploads/portfolio/${filename}`,
            thumbnail: `/uploads/portfolio/thumbs/${filename}`,
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
