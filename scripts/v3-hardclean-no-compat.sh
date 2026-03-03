#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

FROM_STEP=0
TO_STEP=6
ASSUME_YES=0
DRY_RUN=0
STRICT_MANUAL=0

TAG_PREFIX="v3-hardclean"
NOW_STAMP="$(date +%Y%m%d-%H%M%S)"
CHECKPOINT_DIR=".git/hardclean"
CHECKPOINT_LOG="$CHECKPOINT_DIR/checkpoints.log"
CURRENT_PRE_TAG=""
CURRENT_STEP=""
CURRENT_LABEL=""

usage() {
  cat <<USAGE
Usage:
  ./scripts/v3-hardclean-no-compat.sh [options]

Options:
  --from N           Start from step N (default: 0)
  --to N             End at step N (default: 6)
  --yes              Non-interactive mode
  --dry-run          Print commands without executing
  --strict-manual    Stop at manual-heavy steps (2 and 5)
  --help             Show this help

Steps:
  0 baseline + branch + quality gate
  1 remove known-unused files (knip-safe set)
  2 simulatorStore split (manual-heavy; checkpoint only by default)
  3 migrate governance tests into frontend/test
  4 remove legacy js runtime + root node test chain
  5 style branch simplification (manual-heavy; checkpoint only by default)
  6 docs timeline/contract cleanup
USAGE
}

log() {
  printf '[hardclean] %s\n' "$*"
}

warn() {
  printf '[hardclean][warn] %s\n' "$*" >&2
}

die() {
  printf '[hardclean][error] %s\n' "$*" >&2
  exit 1
}

run_cmd() {
  if [[ "$DRY_RUN" -eq 1 ]]; then
    printf '[dry-run] %s\n' "$*" >&2
    return 0
  fi
  eval "$*"
}

confirm() {
  local prompt="$1"
  if [[ "$ASSUME_YES" -eq 1 ]]; then
    return 0
  fi
  printf '%s [y/N]: ' "$prompt"
  read -r ans
  [[ "$ans" == "y" || "$ans" == "Y" ]]
}

ensure_clean_worktree() {
  if ! git diff --quiet || ! git diff --cached --quiet; then
    die "worktree has uncommitted changes. commit/stash first."
  fi
}

make_tag() {
  local step="$1"
  local kind="$2"
  local tag="${TAG_PREFIX}-${NOW_STAMP}-s${step}-${kind}"
  run_cmd "mkdir -p '$CHECKPOINT_DIR'"
  run_cmd "git tag '$tag'"
  run_cmd "printf '%s\t%s\t%s\t%s\n' '$(date -u +%Y-%m-%dT%H:%M:%SZ)' '$step' '$kind' '$tag' >> '$CHECKPOINT_LOG'"
  printf '%s' "$tag"
}

begin_step() {
  CURRENT_STEP="$1"
  CURRENT_LABEL="$2"
  log "step ${CURRENT_STEP}: ${CURRENT_LABEL}"
  CURRENT_PRE_TAG="$(make_tag "$CURRENT_STEP" pre)"
  log "checkpoint(pre): $CURRENT_PRE_TAG"
}

finish_step() {
  local commit_msg="$1"
  if [[ "$DRY_RUN" -eq 0 ]]; then
    if ! git diff --quiet || ! git diff --cached --quiet; then
      git add -A
      git commit -m "$commit_msg"
      log "committed: $commit_msg"
    else
      log "no file changes in step ${CURRENT_STEP}, skip commit"
    fi
  else
    printf '[dry-run] git add -A && git commit -m "%s" (if changed)\n' "$commit_msg"
  fi
  local post_tag
  post_tag="$(make_tag "$CURRENT_STEP" post)"
  log "checkpoint(post): $post_tag"
}

on_err() {
  local exit_code="$1"
  if [[ -n "$CURRENT_STEP" ]]; then
    warn "failed at step ${CURRENT_STEP}: ${CURRENT_LABEL}"
  fi
  if [[ -n "$CURRENT_PRE_TAG" ]]; then
    warn "rollback command: git reset --hard $CURRENT_PRE_TAG"
    warn "or inspect with: git show $CURRENT_PRE_TAG"
  fi
  exit "$exit_code"
}

trap 'on_err $?' ERR

step_enabled() {
  local n="$1"
  [[ "$n" -ge "$FROM_STEP" && "$n" -le "$TO_STEP" ]]
}

step0_baseline() {
  begin_step 0 "baseline + branch + quality gate"
  ensure_clean_worktree

  local current_branch
  current_branch="$(git branch --show-current)"
  if [[ "$current_branch" != codex/* ]]; then
    local new_branch="codex/v3-hardclean-no-compat-${NOW_STAMP}"
    run_cmd "git checkout -b '$new_branch'"
    log "created branch: $new_branch"
  else
    log "using existing codex branch: $current_branch"
  fi

  run_cmd "npm run quality:all"
  local baseline_tag="${TAG_PREFIX}-${NOW_STAMP}-baseline"
  run_cmd "git tag '$baseline_tag'"
  log "baseline tag: $baseline_tag"

  finish_step "chore(hardclean): baseline checkpoint before no-compat cleanup"
}

remove_if_exists() {
  local path="$1"
  if [[ -e "$path" ]]; then
    run_cmd "git rm '$path'"
  else
    log "skip missing: $path"
  fi
}

step1_delete_knip_safe() {
  begin_step 1 "remove known-unused files (knip-safe set)"

  local files=(
    "frontend/src/components/AppStatusFooter.vue"
    "frontend/src/components/AuthoringPanels.vue"
    "frontend/src/components/DesktopToolbarSidebar.vue"
    "frontend/src/components/DrawerHost.vue"
    "frontend/src/components/GeometryOverlayBadge.vue"
    "frontend/src/components/HeaderActionButtons.vue"
    "frontend/src/components/HeaderStatusAndSettings.vue"
    "frontend/src/components/MarkdownBoard.vue"
    "frontend/src/components/ObjectActionBar.vue"
    "frontend/src/components/PhoneAddSheet.vue"
    "frontend/src/components/PhoneAuthoringSheets.vue"
    "frontend/src/components/PhoneBottomNav.vue"
    "frontend/src/components/PhoneMoreSheet.vue"
    "frontend/src/components/PhoneSceneSheet.vue"
    "frontend/src/components/PhoneSelectedSheet.vue"
    "frontend/src/components/PropertyDrawer.vue"
    "frontend/src/components/SceneSettingsControls.vue"
    "frontend/src/components/SelectionContextMenu.vue"
    "frontend/src/components/ToolbarPanel.vue"
    "frontend/src/components/VariablesPanel.vue"
    "frontend/src/modes/layoutMode.ts"
    "frontend/src/modes/phoneGeometry.ts"
    "frontend/src/modes/useAppActions.ts"
    "frontend/src/modes/useAppShellClass.ts"
    "frontend/src/modes/useAppUiState.ts"
    "frontend/src/modes/usePhoneSheets.ts"
    "frontend/src/modes/useViewportLayout.ts"
    "frontend/src/utils/swipeCloseGesture.ts"
    "js/utils/PerformanceMonitor.js"
    "js/utils/ThemeManager.js"
  )

  local f
  for f in "${files[@]}"; do
    remove_if_exists "$f"
  done

  run_cmd "npm run build:frontend"
  run_cmd "npx knip --reporter compact || true"

  finish_step "refactor(hardclean): remove known-unused files before legacy hard cut"
}

step2_manual_store_split() {
  begin_step 2 "simulatorStore split (manual-heavy checkpoint)"

  warn "Step 2 is semantic refactor heavy and not auto-applied by this script."
  warn "Target split: runtimeStore / interactionStore / sceneIoStore / uiShellStore."
  warn "Suggested resume command after manual work: ./scripts/v3-hardclean-no-compat.sh --from 3 --yes"

  if [[ "$STRICT_MANUAL" -eq 1 ]]; then
    die "strict-manual mode: stop at step 2 for manual refactor"
  fi

  finish_step "chore(hardclean): checkpoint after manual store-split gate"
}

step3_migrate_governance_tests() {
  begin_step 3 "migrate governance tests into frontend/test"

  if [[ "$DRY_RUN" -eq 1 ]]; then
    warn "[dry-run] write frontend/test/v3-entry-contract.test.ts"
  else
    cat > frontend/test/v3-entry-contract.test.ts <<'TS'
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('v3 entry contract', () => {
  it('root index points to frontend Vue entry', () => {
    const html = readFileSync('index.html', 'utf8');
    expect(html).toMatch(/<div id="root"><\/div>/);
    expect(html).toMatch(/src="\.\/frontend\/src\/main\.ts"/);
  });
});
TS
  fi

  if [[ "$DRY_RUN" -eq 1 ]]; then
    warn "[dry-run] write frontend/test/v3-node-policy.test.ts"
  else
    cat > frontend/test/v3-node-policy.test.ts <<'TS'
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';

function readText(path: string) {
  return readFileSync(path, 'utf8');
}

describe('v3 node policy', () => {
  it('.nvmrc exists and is non-empty', () => {
    expect(existsSync('.nvmrc')).toBe(true);
    expect(readText('.nvmrc').trim().length).toBeGreaterThan(0);
  });

  it('package engines.node keeps >=24 <26 range', () => {
    const pkg = JSON.parse(readText('package.json'));
    expect(typeof pkg?.engines?.node).toBe('string');
    expect(pkg.engines.node).toMatch(/>=24\s*<26/);
  });

  it('README and TESTING-GUIDE mention Node 24/25 policy', () => {
    const combined = `${readText('README.md')}\n${readText('TESTING-GUIDE.md')}`;
    expect(combined).toMatch(/Node\.js[:：]?\s*.*24\.x/i);
    expect(combined).toMatch(/Node\.js[:：]?\s*.*25\.x/i);
  });
});
TS
  fi

  if [[ "$DRY_RUN" -eq 1 ]]; then
    warn "[dry-run] write frontend/test/v3-deploy-contract.test.ts"
  else
    cat > frontend/test/v3-deploy-contract.test.ts <<'TS'
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

function readText(path: string) {
  return readFileSync(path, 'utf8');
}

describe('v3 deploy contract', () => {
  it('docker serves frontend/dist artifact', () => {
    const dockerfile = readText('Dockerfile');
    expect(dockerfile).toMatch(/FROM\s+node:/i);
    expect(dockerfile).toMatch(/npm\s+run\s+build:frontend/i);
    expect(dockerfile).toMatch(/COPY\s+--from=.*frontend\/dist\s+\/usr\/share\/nginx\/html/i);
    expect(dockerfile).not.toMatch(/COPY\s+\.\s+\/usr\/share\/nginx\/html/i);
  });

  it('vercel output targets frontend/dist', () => {
    const config = JSON.parse(readText('vercel.json'));
    expect(config.outputDirectory).toBe('frontend/dist');
    expect(config.buildCommand).toBe('npm run build:frontend');
  });
});
TS
  fi

  if [[ "$DRY_RUN" -eq 1 ]]; then
    warn "[dry-run] write frontend/test/v3-doc-governance.test.ts"
  else
    cat > frontend/test/v3-doc-governance.test.ts <<'TS'
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

function readText(path: string) {
  return readFileSync(path, 'utf8');
}

describe('v3 doc governance', () => {
  it('quickstart documents v3 scene contract', () => {
    const text = readText('QUICKSTART.md');
    expect(text).toMatch(/version.*3\.0|version.*revision.*running.*timeStep.*viewport.*selectedObjectId.*objects/si);
    expect(text).not.toMatch(/必需字段[^。\n]*electricFields[^。\n]*magneticFields[^。\n]*particles/i);
  });

  it('launch checklist has no unresolved checkboxes', () => {
    const text = readText('docs/release/frontend-rewrite-launch-checklist.md');
    const unresolved = text.split('\n').map((l) => l.trim()).filter((l) => l.startsWith('- [ ]'));
    expect(unresolved).toHaveLength(0);
  });
});
TS
  fi

  run_cmd "npm run test:frontend"

  finish_step "test(hardclean): migrate governance checks into frontend vitest suites"
}

step4_remove_legacy_runtime_and_root_tests() {
  begin_step 4 "remove legacy js runtime + root node test chain"

  if [[ -d js ]]; then
    run_cmd "git rm -r js"
  fi

  if [[ -d test ]]; then
    run_cmd "git rm -r test"
  fi

  if [[ -f test_theme_integration.py ]]; then
    run_cmd "git rm test_theme_integration.py"
  fi

  run_cmd "npm uninstall katex || true"
  run_cmd "npm uninstall -D @vue/test-utils || true"

  if [[ "$DRY_RUN" -eq 1 ]]; then
    warn "[dry-run] patch package.json scripts"
  else
    node <<'NODE'
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
if (pkg.scripts) {
  delete pkg.scripts.test;
  pkg.scripts['quality:all'] = 'npm run lint:frontend && npm run typecheck:frontend && npm run test:frontend && npm run test:e2e';
}
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
NODE
  fi

  run_cmd "perl -0777 -i -pe 's/\\n\\s*- name: Node test suite\\n\\s*run: npm test\\n//s' .github/workflows/frontend-rewrite-gates.yml"

  run_cmd "npm install"
  run_cmd "npm run quality:all"

  finish_step "refactor(hardclean): delete legacy runtime and switch quality gate to frontend-only"
}

step5_manual_style_cleanup() {
  begin_step 5 "style branch simplification (manual-heavy checkpoint)"

  warn "Step 5 is manual-heavy: split and prune styles/main.css + styles/components.css."
  warn "Target: only selectors reachable from App.vue + CanvasViewport.vue remain."
  warn "Suggested resume command after manual work: ./scripts/v3-hardclean-no-compat.sh --from 6 --yes"

  if [[ "$STRICT_MANUAL" -eq 1 ]]; then
    die "strict-manual mode: stop at step 5 for manual style cleanup"
  fi

  finish_step "chore(hardclean): checkpoint after manual style-cleanup gate"
}

step6_docs_cleanup() {
  begin_step 6 "docs timeline/contract cleanup"

  if [[ -f docs/release/2026-03-17-tech-debt-round2-closure-report.md ]]; then
    run_cmd "mkdir -p docs/history/release"
    run_cmd "git mv docs/release/2026-03-17-tech-debt-round2-closure-report.md docs/history/release/2026-03-17-tech-debt-round2-closure-report.md"
  fi

  if [[ "$DRY_RUN" -eq 1 ]]; then
    warn "[dry-run] patch docs/plans/2026-03-03-tech-debt-ledger.md D-05 wording"
  else
    perl -i -pe 's/Scene hard-cut \(`version: 2\.0`\)/Scene hard-cut (`version: 3.0`)/g' docs/plans/2026-03-03-tech-debt-ledger.md
    perl -i -pe 's/scripts\/migrate-scene-v1-to-v2\.mjs/out-of-band conversion workflow/g' docs/plans/2026-03-03-tech-debt-ledger.md
    perl -i -pe 's/strict checks in `sceneSchema\.ts` and `Serializer\.js`/strict checks in `sceneSchema.ts` and `sceneAggregate.ts`/g' docs/plans/2026-03-03-tech-debt-ledger.md
  fi

  if [[ "$DRY_RUN" -eq 1 ]]; then
    warn "[dry-run] rewrite TESTING-GUIDE.md"
  else
    cat > TESTING-GUIDE.md <<'MD'
# 测试指南（V3 主线）

## 环境要求

- Node.js `24.x` 或 `25.x`（推荐 `24.x`）
- npm 10+
- 建议使用 `.nvmrc`：`nvm use`

说明：
- CI 在 Node `24` 和 `25` 上执行前端质量门禁。

## 一键质量门禁

```bash
npm run quality:all
```

该命令会串行执行：

- `npm run lint:frontend`
- `npm run typecheck:frontend`
- `npm run test:frontend`
- `npm run test:e2e`

## 分层测试说明

### 1) Vue 组件与状态层（Vitest）

```bash
npm run test:frontend
```

覆盖 V3 domain/application/interaction/infrastructure 边界和 UI 绑定合约。

### 2) 浏览器端关键路径（Playwright）

```bash
npm run test:e2e
```

默认会在 `127.0.0.1:4273` 启动前端服务。

端口冲突可临时改用：

```bash
E2E_PORT=4373 npm run test:e2e
```

手机端专项回归：

```bash
npm run test:e2e -- --project=phone-chromium
```

## 手工冒烟（推荐）

1. 启动：`npm run dev:frontend`
2. 访问终端提示地址（默认 `http://localhost:5173`）
3. 验证：创建对象、编辑属性、播放/暂停、导入/导出、嵌入模式。

## 常见问题

`.vue` 和 `main.ts` 需要 Vite 编译，不要直接用静态服务器打开源码目录。

- 开发：`npm run dev:frontend`
- 静态部署：`npm run build:frontend` 后服务 `frontend/dist`
MD
  fi

  run_cmd "npm run test:frontend"

  if [[ "$DRY_RUN" -eq 1 ]]; then
    warn "[dry-run] scan docs for stale compatibility markers"
  else
    rg -n -F 'version: "2.0"' README.md QUICKSTART.md TESTING-GUIDE.md docs/migration docs/release docs/plans/2026-03-03-tech-debt-ledger.md || true
    rg -n -F 'migrate-scene-v1-to-v2' README.md QUICKSTART.md TESTING-GUIDE.md docs/migration docs/release docs/plans/2026-03-03-tech-debt-ledger.md || true
    rg -n -F 'npm test' README.md QUICKSTART.md TESTING-GUIDE.md docs/migration docs/release docs/plans/2026-03-03-tech-debt-ledger.md || true
  fi

  finish_step "docs(hardclean): align docs timeline and v3-only contracts"
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --from)
        FROM_STEP="$2"
        shift 2
        ;;
      --to)
        TO_STEP="$2"
        shift 2
        ;;
      --yes)
        ASSUME_YES=1
        shift
        ;;
      --dry-run)
        DRY_RUN=1
        shift
        ;;
      --strict-manual)
        STRICT_MANUAL=1
        shift
        ;;
      --help|-h)
        usage
        exit 0
        ;;
      *)
        die "unknown option: $1"
        ;;
    esac
  done

  [[ "$FROM_STEP" =~ ^[0-6]$ ]] || die "--from must be 0..6"
  [[ "$TO_STEP" =~ ^[0-6]$ ]] || die "--to must be 0..6"
  if [[ "$FROM_STEP" -gt "$TO_STEP" ]]; then
    die "--from cannot be greater than --to"
  fi
}

main() {
  parse_args "$@"

  log "repo: $ROOT_DIR"
  log "range: step $FROM_STEP .. step $TO_STEP"
  if [[ "$DRY_RUN" -eq 1 ]]; then
    warn "dry-run mode enabled"
  fi
  if [[ "$STRICT_MANUAL" -eq 1 ]]; then
    warn "strict-manual mode enabled (will stop at steps 2 and 5)"
  fi

  if ! confirm "Proceed with hard cleanup operations?"; then
    die "aborted by user"
  fi

  if step_enabled 0; then step0_baseline; fi
  if step_enabled 1; then step1_delete_knip_safe; fi
  if step_enabled 2; then step2_manual_store_split; fi
  if step_enabled 3; then step3_migrate_governance_tests; fi
  if step_enabled 4; then step4_remove_legacy_runtime_and_root_tests; fi
  if step_enabled 5; then step5_manual_style_cleanup; fi
  if step_enabled 6; then step6_docs_cleanup; fi

  log "all requested steps finished"
  log "checkpoints log: $CHECKPOINT_LOG"
}

main "$@"
