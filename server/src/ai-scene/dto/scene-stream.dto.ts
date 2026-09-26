import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export const SCENE_TYPES = ['shoot_plan'] as const;
export type SceneType = (typeof SCENE_TYPES)[number];

export class SceneStreamDto {
  @IsString()
  @IsNotEmpty()
  scheduleId: string;

  @IsIn(SCENE_TYPES)
  scene: SceneType;
}
