import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REQUIRED_ARTIFACTS = [
  { kind: 'file', name: 'viewer.html' },
  { kind: 'file', name: 'embed.js' },
  { kind: 'dir', name: 'assets' }
];

function sanitizePackageName(raw) {
  const value = String(raw || '').trim();
  if (!value) return '';
  return value.replace(/[^a-zA-Z0-9._-]+/g, '-');
}

function timestampName() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    '-',
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds())
  ].join('');
}

function assertBuildArtifacts(distDir) {
  for (const artifact of REQUIRED_ARTIFACTS) {
    const target = path.join(distDir, artifact.name);
    if (!fs.existsSync(target)) {
      throw new Error(`Missing required build artifact: ${target}`);
    }
    const stat = fs.statSync(target);
    if (artifact.kind === 'file' && !stat.isFile()) {
      throw new Error(`Expected file artifact but got non-file: ${target}`);
    }
    if (artifact.kind === 'dir' && !stat.isDirectory()) {
      throw new Error(`Expected directory artifact but got non-directory: ${target}`);
    }
  }
}

function readSceneData(scenePath) {
  if (!fs.existsSync(scenePath)) {
    throw new Error(`Scene file not found: ${scenePath}`);
  }
  const raw = fs.readFileSync(scenePath, 'utf8');
  try {
    return JSON.parse(raw);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown parse error';
    throw new Error(`Invalid scene JSON (${scenePath}): ${message}`);
  }
}

function buildPackageIndexHtml() {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Electric Field Simulator Package</title>
    <style>
      html, body { margin: 0; width: 100%; height: 100%; background: #0b1324; }
      iframe { width: 100%; height: 100%; border: 0; }
    </style>
  </head>
  <body>
    <iframe src="./viewer.html?mode=view&sceneUrl=./scene.json&toolbar=0" title="Electric Field Simulator"></iframe>
  </body>
</html>
`;
}

function buildPackageReadme(packageName) {
  return `# ${packageName}

This folder is a deploy-ready static package for the Electric Field Simulator viewer.

## Files

- \`index.html\`: package launch page (loads \`scene.json\` in view mode)
- \`viewer.html\`: viewer entry
- \`embed.js\`: host embedding SDK
- \`scene.json\`: packaged scene data
- \`assets/\`: runtime assets

## Quick Deploy

Upload the full folder to any static host (Vercel, Netlify, Cloudflare Pages, Nginx).

## iframe

\`./viewer.html?mode=view&sceneUrl=./scene.json\`

## SDK

\`\`\`html
<script src="./embed.js"></script>
<div id="sim"></div>
<script>
  const app = new ElectricFieldApp({ mode: 'view', sceneUrl: './scene.json' });
  app.inject('#sim');
</script>
\`\`\`
`;
}

export function createDeployPackage({
  distDir,
  scenePath,
  outputDir,
  packageName
}) {
  const resolvedDistDir = path.resolve(String(distDir || ''));
  const resolvedScenePath = path.resolve(String(scenePath || ''));
  const resolvedOutputDir = path.resolve(String(outputDir || ''));
  const safePackageName = sanitizePackageName(packageName);

  if (!safePackageName) {
    throw new Error('packageName is required.');
  }

  assertBuildArtifacts(resolvedDistDir);
  const sceneData = readSceneData(resolvedScenePath);

  const packageDir = path.join(resolvedOutputDir, safePackageName);
  fs.mkdirSync(resolvedOutputDir, { recursive: true });
  fs.rmSync(packageDir, { recursive: true, force: true });
  fs.mkdirSync(packageDir, { recursive: true });

  fs.copyFileSync(path.join(resolvedDistDir, 'viewer.html'), path.join(packageDir, 'viewer.html'));
  fs.copyFileSync(path.join(resolvedDistDir, 'embed.js'), path.join(packageDir, 'embed.js'));
  fs.cpSync(path.join(resolvedDistDir, 'assets'), path.join(packageDir, 'assets'), { recursive: true });

  fs.writeFileSync(path.join(packageDir, 'scene.json'), JSON.stringify(sceneData, null, 2), 'utf8');
  fs.writeFileSync(path.join(packageDir, 'index.html'), buildPackageIndexHtml(), 'utf8');
  fs.writeFileSync(path.join(packageDir, 'README-embed.md'), buildPackageReadme(safePackageName), 'utf8');

  return {
    packageDir,
    sceneOutputPath: path.join(packageDir, 'scene.json'),
    viewerPath: path.join(packageDir, 'viewer.html'),
    embedSdkPath: path.join(packageDir, 'embed.js')
  };
}

export function createZipArchive(packageDir, zipFilePath) {
  const resolvedPackageDir = path.resolve(packageDir);
  const resolvedZipFilePath = path.resolve(zipFilePath);
  fs.rmSync(resolvedZipFilePath, { force: true });

  const result = spawnSync('zip', ['-rq', resolvedZipFilePath, '.'], {
    cwd: resolvedPackageDir
  });

  if (result.error) {
    return {
      ok: false,
      message: result.error.message
    };
  }
  if (result.status !== 0) {
    const stderr = result.stderr ? String(result.stderr) : '';
    return {
      ok: false,
      message: stderr.trim() || `zip exited with status ${result.status}`
    };
  }
  return {
    ok: true,
    zipFilePath: resolvedZipFilePath
  };
}

export function resolveCliOptions(argv, cwd = process.cwd()) {
  const options = {
    scenePath: path.join(cwd, 'example-scene.json'),
    distDir: path.join(cwd, 'frontend', 'dist'),
    outputDir: path.join(cwd, 'output', 'embed-packages'),
    packageName: `electric-field-embed-${timestampName()}`,
    zip: true
  };

  const args = Array.isArray(argv) ? argv : [];
  for (let i = 0; i < args.length; i += 1) {
    const token = args[i];
    if (token === '--scene') {
      i += 1;
      options.scenePath = path.resolve(cwd, String(args[i] || ''));
      continue;
    }
    if (token === '--dist') {
      i += 1;
      options.distDir = path.resolve(cwd, String(args[i] || ''));
      continue;
    }
    if (token === '--out') {
      i += 1;
      options.outputDir = path.resolve(cwd, String(args[i] || ''));
      continue;
    }
    if (token === '--name') {
      i += 1;
      options.packageName = sanitizePackageName(args[i]);
      continue;
    }
    if (token === '--no-zip') {
      options.zip = false;
      continue;
    }
    throw new Error(`Unknown argument: ${token}`);
  }

  if (!options.packageName) {
    options.packageName = `electric-field-embed-${timestampName()}`;
  }

  return options;
}

function runCli() {
  const options = resolveCliOptions(process.argv.slice(2), process.cwd());
  const result = createDeployPackage(options);
  let zipResult = null;
  if (options.zip) {
    zipResult = createZipArchive(result.packageDir, `${result.packageDir}.zip`);
  }

  process.stdout.write(`Embed package ready: ${result.packageDir}\n`);
  if (zipResult?.ok) {
    process.stdout.write(`Zip archive ready: ${zipResult.zipFilePath}\n`);
  } else if (zipResult && !zipResult.ok) {
    process.stdout.write(`Zip archive skipped: ${zipResult.message}\n`);
  }
}

const scriptPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (scriptPath && scriptPath === fileURLToPath(import.meta.url)) {
  try {
    runCli();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  }
}
