import { z } from 'zod';

export const SCENE_VERSION = '3.0';

const SceneObjectSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['particle', 'electric-field', 'magnetic-field']),
  position: z.object({
    x: z.number(),
    y: z.number()
  }),
  velocity: z.object({
    x: z.number(),
    y: z.number()
  }),
  radius: z.number().positive().default(10),
  width: z.number().positive().default(20),
  height: z.number().positive().default(20),
  color: z.string().default('#58a6ff'),
  props: z.record(z.string(), z.unknown()).default({})
}).strict();

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
}).strict();

export type SceneData = z.infer<typeof SceneSchema>;
