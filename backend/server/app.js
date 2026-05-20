import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/authRoutes.js';
import requestRoutes from './routes/requestsRoutes.js';
import placesRoutes from './routes/placesRoutes.js';
import { env } from './config/env.js';

const app = express();

const isAllowedDevOrigin = (origin) => {
  if (env.isProduction) return false;

  try {
    const url = new URL(origin);
    return ['localhost', '127.0.0.1'].includes(url.hostname);
  } catch (error) {
    return false;
  }
};

const corsOptions = {
  origin(origin, callback) {
    if (!origin || env.clientOrigins.includes(origin) || isAllowedDevOrigin(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
};

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.isTest ? 1000 : 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts, please try again later' },
});

app.disable('x-powered-by');
app.use(helmet({
  crossOriginOpenerPolicy: {
    policy: 'same-origin-allow-popups',
  },
}));
app.use(cors(corsOptions));
app.use(express.json({ limit: '100kb' }));

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/places', placesRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((error, req, res, next) => {
  if (error.message === 'Not allowed by CORS') {
    res.status(403).json({ error: 'Origin is not allowed' });
    return;
  }

  if (error.type === 'entity.too.large') {
    res.status(413).json({ error: 'Request body is too large' });
    return;
  }

  if (!env.isTest) {
    console.error('Unhandled request error:', error);
  }

  res.status(500).json({ error: 'Internal server error' });
});

export default app;
