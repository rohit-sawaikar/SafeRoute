/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { safetyApiRouter } from './src/server/apiRouter.ts';
import { firebaseBridgeRouter } from './src/server/firebaseBridge.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// CORS Middleware
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    'https://saferoute-1-rues.onrender.com',
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
  ];

  if (origin && (allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production')) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (!origin) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else {
    res.setHeader('Access-Control-Allow-Origin', 'https://saferoute-1-rues.onrender.com');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

app.use(express.json({ limit: '10mb' }));

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'SafeRoute API Server',
    timestamp: new Date().toISOString(),
  });
});

// Mount API routes
app.use('/api/safety', safetyApiRouter);
app.use('/api/saferoute', firebaseBridgeRouter);

// Prevent SPA fallback from intercepting invalid /api/* requests
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API route not found', path: req.originalUrl });
});

// Serve static assets in production
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

// SPA fallback for non-API frontend routes
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

if (process.env.NODE_ENV !== 'test') {
  const host = '0.0.0.0';
  app.listen(Number(PORT), host, () => {
    console.log(`SafeRoute Server listening on http://${host}:${PORT}`);
  });
}

export default app;
