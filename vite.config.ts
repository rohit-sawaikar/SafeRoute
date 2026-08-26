import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import dotenv from 'dotenv';
import express from 'express';
import { defineConfig, Plugin } from 'vite';
import { safetyApiRouter } from './src/server/apiRouter.ts';
import { firebaseBridgeRouter } from './src/server/firebaseBridge.ts';

dotenv.config();

function apiServerPlugin(): Plugin {
  const app = express();
  app.use(express.json({ limit: '10mb' }));
  app.use('/api/safety', safetyApiRouter);
  app.use('/api/saferoute', firebaseBridgeRouter);

  return {
    name: 'api-server-plugin',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.startsWith('/api/safety') || req.url?.startsWith('/api/saferoute')) {
          app(req as any, res as any, next);
        } else {
          next();
        }
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), apiServerPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
