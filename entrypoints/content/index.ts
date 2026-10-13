import { browser } from 'wxt/browser';
import { defineContentScript } from 'wxt/utils/define-content-script';
import { shouldShow, extractContext, parseSections } from '@/lib/text';
import css from './style.css?inline';

const ICON = 27; // same box as Google Translate's #gtx-trans
const GT_OFFSET = 32; // sit just right of where GT's icon goes
const W_SVG = `<svg viewBox="18 28 92 74" aria-hidden="true"><path d="M28 38 L46 92 L64 54 L82 92 L100 38" fill="none" stroke="currentColor" stroke-width="15" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const BLOCKS = 'p,li,dd,dt,td,th,blockquote,figcaption,h1,h2,h3,h4,h5,h6,pre,article,section,div';

export default defineContentScript({
  matches: ['<all_urls>'],
  allFrames: true,
  runAt: 'document_idle',
  main() {
    // Skip if a live copy already runs here (injected on install/update into open tabs).
    const g = globalThis as { __wazuupAlive?: () => boolean };
    if (g.__wazuupAlive?.()) return;
    g.__wazuupAlive = () => !!browser.runtime?.id;

    const host = document.createElement('wazuup-root');
    host.style.cssText = 'all:initial;position:absolute;top:0;left:0;width:0;height:0;z-index:2147483647;';
    const root = host.attachShadow({ mode: 'open' });
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(css);
    root.adoptedStyleSheets = [sheet]; // constructable sheets aren't blocked by page CSP style-src

    try {
      const font = new FontFace('Wazuup Geist', `url(${browser.runtime.getURL('/fonts/geist.woff2')})`, { weight: '100 900' });
      document.fonts.add(font);
      font.load().catch(() => {}); // falls back to system font
    } catch {}

    let icon: HTMLElement | null = null;
    let pop: HTMLElement | null = null;
    let port: Browser.runtime.Port | null = null;

    const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = '') => {
      const e = document.createElement(tag);
      if (cls) e.className = cls;
      if (text) e.textContent = text;
      return e;
    };

    function close() {
      icon?.remove();
      pop?.remove();
      port?.disconnect();
      icon = pop = port = null;
    }

    const isEditable = (t: EventTarget | null) =>
      t instanceof Element && (!!t.closest('input,textarea,select') || (t as HTMLElement).isContentEditable);

    function contextOf(range: Range, text: string) {
      const node = range.startContainer;
      const block = (node instanceof Element ? node : node.parentElement)?.closest(BLOCKS) ?? document.body;
      const pre = document.createRange();
      pre.selectNodeContents(block);
      pre.setEnd(range.startContainer, range.startOffset);
      return extractContext(block.textContent ?? '', text, pre.toString().replace(/\s+/g, ' ').length);
    }

    document.addEventListener('mouseup', (e) => {
      if (e.button !== 0 || e.composedPath().includes(host)) return;
      if (!browser.runtime?.id) return host.remove(); // orphaned after an extension reload; the fresh copy takes over
      setTimeout(() => {
        close();
        const sel = getSelection();
        const text = sel?.toString().trim() ?? '';
        if (!sel || sel.isCollapsed || !sel.rangeCount || !shouldShow(text) || isEditable(e.target)) return;

        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        // Google Translate's rule: x follows the cursor, y hugs the selection edge nearest the release point.
        const below = e.clientY - rect.top > rect.height / 2;
        const x = Math.min(e.clientX - 13 + GT_OFFSET, innerWidth - ICON - 4) + scrollX;
        const y = (below ? rect.bottom + 1 : rect.top - 1 - ICON) + scrollY;
        showIcon(x, y, text, contextOf(range, text), rect, below);
      });
    });

    // Close on outside press / Esc.
    document.addEventListener('mousedown', (e) => { if (!e.composedPath().includes(host)) close(); }, true);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

    function showIcon(x: number, y: number, text: string, context: string, rect: DOMRect, iconBelow: boolean) {
      if (!host.isConnected) document.documentElement.append(host);
      icon = el('button', 'icon');
      icon.innerHTML = W_SVG;
      icon.title = 'Explain with Wazuup';
      icon.setAttribute('aria-label', 'Explain with Wazuup');
      icon.style.left = `${x}px`;
      icon.style.top = `${y}px`;
      icon.addEventListener('mousedown', (e) => e.preventDefault()); // keep the page selection
      icon.addEventListener('click', () => {
        const at = x;
        icon?.remove();
        icon = null;
        openPopover(at, text, context, rect, iconBelow);
      });
      root.append(icon);
    }

    function openPopover(x: number, text: string, context: string, rect: DOMRect, iconBelow: boolean) {
      pop = el('div', 'pop');
      pop.setAttribute('role', 'dialog');
      const head = el('div', 'head');
      const term = el('div', 'term', text);
      const copy = el('button', 'ghost', 'Copy');
      copy.hidden = true;
      head.append(term, copy);
      const body = el('div', 'body');
      pop.append(head, body);
      root.append(pop);

      const p = pop;
      const scrollTop = scrollY;
      const width = Math.min(340, innerWidth - 16);
      p.style.width = `${width}px`;
      p.style.left = `${Math.max(8, Math.min(x - scrollX - 20, innerWidth - width - 8)) + scrollX}px`;
      const above = innerHeight - rect.bottom < 280 && rect.top > innerHeight - rect.bottom;
      // Clear the icon row (ours + Google Translate's) when it's on the same side as the popover.
      const gap = 8 + (above !== iconBelow ? ICON : 0);
      // Re-run as content streams in, so an above-placed popover grows upward.
      const place = () => {
        p.style.top = `${(above ? rect.top - gap - p.offsetHeight : rect.bottom + gap) + scrollTop}px`;
      };

      let raw = '';
      const render = () => {
        body.replaceChildren(
          ...parseSections(raw).map(({ label, body: txt }) => {
            const s = el('div', 'section');
            if (label) s.append(el('div', 'label', label));
            s.append(el('p', label === 'Example' ? 'example' : '', txt));
            return s;
          }),
        );
        place();
      };

      const message = (msg: string, action: string, onClick: () => void) => {
        const btn = el('button', 'btn', action);
        btn.addEventListener('click', onClick);
        body.replaceChildren(el('p', 'muted', msg), btn);
        place();
      };

      copy.addEventListener('click', () => {
        navigator.clipboard.writeText(`${text}\n\n${raw.trim()}`).then(() => {
          copy.textContent = 'Copied';
          setTimeout(() => (copy.textContent = 'Copy'), 1200);
        }, () => {});
      });

      const run = () => {
        raw = '';
        copy.hidden = true;
        body.replaceChildren(el('div', 'skeleton'), el('div', 'skeleton short'), el('div', 'skeleton'));
        place();
        port?.disconnect();
        try {
          port = browser.runtime.connect({ name: 'explain' });
        } catch {
          return message('Wazuup was updated. Reload the page to use it.', 'Reload', () => location.reload());
        }
        port.onMessage.addListener((m: { type: string; text?: string; message?: string }) => {
          if (m.type === 'chunk') { raw += m.text; render(); }
          else if (m.type === 'done') copy.hidden = false;
          else if (m.type === 'nokey') message('Add your API key to start explaining.', 'Open settings', () => browser.runtime.sendMessage('open-options'));
          else if (m.type === 'error') message(m.message || 'Something went wrong.', 'Retry', run);
        });
        port.postMessage({ text, context });
      };
      run();
    }
  },
});
