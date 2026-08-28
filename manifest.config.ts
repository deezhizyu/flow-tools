import { defineManifest } from '@crxjs/vite-plugin';
import pkg from './package.json' with { type: 'json' };

export default defineManifest({
  manifest_version: 3,
  name: 'Flow Tools',
  version: pkg.version,
  description: pkg.description,
  permissions: ['storage'],
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },
  content_scripts: [
    {
      matches: [
        'https://labs.google/fx/*/tools/flow/*',
        'https://labs.google/fx/tools/flow/*',
        'https://flow.google/*',
      ],
      js: ['src/content/index.tsx'],
      run_at: 'document_idle',
    },
  ],
});
