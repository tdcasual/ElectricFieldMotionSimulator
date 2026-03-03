import { SCENE_VERSION, SceneSchema, type SceneData } from './sceneSchema';

type SceneValidationResult =
  | { ok: true; data: SceneData }
  | { ok: false; error: string; issues: string[] };

export function validateSceneData(input: unknown): SceneValidationResult {
  const result = SceneSchema.safeParse(input);
  if (!result.success) {
    const hasVersionIssue = result.error.issues.some((issue) => issue.path[0] === 'version');
    const issueMessages = result.error.issues.map((issue) => `${issue.path.join('.') || 'root'}: ${issue.message}`);
    return {
      ok: false,
      error: hasVersionIssue ? `仅支持 ${SCENE_VERSION} 版本场景。` : (issueMessages[0] || 'Invalid scene payload'),
      issues: issueMessages
    };
  }

  return {
    ok: true,
    data: result.data
  };
}
