// 临时诊断：/notes tag 筛选前后卡片与页面尺寸/滚动跳动测量（用完即删）
import puppeteer from 'puppeteer-core';

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });

const snap = () =>
  page.evaluate(() => {
    const cards = [...document.querySelectorAll('.glasscard')].map((el) => {
      const r = el.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top + scrollY) };
    });
    const chips = [...document.querySelectorAll('[data-tag-chip]')].map((el) => ({
      tag: el.dataset.tag,
      on: el.classList.contains('on'),
    }));
    return {
      vw: innerWidth,
      vh: innerHeight,
      docClientW: document.documentElement.clientWidth,
      scrollbarW: innerWidth - document.documentElement.clientWidth,
      scrollH: document.documentElement.scrollHeight,
      scrollY: Math.round(scrollY),
      cards,
      chips,
    };
  });

await page.goto('http://localhost:4321/notes/', { waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 600));
console.log('--- 初始 ---');
console.log(JSON.stringify(await snap(), null, 1));

// 滚动到中部再点 chip，观察内容折叠后滚动位置/尺寸变化
await page.evaluate(() => window.scrollTo(0, 300));
const chip = await page.evaluate(() => {
  const c = [...document.querySelectorAll('[data-tag-chip]')].find((x) => x.dataset.tag === 'CSS');
  if (c) c.click();
  return !!c;
});
if (!chip) console.log('chip CSS 不存在');
await new Promise((r) => setTimeout(r, 400));
console.log('--- 点「CSS」后 ---');
console.log(JSON.stringify(await snap(), null, 1));

// 再全清（再点一次）
await page.evaluate(() => {
  const c = [...document.querySelectorAll('[data-tag-chip]')].find((x) => x.dataset.tag === 'CSS');
  if (c) c.click();
});
await new Promise((r) => setTimeout(r, 400));
console.log('--- 复位 ---');
console.log(JSON.stringify(await snap(), null, 1));

await browser.close();
