// 临时探针（§101 验证用，任务收尾即删）
// A 组：加载页出现时机与 noscript 分支、构建期清单正确性
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const DIST = fileURLToPath(new URL('../dist', import.meta.url));
const PORT = 4398;
const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.woff2': 'font/woff2', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg', '.png': 'image/png', '.json': 'application/json',
};

const server = http.createServer(async (req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  try {
    const buf = await readFile(join(DIST, p));
    res.writeHead(200, {
      'content-type': MIME[extname(p)] ?? 'application/octet-stream',
      'cache-control': 'max-age=600',
      'content-length': buf.length,
    });
    res.end(buf);
  } catch {
    res.writeHead(404);
    res.end('nope');
  }
});
await new Promise((r) => server.listen(PORT, r));

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
  args: ['--no-sandbox'],
});
const B = `http://localhost:${PORT}`;
const results = [];
const check = (name, pass, extra = '') =>
  results.push(`${pass ? 'PASS' : 'FAIL'}  ${name}${extra ? '  — ' + extra : ''}`);

// ① 首次加载：首帧即有加载页
{
  const page = await browser.newPage();
  await page.goto(`${B}/`, { waitUntil: 'domcontentloaded' });
  const has = await page.evaluate(() => !!document.getElementById('pl'));
  const st = await page.evaluate(() => sessionStorage.getItem('plPlayed'));
  check('① 首次加载首帧存在 #pl', has, `sessionStorage.plPlayed=${st}`);

  // ⑤ 清单注入正确（必须在刷新前查 —— 刷新后 #pl 连同清单一起被移除）
  const mf = await page.evaluate(() => (window.__pl && window.__pl.urls) || null);
  const okMf = Array.isArray(mf) && mf.length >= 25 &&
    mf.includes('/notes/blog-writing-guide/') && mf.includes('/fonts/maple-ui.woff2') &&
    mf.filter((u) => u.endsWith('.webp')).length === 13;
  check('⑤ 预取清单注入且完备', okMf, Array.isArray(mf) ? `${mf.length} 条` : String(mf));

  // ② 同会话刷新：不再出现
  await page.reload({ waitUntil: 'domcontentloaded' });
  const has2 = await page.evaluate(() => !!document.getElementById('pl'));
  check('② 同会话刷新不出现', !has2);
  await page.close();
}

// ③ 内页直接进入：不出现
{
  const page = await browser.newPage();
  await page.goto(`${B}/notes/`, { waitUntil: 'domcontentloaded' });
  const has = await page.evaluate(() => !!document.getElementById('pl'));
  check('③ 内页 /notes/ 不出现', !has);
  await page.close();
}

// ④ 禁 JS：noscript 生效且正文可见
{
  const page = await browser.newPage();
  await page.setJavaScriptEnabled(false);
  await page.goto(`${B}/`, { waitUntil: 'domcontentloaded' });
  const r = await page.evaluate(() => {
    const el = document.getElementById('pl');
    return {
      // noscript 是 display:none，元素仍在 DOM —— 判可见性而非存在性
      plVisible: !!el && getComputedStyle(el).display !== 'none',
      nav: !!document.querySelector('.topbar'),
      title: (document.querySelector('h1')?.textContent ?? '').trim().slice(0, 12),
    };
  });
  check('④ 无 JS：加载页不可见且正文可见', !r.plVisible && r.nav, `h1=${r.title}`);
  await page.close();
}

// —— B 组：Canvas 渲染器（像素阶梯锐度单调 + 管面四角内收）——
{
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  // 按**真实时间**采样（不再强推进度）：时间轴驱动显示，10s 内应看到像素块
  // 一路收窄到原生分辨率
  await page.goto(`${B}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.__plProgress, { timeout: 8000 });

  const analyze = () =>
    page.evaluate(() => {
      const c = document.getElementById('pl-canvas');
      const ctx = c.getContext('2d');
      const W = c.width, H = c.height;
      // ① 像素块大小的直接度量：LOADING 行带上，把亮度量化到 8 级后统计
      //    水平「同值连续段」的平均长度 —— 块越大，游程越长；越清晰越短。
      const y0 = Math.round(H * 0.44);
      const d = ctx.getImageData(0, Math.max(0, y0 - 4), W, 8).data;
      let runSum = 0, runCount = 0;
      for (let row = 0; row < 8; row++) {
        let prevQ = -1, cur = 0;
        for (let x = 0; x < W; x++) {
          const i = (row * W + x) * 4;
          const l = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
          const q = Math.round(l / 32);              // 8 级量化
          if (q === prevQ) cur++;
          else { if (prevQ >= 0) { runSum += cur; runCount++; } prevQ = q; cur = 1; }
        }
        runSum += cur; runCount++;
      }
      const meanRun = runCount ? runSum / runCount : 0;
      // ② 内容左右边界：画布填充是 #6d6d6d(109)，管面内容是 #868686(134)
      const edge = (fy) => {
        const y = Math.min(H - 1, Math.round(H * fy));
        const r = ctx.getImageData(0, y, W, 1).data;
        let left = -1, right = -1;
        for (let x = 0; x < W; x++) {
          const i = x * 4;
          const isFill = Math.abs(r[i] - 109) < 8 && Math.abs(r[i + 1] - 109) < 8;
          if (!isFill) { if (left < 0) left = x; right = x; }
        }
        return right - left;
      };
      return { meanRun, res: window.__plRes, top: edge(0.05), mid: edge(0.5), bot: edge(0.95), W, H, dpr: window.devicePixelRatio, overlayW: document.getElementById('pl').clientWidth };
    });

  const TMP = 'C:/Users/GammaC3/AppData/Local/Temp/';
  const at = async (ms, shot) => {
    // 等到自加载起的第 ms 毫秒（页面内计时，免得受探针启动开销影响）
    await page.waitForFunction(
      (t) => window.__plProgress !== undefined && performance.now() > t,
      { timeout: 20000, polling: 120 },
      ms,
    );
    if (shot) await (await page.$('#pl-canvas')).screenshot({ path: TMP + shot });
    return analyze();
  };

  const s1 = await at(1200, 'pl-t1.png');   // 约 1.2s：大色块
  const s2 = await at(5000, 'pl-t5.png');   // 约 5s：中等
  const s3 = await at(9500, 'pl-t9.png');   // 约 9.5s：接近原生
  check(
    '⑥ 内部分辨率随进度抬升（像素块变小）',
    s1.res < s2.res && s2.res < s3.res && s3.res > s3.H * 0.95,
    `内部高度 ${s1.res} → ${s2.res} → ${s3.res}（原生 ${s3.H}）`,
  );
  check(
    '⑥b 游程长度同步下降（观感代理）',
    s1.meanRun > s3.meanRun,
    `平均游程 ${s1.meanRun.toFixed(1)} → ${s3.meanRun.toFixed(1)} px`,
  );
  check(
    '⑦ 管面四角内收（顶/底行比中行窄）',
    s3.mid > s3.top && s3.mid > s3.bot && s3.top > 0,
    `宽 ${s3.top} / ${s3.mid} / ${s3.bot}`,
  );
  check(
    '⑧ 画布尺寸 = 覆盖层 × min(DPR,1.5)',
    Math.abs(s3.W - Math.round(s3.overlayW * Math.min(s3.dpr, 1.5))) <= 1,
    `${s3.W}×${s3.H}, 覆盖层 ${s3.overlayW}, dpr=${s3.dpr}`,
  );
  await page.close();
}

// —— C 组：预取引擎 / 时长约束 / reduced-motion ——
{
  // ⑨ 正常路径：真实预取 -> 进度走完 -> 摘 DOM、解锁滚动
  const page = await browser.newPage();
  const reqs = [];
  page.on('request', (r) => reqs.push(r.url()));
  await page.goto(`${B}/`, { waitUntil: 'domcontentloaded' });
  const t0 = Date.now();
  await page.waitForFunction(() => window.__plState && window.__plState.finished, { timeout: 25000 });
  const el = Date.now() - t0;
  await new Promise((r) => setTimeout(r, 500));
  const after = await page.evaluate(() => ({
    pl: !!document.getElementById('pl'),
    overflow: document.body.style.overflow,
    st: window.__plState,
    urls: (window.__pl && window.__pl.urls) || [],
  }));
  check('⑨ 预取跑完、摘 DOM、恢复滚动（且不短于 10s）', !after.pl && after.overflow === '' && el >= 9800,
    `耗时 ${el}ms，下载 ${(after.st.bytes / 1048576).toFixed(2)} MB / ${after.st.done} 项`);
  // ⑩ 清单里每一项都必须真的发出过请求（含路由 HTML 与全部展示图）
  const missing = after.urls.filter((u) => !reqs.some((r) => r.endsWith(u)));
  check('⑩ 清单 33 项全部发出请求', missing.length === 0,
    `未发出 ${missing.length} 项${missing.length ? ': ' + missing.slice(0, 3).join(', ') : ''}`);
  await page.close();

  // ⑪ 资源卡死：10s 后停在 99%，直到放行（不再有 6s 强制完成）
  const slow = await browser.newPage();
  await slow.evaluateOnNewDocument(() => {
    const orig = window.fetch.bind(window);
    window.fetch = (u, o) =>
      /\/_astro\/|\/fonts\//.test(String(u)) ? new Promise(() => {}) : orig(u, o);
  });
  await slow.goto(`${B}/`, { waitUntil: 'domcontentloaded' });
  const t1 = Date.now();
  await new Promise((r) => setTimeout(r, 12000));
  const hold = await slow.evaluate(() => ({
    finished: !!(window.__plState && window.__plState.finished),
    p: window.__plProgress, pl: !!document.getElementById('pl'),
  }));
  check('⑪ 资源卡死时 12s 不放行（条停在 99% 以内）',
    !hold.finished && hold.pl && hold.p >= 0.98 && hold.p <= 0.995,
    `进度 ${(hold.p * 100).toFixed(1)}%，仍在屏上 ${hold.pl}`);
  let bailed = true;
  try {
    await slow.waitForFunction(() => window.__plState && window.__plState.finished, { timeout: 60000 });
  } catch { bailed = false; }
  check('⑪b 僵死请求最终仍会放行（idle 超时/逃生口）', bailed, `总耗时 ${Date.now() - t1}ms`);
  await slow.close();

  // ⑫ reduced-motion：直接锐利版（无像素块），且照样跑完收尾
  const rm = await browser.newPage();
  await rm.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await rm.setViewport({ width: 1280, height: 800 });
  await rm.goto(`${B}/`, { waitUntil: 'domcontentloaded' });
  await rm.waitForFunction(() => !!window.__plProgress, { timeout: 8000 });
  await rm.evaluate(() => {
    Object.defineProperty(window, '__plReal', { value: 0.3, writable: false, configurable: true });
  });
  await new Promise((r) => setTimeout(r, 250));
  const rmState = await rm.evaluate(() => ({
    res: window.__plRes,
    H: document.getElementById('pl-canvas').height,
  }));
  let rmDone = true;
  try {
    await rm.waitForFunction(() => window.__plState && window.__plState.finished, { timeout: 25000 });
  } catch { rmDone = false; }
  check('⑫ reduced-motion：进度 0.3 就是原生分辨率（无像素动画）且正常收尾',
    rmState.res === rmState.H && rmDone,
    `内部 ${rmState.res} / 原生 ${rmState.H}，收尾 ${rmDone}`);
  await rm.close();
}

await browser.close();
server.close();
console.log('\n=== 探针 A（加载页生命周期）===');
for (const l of results) console.log(' ', l);
const failed = results.filter((l) => l.startsWith('FAIL')).length;
console.log(`=== ${results.length - failed}/${results.length} 通过 ===`);
process.exit(failed ? 1 : 0);
