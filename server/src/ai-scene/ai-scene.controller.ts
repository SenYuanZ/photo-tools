import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AiSceneService } from './ai-scene.service';
import { SceneStreamDto } from './dto/scene-stream.dto';
import { SaveSceneResultDto } from './dto/save-scene-result.dto';

@UseGuards(JwtAuthGuard)
@Controller('ai/scene')
export class AiSceneController {
  constructor(private readonly aiSceneService: AiSceneService) {}

  @Post('stream')
  async stream(
    @CurrentUser('sub') userId: string,
    @Body() dto: SceneStreamDto,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const abortController = new AbortController();
    req.on('close', () => abortController.abort());
    try {
      const upstream = await this.aiSceneService.createUpstreamRequest(
        userId,
        dto,
        abortController.signal,
      );
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();
      if (upstream.body) {
        const reader = upstream.body.getReader();
        try {
          while (!abortController.signal.aborted) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(Buffer.from(value));
          }
        } finally {
          reader.releaseLock();
        }
      }
      res.end();
    } catch (error) {
      if (abortController.signal.aborted) return;
      if (!res.headersSent) throw error;
      res.write(
        `event: error\ndata: ${JSON.stringify({
          type: 'error',
          error: (error as Error).message || '场景生成失败',
        })}\n\n`,
      );
      res.end();
    }
  }

  @Post(':scheduleId/save')
  @HttpCode(HttpStatus.OK)
  save(
    @CurrentUser('sub') userId: string,
    @Param('scheduleId') scheduleId: string,
    @Body() dto: SaveSceneResultDto,
  ) {
    return this.aiSceneService.saveResult(userId, scheduleId, dto);
  }
}
