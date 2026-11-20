import { readdir } from 'node:fs/promises';
import { listSorted, seriesRolls } from './collections';
import { site } from '../site.config';

// Development has no static output. Production uses the generated manifest.
export async function devPreloadUrls() {
  const [notes, musings, rolls, fonts] = await Promise.all([
    listSorted('notes'),
    listSorted('musings'),
    seriesRolls(),
    readdir(new URL('../../public/fonts', import.meta.url)),
  ]);
  return [
    '/', ...site.nav.map(item => item.href), '/404.html',
    ...notes.map(entry => `/notes/${entry.slug}/`),
    ...musings.map(entry => `/musings/${entry.slug}/`),
    ...rolls.map(({ entry }) => `/photos/${entry.slug}/`),
    ...fonts.filter(file => /\.(woff2?|otf|ttf)$/i.test(file) && file !== 'helvetica-code.woff2')
      .map(file => `/fonts/${file}`),
  ];
}
