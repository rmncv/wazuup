import { useEffect, useState, type FormEvent } from 'react';
import { Button, Input, Label, Select } from '@/components/ui';
import { PRESETS, getSettings, saveSettings, type Settings } from '@/lib/settings';
import { testConnection } from '@/lib/llm';

type Form = Settings & { apiKey: string };
const CUSTOM = '__custom';
type Status = { kind: 'ok' | 'error' | 'info'; text: string } | null;

export default function App() {
  const [form, setForm] = useState<Form | null>(null);
  const [status, setStatus] = useState<Status>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => { getSettings().then(setForm); }, []);
  if (!form) return null;

  const set = (patch: Partial<Form>) => { setForm({ ...form, ...patch }); setStatus(null); };
  const models = PRESETS[form.preset]?.models ?? [];
  const custom = !models.includes(form.model);
  const local = /^https?:\/\/(localhost|127\.0\.0\.1)/.test(form.baseUrl);

  async function save(e: FormEvent) {
    e.preventDefault();
    await saveSettings({ ...form!, baseUrl: form!.baseUrl.trim(), model: form!.model.trim(), apiKey: form!.apiKey.trim() });
    setStatus({ kind: 'ok', text: 'Saved. Select some text on any page.' });
  }

  async function test() {
    setTesting(true);
    setStatus({ kind: 'info', text: 'Testing…' });
    try {
      const reply = await testConnection(form!);
      setStatus({ kind: 'ok', text: `Connected. Model replied: “${reply.slice(0, 60)}”` });
    } catch (e) {
      setStatus({ kind: 'error', text: e instanceof Error ? e.message : String(e) });
    } finally {
      setTesting(false);
    }
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-12 sm:py-16">
      <div className="mb-8 flex items-center gap-3">
        <img src="/icons/48.png" alt="" className="size-10" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Wazuup</h1>
          <p className="text-sm text-muted-foreground">Select a word or phrase, get what it means here.</p>
        </div>
      </div>

      <form onSubmit={save} className="grid gap-5 rounded-xl border border-border p-6 shadow-xs">
        <div className="grid gap-2">
          <Label htmlFor="preset">Provider</Label>
          <Select id="preset" value={form.preset} onChange={(e) => {
              const p = PRESETS[e.target.value]!;
              set({ preset: e.target.value, baseUrl: p.baseUrl, model: p.models[0] ?? '' });
            }}>
            {Object.keys(PRESETS).map((p) => <option key={p}>{p}</option>)}
          </Select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="baseUrl">Base URL</Label>
          <Input id="baseUrl" required type="url" value={form.baseUrl} placeholder="https://api.example.com/v1"
            onChange={(e) => set({ baseUrl: e.target.value, preset: 'Custom' })} />
          <p className="text-xs text-muted-foreground">Any OpenAI-compatible <code>/chat/completions</code> endpoint.</p>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="apiKey">API key</Label>
          <Input id="apiKey" type="password" autoComplete="off" value={form.apiKey} required={!local}
            placeholder={local ? 'Not needed for local models' : 'sk-…'} onChange={(e) => set({ apiKey: e.target.value })} />
          <p className="text-xs text-muted-foreground">Stored only on this device. Sent only to the base URL above.</p>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="model">Model</Label>
          {models.length > 0 && (
            <Select id="model" value={custom ? CUSTOM : form.model} onChange={(e) => set({ model: e.target.value === CUSTOM ? '' : e.target.value })}>
              {models.map((m) => <option key={m}>{m}</option>)}
              <option value={CUSTOM}>Custom…</option>
            </Select>
          )}
          {custom && (
            <Input id={models.length ? 'customModel' : 'model'} required autoFocus={models.length > 0} value={form.model}
              placeholder="Model ID, e.g. my-model-v2" onChange={(e) => set({ model: e.target.value })} />
          )}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="language">Explain in</Label>
          <Input id="language" required value={form.language} placeholder="English" onChange={(e) => set({ language: e.target.value })} />
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <Button type="submit">Save</Button>
          <Button type="button" variant="outline" onClick={test} disabled={testing || !form.baseUrl || !form.model}>Test connection</Button>
        </div>

        {status && (
          <p role="status" className={`text-sm break-words ${status.kind === 'ok' ? 'text-success' : status.kind === 'error' ? 'text-destructive' : 'text-muted-foreground'}`}>
            {status.text}
          </p>
        )}
      </form>

      <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
        Privacy: when you click the icon, the selected text and its surrounding sentence (up to 500 characters) are sent to your provider. Nothing else leaves your browser.
      </p>
    </main>
  );
}
