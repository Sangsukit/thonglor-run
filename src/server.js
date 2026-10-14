import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { router as publicRouter } from './routes/public.js';
import { router as adminRouter } from './routes/admin.js';
import { AppError } from './registrations.js';

const publicDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');

export function createApp() {
  const app = express();
  app.set('trust proxy', /^\d+$/.test(config.trustProxy) ? Number(config.trustProxy) : config.trustProxy);
  app.disable('x-powered-by');
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        'default-src': ["'self'"],
        'script-src': ["'self'", 'https://cdn.omise.co'],
        'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        'font-src': ["'self'", 'https://fonts.gstatic.com'],
        'img-src': ["'self'", 'data:'],
        'connect-src': ["'self'", 'https://vault.omise.co', 'https://api.omise.co'],
        'frame-src': ['https://vault.omise.co', 'https://cdn.omise.co'],
        'form-action': ["'self'"],
        'upgrade-insecure-requests': config.baseUrl.startsWith('https') ? [] : null
      }
    }
  }));
  app.use(cookieParser());
  app.use(express.json({ limit: '50kb' }));

  app.get('/healthz', (req, res) => res.json({ ok: true }));
  app.use('/api/admin', adminRouter);
  app.use('/api', publicRouter);
  app.use('/api', (req, res) => res.status(404).json({ error: 'not_found', message: 'Unknown endpoint.' }));

  app.use(express.static(publicDir, { extensions: ['html'], maxAge: '5m' }));
  app.get('/', (req, res) => res.sendFile(path.join(publicDir, 'index.html')));

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err instanceof AppError) return res.status(err.status).json({ error: err.code, message: err.message, ...err.extra });
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'bad_json', message: 'Malformed request.' });
    if (err.omise) {
      console.error('omise error', err.omise);
      return res.status(502).json({ error: 'payment_provider', message: 'The payment provider did not accept the request. Try again or use another method.' });
    }
    console.error(err);
    res.status(500).json({ error: 'server_error', message: 'Something went wrong on our side. Try again in a moment.' });
  });
  return app;
}
