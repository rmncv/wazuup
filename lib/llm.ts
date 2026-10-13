import type { Settings } from './settings';

type Conf = Settings & { apiKey: string };

const isLocal = (url: string) => /^https?:\/\/(localhost|127\.0\.0\.1)/.test(url);
export const needsKey = (c: Conf) => !c.apiKey && !isLocal(c.baseUrl);

function prompt(language: string) {
  return `You explain words and phrases a reader highlighted on a web page.
Answer in ${language}, in exactly this format, plain text, no markdown, no preamble:

In context: <what it means in the given sentence, 1-2 short sentences>
General: <(part of speech) the general meaning, 1 sentence>
Example: <one short natural example sentence>

Keep the labels "In context", "General", "Example" in English exactly as written. Be concise.`;
}

function request(c: Conf, messages: object[], stream: boolean, signal?: AbortSignal) {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (c.apiKey) headers.authorization = `Bearer ${c.apiKey}`;
  // Anthropic rejects requests carrying a browser Origin without this opt-in.
  if (c.baseUrl.includes('anthropic.com')) headers['anthropic-dangerous-direct-browser-access'] = 'true';
  return fetch(`${c.baseUrl.replace(/\/+$/, '')}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ model: c.model, messages, stream }),
    signal,
  });
}

async function errorText(res: Response) {
  const body = await res.text().catch(() => '');
  let msg = body;
  try {
    const j = JSON.parse(body);
    msg = j.error?.message ?? j.message ?? (Array.isArray(j) ? j[0]?.error?.message : undefined) ?? body;
  } catch {}
  return `${res.status}${msg ? ': ' + String(msg).slice(0, 200) : ''}`;
}

export async function* explain(c: Conf, text: string, context: string, signal: AbortSignal) {
  const user = context && context !== text ? `Sentence: ${context}\nHighlighted: ${text}` : `Highlighted: ${text}`;
  const res = await request(c, [{ role: 'system', content: prompt(c.language) }, { role: 'user', content: user }], true, signal);
  if (!res.ok || !res.body) throw new Error(await errorText(res));

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buf = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return;
    buf += value;
    const lines = buf.split('\n');
    buf = lines.pop()!;
    for (const line of lines) {
      if (!line.startsWith('data:')) continue;
      const data = line.slice(5).trim();
      if (data === '[DONE]') return;
      try {
        const delta = JSON.parse(data).choices?.[0]?.delta?.content;
        if (delta) yield delta as string;
      } catch {}
    }
  }
}

/** Real round-trip so a wrong URL / key / model shows up in settings, not on first lookup. */
export async function testConnection(c: Conf): Promise<string> {
  const res = await request(c, [{ role: 'user', content: 'Reply with: ok' }], false);
  if (!res.ok) throw new Error(await errorText(res));
  const j = await res.json();
  return String(j.choices?.[0]?.message?.content ?? '').trim() || '(empty reply)';
}
