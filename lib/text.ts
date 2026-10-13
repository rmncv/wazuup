// Pure helpers, no browser APIs, so `node --test` can run them.

export const MAX_SELECTION = 300;
const MAX_CONTEXT = 500;

/** Should a selection get the Wazuup icon? (Editable targets are checked by the caller.) */
export function shouldShow(text: string): boolean {
  const t = text.trim();
  if (!t || t.length > MAX_SELECTION) return false;
  return /\p{L}/u.test(t); // skip numbers / punctuation only
}

/** The sentence around `selection` inside `block`, capped at MAX_CONTEXT chars. */
export function extractContext(block: string, selection: string, offset = block.indexOf(selection)): string {
  const text = block.replace(/\s+/g, ' ');
  const sel = selection.replace(/\s+/g, ' ').trim();
  let at = offset >= 0 ? text.indexOf(sel, Math.max(0, offset - 50)) : -1;
  if (at < 0) at = text.indexOf(sel);
  if (at < 0) return sel;

  let start = at;
  while (start > 0 && !/[.!?]\s/.test(text.slice(start - 2, start))) start--;
  let end = at + sel.length;
  while (end < text.length && !/[.!?]/.test(text[end - 1] ?? '')) end++;

  let out = text.slice(start, end).trim();
  if (out.length > MAX_CONTEXT) {
    // Too long (no punctuation): window centered on the selection.
    const pad = Math.floor((MAX_CONTEXT - sel.length) / 2);
    const from = Math.max(0, at - pad);
    out = '…' + text.slice(from, from + MAX_CONTEXT).trim() + '…';
  }
  return out;
}

export type Section = { label: string; body: string };
const LABELS = ['In context', 'General', 'Example'];

/** Split streamed model output ("In context: ...\nGeneral: ...") into labelled sections. */
export function parseSections(raw: string): Section[] {
  const out: Section[] = [];
  for (const line of raw.split('\n')) {
    const m = line.match(/^\s*\**\s*([A-Za-z ]+?)\s*\**\s*:\s*\**\s*(.*)$/);
    const label = m && LABELS.find((l) => l.toLowerCase() === m[1]!.toLowerCase());
    const last = out[out.length - 1];
    if (m && label) out.push({ label, body: m[2]! });
    else if (last) last.body += (last.body ? ' ' : '') + line.trim();
    else if (line.trim()) out.push({ label: '', body: line.trim() });
  }
  return out.map((s) => ({ ...s, body: s.body.trim() }));
}
