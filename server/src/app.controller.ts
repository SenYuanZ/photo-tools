import { Controller, Get, Query, Res } from '@nestjs/common';
import { Readable } from 'node:stream';
import type { Response } from 'express';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  health() {
    return this.appService.getHealth();
  }

  @Get('ai-image-proxy')
  async aiImageProxy(
    @Query('url') url: string,
    @Res() res: Response,
  ): Promise<void> {
    if (!url) {
      res.status(400).json({ message: 'url 参数缺失' });
      return;
    }
    if (!/^https?:\/\/.+/i.test(url)) {
      res.status(400).json({ message: '仅支持 http/https 地址' });
      return;
    }
    let upstream: globalThis.Response;
    try {
      upstream = await fetch(url);
      if (!upstream.ok) {
        res
          .status(upstream.status)
          .json({ message: `图片下载失败（${upstream.status}）` });
        return;
      }
    } catch (error) {
      res
        .status(502)
        .json({ message: `图片下载失败：${(error as Error).message}` });
      return;
    }

    try {
      const contentType = upstream.headers.get('content-type') || 'image/png';
      const upstreamLength = upstream.headers.get('content-length');
      res.setHeader('Content-Type', contentType);
      if (upstreamLength) {
        res.setHeader('Content-Length', upstreamLength);
      }
      res.setHeader('Access-Control-Allow-Origin', '*');
      if (upstream.body) {
        Readable.fromWeb(
          upstream.body as import('node:stream/web').ReadableStream,
        ).pipe(res);
      } else {
        res.end(Buffer.from(await upstream.arrayBuffer()));
      }
    } catch (error) {
      if (!res.headersSent) {
        res
          .status(502)
          .json({ message: `图片下载失败：${(error as Error).message}` });
      } else {
        res.end();
      }
    }
  }
}
