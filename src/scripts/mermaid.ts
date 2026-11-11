import { panZoom, type PanZoom } from './pan-zoom';
import { idle } from './runtime';
import zh from '../i18n/zh';
import en from '../i18n/en';

const ICONS = {
  in: '<path d="M8 3.5v9M3.5 8h9"/>',
  out: '<path d="M3.5 8h9"/>',
  reset: '<path d="M3.2 8a4.8 4.8 0 1 0 1.4-3.4M3.2 2.8v2.4h2.4"/>',
  full: '<path d="M2.8 6V2.8H6M10 2.8h3.2V6M13.2 10v3.2H10M6 13.2H2.8V10"/>',
  close: '<path d="M4 4l8 8M12 4l-8 8"/>',
} as const;
type Act = keyof typeof ICONS;
/** 控件文案来自 src/i18n（mermaid.*） */
const tr = () => {
  const d = document.documentElement.dataset.lang === 'en' ? en : zh;
  return {
    in: d['mermaid.in'],
    out: d['mermaid.out'],
    reset: d['mermaid.reset'],
    full: d['mermaid.full'],
    close: d['mermaid.close'],
    hint: d['mermaid.hint'],
  } as Record<Act | 'hint', string>;
};

function toolbar(acts: Act[]) {
  const bar = document.createElement('div');
  bar.className = 'mmd-ctrl';
  bar.innerHTML = acts
    .map(
      (a) =>
        `<button type="button" data-act="${a}" aria-label="${tr()[a]}" title="${tr()[a]}"><svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[a]}</svg></button>`,
    )
    .join('');
  return bar;
}
function wire(bar: HTMLElement, pz: PanZoom, extra: Partial<Record<Act, () => void>> = {}) {
  bar.addEventListener('click', (e) => {
    const act = (e.target as Element).closest<HTMLElement>('[data-act]')?.dataset.act as Act | undefined;
    if (act === 'in') pz.zoomBy(1.25);
    else if (act === 'out') pz.zoomBy(0.8);
    else if (act === 'reset') pz.reset();
    else if (act) extra[act]?.();
  });
}

/** 全屏灯箱：<dialog> 模态，Esc / 点击背景关闭 */
function openLightbox(svg: SVGElement) {
  const dlg = document.createElement('dialog');
  dlg.className = 'mmd-lightbox';
  const stage = document.createElement('div');
  stage.className = 'mmd-lb-stage';
  const content = document.createElement('div');
  content.className = 'mmd-lb-content';
  content.appendChild(svg.cloneNode(true));
  stage.appendChild(content);
  const bar = toolbar(['in', 'out', 'reset', 'close']);
  dlg.append(stage, bar);
  document.body.appendChild(dlg);
  const pz = panZoom(stage, content, { free: true });
  const close = () => dlg.close();
  wire(bar, pz, { close });
  dlg.addEventListener('click', (e) => e.target === dlg && close());
  dlg.addEventListener('close', () => {
    pz.destroy();
    dlg.remove();
  });
  dlg.showModal();
}

/** 给渲染好的图加上缩放平移与控制条（每个容器只做一次） */
function enhance(pre: HTMLElement) {
  const wrap = pre.closest<HTMLElement>('.mermaid-wrap');
  if (!wrap || wrap.dataset.pz != null) return;
  wrap.dataset.pz = '';
  wrap.title = tr().hint;
  const pz = panZoom(wrap, pre);
  const bar = toolbar(['in', 'out', 'reset', 'full']);
  wire(bar, pz, {
    full: () => {
      const svg = pre.querySelector('svg');
      if (svg) openLightbox(svg);
    },
  });
  wrap.appendChild(bar);
}

/** Mermaid 配色：读取 tokens.css 的 --mermaid-* 令牌（随当前主题变化） */
const PALETTE_KEYS = [
  'background',
  'primaryColor',
  'primaryTextColor',
  'primaryBorderColor',
  'secondaryColor',
  'tertiaryColor',
  'lineColor',
  'textColor',
  'noteBkgColor',
  'noteTextColor',
  'noteBorderColor',
  'edgeLabelBackground',
  'clusterBkg',
  'clusterBorder',
] as const;
const token = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const palette = () => {
  const vars = Object.fromEntries(
    PALETTE_KEYS.map((k) => [k, token(`--mermaid-${k.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())}`)]),
  ) as Record<(typeof PALETTE_KEYS)[number], string>;
  return { ...vars, accent: token('--accent') };
};
let seq = 0;
const render = async () => {
  const blocks = [...document.querySelectorAll<HTMLElement>('pre[data-mermaid]')];
  if (!blocks.length) return;
  for (const b of blocks) b.dataset.src ??= b.textContent ?? '';
  const { default: mermaid } = await import('mermaid');
  const dark = document.documentElement.dataset.theme === 'dark';
  const { accent, ...vars } = palette();
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    theme: 'base',
    fontFamily: token('--mermaid-font'),
    themeVariables: {
      ...vars,
      fontSize: token('--fs-md'),
      darkMode: dark,
      actorBorder: vars.primaryBorderColor,
      signalColor: vars.lineColor,
      labelBoxBorderColor: accent,
    },
  });
  await Promise.all(
    blocks.map(async (el) => {
      const src = el.dataset.src!;
      try {
        const { svg } = await mermaid.render(`mmd-${seq++}`, src);
        el.innerHTML = svg;
        el.dataset.rendered = '';
        enhance(el);
      } catch (err) {
        el.textContent = src;
        el.dataset.error = '';
        console.error(err);
      }
    }),
  );
};
document.addEventListener('astro:page-load', () => idle(render));
let lastTheme = document.documentElement.dataset.theme;
new MutationObserver(() => {
  const t = document.documentElement.dataset.theme;
  if (t !== lastTheme) {
    lastTheme = t;
    render();
  }
}).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
