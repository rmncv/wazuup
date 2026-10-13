import { browser } from 'wxt/browser';
import { defineBackground } from 'wxt/utils/define-background';
import { getSettings } from '@/lib/settings';
import { explain, needsKey } from '@/lib/llm';

// ponytail: per-worker-lifetime cache, unbounded; Chrome kills idle workers so it stays small.
const cache = new Map<string, string>();

export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(async ({ reason }) => {
    if (reason === 'install') browser.runtime.openOptionsPage();
    // Chrome only injects content scripts on page load; cover tabs that were already open.
    for (const tab of await browser.tabs.query({ url: ['http://*/*', 'https://*/*'] })) {
      browser.scripting.executeScript({ target: { tabId: tab.id!, allFrames: true }, files: ['/content-scripts/content.js'] }).catch(() => {});
    }
  });
  browser.action.onClicked.addListener(() => browser.runtime.openOptionsPage());
  browser.runtime.onMessage.addListener((msg) => {
    if (msg === 'open-options') browser.runtime.openOptionsPage();
  });

  browser.runtime.onConnect.addListener((port) => {
    if (port.name !== 'explain') return;
    const abort = new AbortController();
    port.onDisconnect.addListener(() => abort.abort());

    port.onMessage.addListener(async ({ text, context }: { text: string; context: string }) => {
      const post = (m: object) => { try { port.postMessage(m); } catch {} };
      const c = await getSettings();
      if (needsKey(c)) return post({ type: 'nokey' });

      const key = JSON.stringify([c.baseUrl, c.model, c.language, text, context]);
      const hit = cache.get(key);
      if (hit) return post({ type: 'chunk', text: hit }), post({ type: 'done' });

      let full = '';
      try {
        for await (const chunk of explain(c, text, context, abort.signal)) {
          full += chunk;
          post({ type: 'chunk', text: chunk });
        }
        cache.set(key, full);
        post({ type: 'done' });
      } catch (e) {
        if (!abort.signal.aborted) post({ type: 'error', message: e instanceof Error ? e.message : String(e) });
      }
    });
  });
});
