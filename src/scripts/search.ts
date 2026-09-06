import Fuse from 'fuse.js';

interface Doc {
  t: string;
  s: string;
  b: string;
  u: string;
  c: 'notes' | 'musings';
}

const raw = document.getElementById('search-index');
const listEl = document.querySelector<HTMLOListElement>('[data-search-results]');
const countEl = document.querySelector<HTMLElement>('[data-search-count]');
const emptyEl = document.querySelector<HTMLElement>('[data-search-empty]');
const input = document.querySelector<HTMLInputElement>('#search-q');
if (!raw || !listEl || !input) throw new Error('搜索页缺少必需节点');

const docs = JSON.parse(raw.textContent ?? '[]') as Doc[];
const fuse = new Fuse(docs, {
  keys: [
    { name: 't', weight: 0.5 },
    { name: 's', weight: 0.3 },
    { name: 'b', weight: 0.2 },
  ],
  threshold: 0.45,
  ignoreLocation: true,
});

const esc = (s: string): string =>
  s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);

function highlight(text: string, q: string): string {
  const needle = q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (!needle) return esc(text);
  const re = new RegExp(`(${needle})`, 'gi');
  return esc(text).split(re).map((part, i) => (i % 2 === 1 ? `<mark class="hit">${part}</mark>` : part)).join('');
}

function snippet(doc: Doc, q: string, span = 130): string {
  const hay = `${doc.s} ${doc.b}`.trim();
  const at = q.trim() ? hay.toLowerCase().indexOf(q.trim().toLowerCase()) : -1;
  const start = at > span / 2 ? at - span / 2 : 0;
  const cut = hay.slice(start, start + span);
  return (start > 0 ? '…' : '') + cut + (start + span < hay.length ? '…' : '');
}

function label(c: Doc['c']): string {
  return c === 'notes' ? '笔记' : '迷思';
}

function render(q: string): void {
  const hits = q.trim() ? fuse.search(q.trim()) : [];
  listEl.innerHTML = '';
  for (const { item } of hits.slice(0, 20)) {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.className = 'res';
    a.href = item.u;
    const title = document.createElement('p');
    title.className = 'rt';
    title.innerHTML = `<span class="cc">${label(item.c)}</span>${highlight(item.t, q)}`;
    const sum = document.createElement('p');
    sum.className = 'rs';
    sum.innerHTML = highlight(snippet(item, q), q);
    a.append(title, sum);
    li.append(a);
    listEl.append(li);
  }
  if (countEl) countEl.textContent = q.trim() ? `共 ${hits.length} 条结果` : '';
  if (emptyEl) emptyEl.hidden = q.trim() !== '' && hits.length > 0;
}

let timer: number | undefined;
input.addEventListener('input', () => {
  window.clearTimeout(timer);
  timer = window.setTimeout(() => {
    const q = input.value;
    const url = new URL(location.href);
    if (q.trim()) url.searchParams.set('q', q);
    else url.searchParams.delete('q');
    history.replaceState(null, '', url);
    render(q);
  }, 150);
});

// 初次载入：若有 ?q= 参数则直接执行一次搜索
const q0 = new URLSearchParams(location.search).get('q') ?? '';
input.value = q0;
render(q0);
input.focus();
