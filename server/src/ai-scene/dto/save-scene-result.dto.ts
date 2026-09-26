import { IsBoolean, IsIn, IsObject, IsOptional } from 'class-validator';
import { SCENE_TYPES } from './scene-stream.dto';
import type { SceneType } from './scene-stream.dto';

export class SaveSceneResultDto {
  @IsIn(SCENE_TYPES)
  scene: SceneType;

  @IsObject()
  result: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  saveToNote?: boolean;
}
