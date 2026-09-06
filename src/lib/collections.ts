import { getCollection, type CollectionEntry } from 'astro:content';
import { excerpt } from './text';

/** 过滤 draft 并按 date 倒序（Global Constraints 第 4 条） */
export async function listSorted<C extends 'notes' | 'musings' | 'links' | 'projects' | 'photos'>(
  coll: C,
): Promise<CollectionEntry<C>[]> {
  const all = await getCollection(coll);
  // spec §4: draft 内容 dev(import.meta.env.DEV)下可见以便预览，正式构建排除
  return all
    .filter((e) => import.meta.env.DEV || !e.data.draft)
    .sort((a, b) => b.data.date.localeCompare(a.data.date));
}

export interface PostItem {
  title: string;
  url: string;
  date: string;
  summary: string;
  tags: string[];
}

export interface LinkItem {
  title: string;
  url: string;
  date: string;
  note: string;
  tags: string[];
  host: string;
}

export interface ProjectItem {
  title: string;
  date: string;
  url?: string;
  repo?: string;
  tech: string[];
  summary: string;
}

function toPostItem(e: CollectionEntry<'notes'>): PostItem {
  return {
    title: e.data.title,
    url: `/notes/${e.slug}`,
    date: e.data.date,
    summary: e.data.summary ?? excerpt(e.body ?? '', 150),
    tags: e.data.tags ?? [],
  };
}

export async function noteItems(): Promise<PostItem[]> {
  return (await listSorted('notes')).map(toPostItem);
}

export async function musingItems(): Promise<PostItem[]> {
  const all = await listSorted('musings');
  return all.map((e) => ({
    title: e.data.title,
    url: `/musings/${e.slug}`,
    date: e.data.date,
    summary: e.data.summary ?? excerpt(e.body ?? '', 150),
    tags: [],
  }));
}

export async function linkItems(): Promise<LinkItem[]> {
  const all = await listSorted('links');
  return all.map((e) => ({
    title: e.data.title,
    url: e.data.url,
    date: e.data.date,
    note: excerpt(e.body ?? '', 130),
    tags: e.data.tags ?? [],
    host: new URL(e.data.url).hostname.replace(/^www\./, ''),
  }));
}

export async function projectItems(): Promise<ProjectItem[]> {
  const all = await listSorted('projects');
  return all.map((e) => ({
    title: e.data.title,
    date: e.data.date,
    url: e.data.url,
    repo: e.data.repo,
    tech: e.data.tech,
    summary: excerpt(e.body ?? '', 180),
  }));
}

export async function photoEntries(): Promise<CollectionEntry<'photos'>[]> {
  return listSorted('photos');
}

export interface SeriesRoll {
  entry: CollectionEntry<'series'>;
  photos: CollectionEntry<'photos'>[];
  cover: CollectionEntry<'photos'>;
}

/** 卷：photos 按 series 字段挂靠、date 升序；封面缺省退第一张（构建期 console.warn） */
export async function seriesRolls(): Promise<SeriesRoll[]> {
  const allPhotos = await getCollection('photos');
  const allSeries = (await getCollection('series'))
    .filter((s) => !s.data.draft)
    .sort((a, b) => b.data.date.localeCompare(a.data.date));
  return allSeries.map((s) => {
    const photos = allPhotos
      .filter((p) => p.data.series === s.slug)
      .sort((a, b) => a.data.date.localeCompare(b.data.date));
    let cover = photos.find((p) => p.slug === s.data.cover);
    if (!cover && photos.length > 0) {
      cover = photos[0];
      console.warn(`[series] ${s.slug} 封面 ${s.data.cover} 不在卷内，回退 ${cover.slug}`);
    }
    if (!cover) {
      throw new Error(`[series] ${s.slug} 卷内无照片（photos 需带 series: ${s.slug}）`);
    }
    return { entry: s, photos, cover };
  });
}
