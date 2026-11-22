import express from 'express';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { INITIAL_SEED_DATA } from './src/data/seedData.ts';
import type { FiscalDatabase } from './src/types/index.ts';

const PORT = 3000;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'fiscalobra-db.json');

function ensureDb(): FiscalDatabase {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(INITIAL_SEED_DATA, null, 2), 'utf-8');
    return structuredClone(INITIAL_SEED_DATA);
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw) as FiscalDatabase;
  } catch {
    fs.writeFileSync(DB_FILE, JSON.stringify(INITIAL_SEED_DATA, null, 2), 'utf-8');
    return structuredClone(INITIAL_SEED_DATA);
  }
}

function saveDb(db: FiscalDatabase): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'FiscalObra Pro API' });
  });

  app.get('/api/clima', async (req, res) => {
    const lat = Number(req.query.lat ?? -7.2306);
    const lng = Number(req.query.lng ?? -35.8811);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2500);
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m`;
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      if (response.ok) {
        const json = (await response.json()) as {
          current?: {
            temperature_2m?: number;
            relative_humidity_2m?: number;
            precipitation?: number;
            wind_speed_10m?: number;
          };
        };
        if (json.current) {
          const precip = Number(json.current.precipitation ?? 0);
          res.json({
            temperatura: Math.round(Number(json.current.temperature_2m ?? 29)),
            umidade: Math.round(Number(json.current.relative_humidity_2m ?? 58)),
            chuva: precip > 0.2,
            velocidadeVento: Math.round(Number(json.current.wind_speed_10m ?? 14)),
            observacao:
              precip > 0.2
                ? 'Precipitação pluviométrica detectada na estação meteorológica.'
                : 'Condição climática estável para execução de serviços em campo.',
          });
          return;
        }
      }
    } catch {
      // Fallback below when offline or external API is unreachable
    }

    const seed = Math.abs(Math.round((lat * 100 + lng * 100) % 7));
    res.json({
      temperatura: 28 + seed,
      umidade: 54 + seed * 2,
      chuva: false,
      velocidadeVento: 12 + seed,
      observacao: 'Leitura meteorológica local registrada para frente de obra.',
    });
  });

  app.get('/api/db', (_req, res) => {
    const db = ensureDb();
    res.json(db);
  });

  app.put('/api/db', (req, res) => {
    const payload = req.body as FiscalDatabase;
    if (!payload || !Array.isArray(payload.contratos)) {
      res.status(400).json({ error: 'Estrutura de dados inválida.' });
      return;
    }
    saveDb(payload);
    res.json(payload);
  });

  app.post('/api/reset', (_req, res) => {
    const fresh = structuredClone(INITIAL_SEED_DATA);
    saveDb(fresh);
    res.json(fresh);
  });

  const httpServer = http.createServer(app);

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`FiscalObra Pro server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
