import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  outDir: 'dist',
  modules: ['@wxt-dev/module-react', '@wxt-dev/auto-icons'],
  autoIcons: { baseIconPath: 'assets/icon.svg', developmentIndicator: false },
  vite: () => ({ plugins: [tailwindcss()] }),
  manifest: {
    name: 'Wazuup',
    description: 'Select a word or phrase, get what it means here. Bring your own LLM key.',
    permissions: ['storage', 'scripting'],
    // Any provider base URL the user configures (OpenAI, Anthropic, Ollama on localhost, ...).
    host_permissions: ['<all_urls>'],
    action: { default_title: 'Wazuup settings' },
    web_accessible_resources: [{ resources: ['fonts/*'], matches: ['<all_urls>'] }],
  },
});
