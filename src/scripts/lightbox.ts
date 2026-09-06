interface PhotoMeta {
  title: string;
  alt: string;
  date: string;
  location?: string;
  camera?: string;
  full: string;
}

const raw = document.getElementById('photo-collection');
const dialog = document.getElementById('lightbox') as HTMLDialogElement | null;
if (!raw || !dialog) throw new Error('灯箱缺少 #photo-collection 或 #lightbox');

const photos = JSON.parse(raw.textContent ?? '[]') as PhotoMeta[];

// 逻辑放进函数体：模块顶层 return 是语法错误(Rollup)，相册为空时直接跳过挂载
function mountLightbox(): void {
  if (photos.length === 0) return;

  const img = dialog.querySelector<HTMLImageElement>('[data-lb-img]')!;
  const cap = dialog.querySelector<HTMLElement>('[data-lb-cap]')!;
  let idx = 0;
  let opener: HTMLElement | null = null;

  function cameraLine(p: PhotoMeta): string {
    return [p.date, p.location, p.camera].filter(Boolean).join(' · ');
  }

  function show(i: number): void {
    idx = (i + photos.length) % photos.length;
    const p = photos[idx];
    img.src = p.full;
    img.alt = p.alt;
    cap.textContent = `${p.title} — ${cameraLine(p)}`;
  }

  function open(i: number, btn: HTMLElement): void {
    opener = btn;
    show(i);
    dialog?.showModal();
  }

  function close(): void {
    dialog?.close();
    opener?.focus();
  }

  const buttons = [...document.querySelectorAll<HTMLElement>('[data-photo][data-index]')];
  buttons.forEach((b) => {
    const i = Number(b.dataset.index ?? 0);
    b.addEventListener('click', () => open(i, b));
  });

  dialog.querySelector('[data-lb-close]')?.addEventListener('click', close);
  dialog.querySelector('[data-lb-prev]')?.addEventListener('click', () => show(idx - 1));
  dialog.querySelector('[data-lb-next]')?.addEventListener('click', () => show(idx + 1));
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) close(); // 点遮罩关闭（::backdrop 上的点击目标是 dialog 自身）
  });
  dialog.addEventListener('close', () => opener?.focus());
  dialog.addEventListener('cancel', () => close()); // ESC
}

mountLightbox();
