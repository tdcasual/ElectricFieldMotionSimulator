import { z } from 'zod';

export const SCENE_VERSION = '3.0';

const SceneObjectSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['particle', 'electric-field', 'magnetic-field']),
  x: z.number().optional(),
  y: z.number().optional(),
  position: z.object({
    x: z.number(),
    y: z.number()
  }).optional(),
  velocityX: z.number().optional(),
  velocityY: z.number().optional(),
  velocity: z.object({
    x: z.number(),
    y: z.number()
  }).optional(),
  radius: z.number().positive().default(10),
  width: z.number().positive().default(20),
  height: z.number().positive().default(20),
  color: z.string().default('#58a6ff'),
  props: z.record(z.string(), z.unknown()).default({})
}).passthrough().superRefine((value, ctx) => {
  const hasXY = Number.isFinite(value.x) && Number.isFinite(value.y);
  const hasPosition = !!value.position && Number.isFinite(value.position.x) && Number.isFinite(value.position.y);
  if (!hasXY && !hasPosition) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['position'],
      message: 'x/y or position{x,y} is required'
    });
  }
});

export const SceneSchema = z.object({
  version: z.literal(SCENE_VERSION),
  revision: z.number().int().nonnegative().default(0),
  running: z.boolean().default(false),
  timeStep: z.number().positive().default(0.016),
  viewport: z.object({
    width: z.number().positive().default(1280),
    height: z.number().positive().default(720)
  }).default({ width: 1280, height: 720 }),
  selectedObjectId: z.string().nullable().default(null),
  objects: z.array(SceneObjectSchema).default([])
}).passthrough();

export type SceneData = z.infer<typeof SceneSchema>;

export function getSceneCompatibilityError(data: unknown): string | null {
  const result = SceneSchema.safeParse(data);
  if (result.success) return null;

  const hasVersionIssue = result.error.issues.some((issue) => issue.path[0] === 'version');
  if (hasVersionIssue) {
    return `仅支持 ${SCENE_VERSION} 版本场景。`;
  }
  return '场景数据格式无效';
}
