import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

test('docker deploy contract serves built frontend artifact instead of raw source', () => {
  const dockerfile = readText('Dockerfile');
  assert.match(dockerfile, /FROM\s+node:/i, 'Dockerfile should include a build stage based on node image');
  assert.match(dockerfile, /npm\s+(ci|install)/i, 'Dockerfile should install dependencies during build stage');
  assert.match(dockerfile, /npm\s+run\s+build:frontend/i, 'Dockerfile should build frontend artifact');
  assert.match(
    dockerfile,
    /COPY\s+--from=.*frontend\/dist\s+\/usr\/share\/nginx\/html/i,
    'Dockerfile should copy built frontend/dist into nginx html root'
  );
  assert.doesNotMatch(
    dockerfile,
    /COPY\s+\.\s+\/usr\/share\/nginx\/html/i,
    'Dockerfile should not copy repository source directly into nginx html root'
  );
});

test('vercel deploy contract points to built artifact output directory', () => {
  const raw = readText('vercel.json');
  const config = JSON.parse(raw);
  assert.equal(config.outputDirectory, 'frontend/dist');
  assert.equal(config.buildCommand, 'npm run build:frontend');
});

test('entry docs state frontend/dist as deployment artifact', () => {
  const readme = readText('README.md');
  const quickstart = readText('QUICKSTART.md');
  const combined = `${readme}\n${quickstart}`;
  assert.match(
    combined,
    /frontend\/dist/,
    'README + QUICKSTART should explicitly mention frontend/dist as deployment artifact'
  );
});
