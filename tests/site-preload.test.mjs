import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { test } from 'node:test';

test('production manifest covers all built pages, styles, modules and fonts without images', async () => {
  const dist = new URL('../dist/', import.meta.url);
  const manifest = JSON.parse(await readFile(new URL('site-preload.json', dist), 'utf8'));
  const files = await readdir(dist, { recursive: true });
  const eligible = files.map(file => file.replaceAll('\\', '/'))
    .filter(file => /\.(html|css|m?js|woff2?|otf|ttf)$/i.test(file) && file !== 'fonts/helvetica-code.woff2');
  const urls = eligible.map(file => '/' + file.replace(/(^|\/)index\.html$/, '$1'));
  assert.deepEqual([...manifest].sort(), urls.sort());
  assert.ok(manifest.includes('/'));
  assert.ok(manifest.some(url => url.startsWith('/notes/') && url !== '/notes/'));
  assert.ok(manifest.some(url => url.includes('/AnthropicSans-') && url.endsWith('.otf')));
  assert.ok(files.some(file => file.endsWith('.webp')));
});
