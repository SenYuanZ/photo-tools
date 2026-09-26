import type { SceneType } from '../dto/scene-stream.dto';

export interface SceneAiBrief {
  themeType?: string;
  workName?: string;
  characterName?: string;
  characterSetting?: string;
  outfit?: string;
  makeupHair?: string;
  props?: string;
  visualGoal?: string;
  posePreference?: string;
  avoid?: string;
}

export interface SceneContext {
  serviceType: string;
  serviceTypeName: string;
  serviceRoles: string[];
  customerType: string;
  customerTypeName: string;
  style: string;
  hobby: string;
  specialNeed: string;
  outfit: string;
  companions: string;
  aiBrief?: SceneAiBrief;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  note: string;
  referenceImageCount: number;
}

export interface SceneResultEnvelope {
  scene: SceneType;
  title?: string;
  summary?: string;
  sections?: Record<string, unknown>;
  markdown?: string;
  format: 'structured' | 'markdown';
  warnings: string[];
}
