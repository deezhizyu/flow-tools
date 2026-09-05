import { defineManifest } from '@crxjs/vite-plugin';
import pkg from './package.json' with { type: 'json' };

export default defineManifest({
  manifest_version: 3,
  name: 'Flow Tools',
  version: pkg.version,
  description: pkg.description,
  permissions: ['storage'],
  // getMediaUrlRedirect (labs.google) 302s to signed, cross-origin
  // flow-content.google URLs — both need host_permissions for the
  // background worker's copy-to-clipboard fetch to bypass CORS.
  host_permissions: ['https://labs.google/*', 'https://flow-content.google/*'],
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },
  content_scripts: [
    {
      matches: [
        'https://labs.google.com/fx/*/tools/flow/*',
        'https://labs.google.com/fx/tools/flow/*',
        'https://flow.google.com/*',
      ],
      js: ['src/content/index.tsx'],
      run_at: 'document_idle',
    },
  ],
});
