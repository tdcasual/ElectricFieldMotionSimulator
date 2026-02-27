import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createDeployPackage, resolveCliOptions } from '../scripts/embed-packager.mjs';

function writeText(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

test('resolveCliOptions uses defaults and supports overrides', () => {
  const cwd = '/tmp/demo-project';
  const defaults = resolveCliOptions([], cwd);
  assert.equal(defaults.scenePath, path.join(cwd, 'example-scene.json'));
  assert.equal(defaults.distDir, path.join(cwd, 'frontend', 'dist'));
  assert.equal(defaults.outputDir, path.join(cwd, 'output', 'embed-packages'));
  assert.equal(defaults.zip, true);

  const parsed = resolveCliOptions(
    ['--scene', './my-scene.json', '--out', './artifacts', '--name', 'demo-pack', '--no-zip'],
    cwd
  );
  assert.equal(parsed.scenePath, path.resolve(cwd, './my-scene.json'));
  assert.equal(parsed.outputDir, path.resolve(cwd, './artifacts'));
  assert.equal(parsed.packageName, 'demo-pack');
  assert.equal(parsed.zip, false);
});

test('createDeployPackage creates deployable bundle structure', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'embed-packager-'));
  const distDir = path.join(tempRoot, 'dist');
  const scenePath = path.join(tempRoot, 'scene.json');
  const outputDir = path.join(tempRoot, 'output');

  writeText(path.join(distDir, 'viewer.html'), '<html><body><div id="root"></div></body></html>');
  writeText(path.join(distDir, 'embed.js'), 'window.ElectricFieldApp = function(){};');
  writeText(path.join(distDir, 'assets', 'app.js'), 'console.log("ok");');
  writeText(scenePath, JSON.stringify({ version: '1.0', settings: {}, objects: [] }));

  const result = createDeployPackage({
    distDir,
    scenePath,
    outputDir,
    packageName: 'demo'
  });

  assert.equal(fs.existsSync(path.join(result.packageDir, 'index.html')), true);
  assert.equal(fs.existsSync(path.join(result.packageDir, 'viewer.html')), true);
  assert.equal(fs.existsSync(path.join(result.packageDir, 'embed.js')), true);
  assert.equal(fs.existsSync(path.join(result.packageDir, 'scene.json')), true);
  assert.equal(fs.existsSync(path.join(result.packageDir, 'assets', 'app.js')), true);

  const indexHtml = fs.readFileSync(path.join(result.packageDir, 'index.html'), 'utf8');
  assert.match(indexHtml, /viewer\.html\?mode=view&sceneUrl=\.\/scene\.json/);
});

test('createDeployPackage throws when dist files are missing', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'embed-packager-missing-'));
  const distDir = path.join(tempRoot, 'dist');
  const scenePath = path.join(tempRoot, 'scene.json');
  const outputDir = path.join(tempRoot, 'output');

  fs.mkdirSync(distDir, { recursive: true });
  writeText(scenePath, JSON.stringify({ version: '1.0', settings: {}, objects: [] }));

  assert.throws(
    () =>
      createDeployPackage({
        distDir,
        scenePath,
        outputDir,
        packageName: 'missing'
      }),
    /Missing required build artifact/
  );
});
