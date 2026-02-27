import fs from 'node:fs';
import path from 'node:path';
import { createDeployPackage } from './embed-packager.mjs';

function resolveOptionValue(args, name, defaultValue) {
  const index = args.indexOf(name);
  if (index < 0) return defaultValue;
  const value = args[index + 1];
  return value ? value : defaultValue;
}

function copyDirectoryContents(sourceDir, targetDir) {
  fs.rmSync(targetDir, { recursive: true, force: true });
  fs.mkdirSync(targetDir, { recursive: true });

  const entries = fs.readdirSync(sourceDir, { withFileTypes: true });
  for (const entry of entries) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);
    if (entry.isDirectory()) {
      fs.cpSync(sourcePath, targetPath, { recursive: true });
    } else {
      fs.copyFileSync(sourcePath, targetPath);
    }
  }
}

function run(argv = process.argv.slice(2), cwd = process.cwd()) {
  const scenePath = path.resolve(
    cwd,
    resolveOptionValue(argv, '--scene', './frontend/public/scenes/material-mock-particle.json')
  );
  const packageName = resolveOptionValue(argv, '--name', 'embed');
  const outputDir = path.resolve(cwd, resolveOptionValue(argv, '--out', './output/embed-packages'));
  const distDir = path.resolve(cwd, './frontend/dist');
  const embedDistDir = path.resolve(cwd, './frontend/dist/embed');

  const result = createDeployPackage({
    distDir,
    scenePath,
    outputDir,
    packageName
  });

  copyDirectoryContents(result.packageDir, embedDistDir);

  process.stdout.write(`EdgeOne embed output ready: ${embedDistDir}\n`);
  process.stdout.write(`Embed package source: ${result.packageDir}\n`);
}

try {
  run();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
}
