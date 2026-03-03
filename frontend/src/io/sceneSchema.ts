import { z } from 'zod';

export const SCENE_VERSION = '2.0';

export const SceneSchema = z.object({
  version: z.literal(SCENE_VERSION),
  settings: z.record(z.string(), z.unknown()).default({}),
  objects: z.array(z.record(z.string(), z.unknown()))
}).passthrough();

export type SceneData = z.infer<typeof SceneSchema>;

export function getSceneCompatibilityError(data: unknown): string | null {
  const result = SceneSchema.safeParse(data);
  if (result.success) return null;

  const hasVersionIssue = result.error.issues.some((issue) => issue.path[0] === 'version');
  if (hasVersionIssue) {
    return `仅支持 ${SCENE_VERSION} 版本场景。请先运行 migrate:scene-v1-v2 迁移命令。`;
  }
  return '场景数据格式无效';
}
