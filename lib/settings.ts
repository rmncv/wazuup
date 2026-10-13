import { browser } from 'wxt/browser';

export type Settings = { preset: string; baseUrl: string; model: string; language: string };

// Every provider here speaks the OpenAI chat-completions format.
// First model = default (small & fast is right for 3-line answers). Checked against provider docs 2026-10.
export const PRESETS: Record<string, { baseUrl: string; models: string[] }> = {
  OpenAI: { baseUrl: 'https://api.openai.com/v1', models: ['gpt-6-luna', 'gpt-6.1-sol', 'gpt-6-astra'] },
  Anthropic: { baseUrl: 'https://api.anthropic.com/v1', models: ['claude-haiku-5-5', 'claude-sonnet-5-5', 'claude-opus-5-5'] },
  Gemini: {
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    models: ['gemini-3.5-flash-lite', 'gemini-3.8-flash', 'gemini-flash-latest'],
  },
  OpenRouter: { baseUrl: 'https://openrouter.ai/api/v1', models: ['openrouter/auto', 'openai/gpt-oss-120b', 'openai/gpt-oss-20b'] },
  Groq: {
    baseUrl: 'https://api.groq.com/openai/v1',
    models: ['llama-3.3-70b-versatile', 'openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'llama-3.1-8b-instant'],
  },
  Ollama: { baseUrl: 'http://localhost:11434/v1', models: ['llama3.2', 'qwen3', 'gemma3'] },
  'LM Studio': { baseUrl: 'http://localhost:1234/v1', models: [] },
  Custom: { baseUrl: '', models: [] },
};

function browserLanguage(): string {
  try {
    const code = browser.i18n.getUILanguage();
    return new Intl.DisplayNames(['en'], { type: 'language' }).of(code.split('-')[0]!) ?? 'English';
  } catch {
    return 'English';
  }
}

// Key stays on this device (local); the rest syncs.
export async function getSettings(): Promise<Settings & { apiKey: string }> {
  const { settings } = await browser.storage.sync.get('settings');
  const { apiKey = '' } = await browser.storage.local.get('apiKey');
  return { preset: 'OpenAI', baseUrl: PRESETS.OpenAI!.baseUrl, model: PRESETS.OpenAI!.models[0]!, language: browserLanguage(), ...(settings as Partial<Settings>), apiKey: apiKey as string };
}

export async function saveSettings({ apiKey, ...settings }: Settings & { apiKey: string }) {
  await browser.storage.sync.set({ settings });
  await browser.storage.local.set({ apiKey });
}
