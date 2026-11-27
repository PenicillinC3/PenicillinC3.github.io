import { readdir, writeFile } from 'node:fs/promises';

export default function sitePreload() {
  return {
    name: 'site-preload',
    hooks: {
      async 'astro:build:done'({ dir }) {
        // The build output includes transitive module chunks and page-specific CSS.
        const files = await readdir(dir, { recursive: true });
        const urls = files.map(file => file.replaceAll('\\', '/'))
          .filter(file => /\.(html|css|m?js|woff2?|otf|ttf)$/i.test(file))
          .map(file => '/' + file.replace(/(^|\/)index\.html$/, '$1'))
          .sort();
        await writeFile(new URL('site-preload.json', dir), JSON.stringify(urls));
      },
    },
  };
}
