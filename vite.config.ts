import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import { releaseInfo } from './scripts/releaseInfo';

export default defineConfig(() => {
  const release = releaseInfo();
  return {
    define: { __RELEASE__: JSON.stringify(release) },
    plugins: [react(), tailwindcss(), {
      name: 'release-manifest',
      configureServer(server) {
        server.middlewares.use('/version.json', (_req, res) => {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'no-store');
          res.end(JSON.stringify(release));
        });
      },
      generateBundle() { this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify(release) }); },
    }],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : { ignored: ['**/local-only/**'] },
    },
  };
});
