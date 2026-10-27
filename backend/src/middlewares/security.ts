import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { RequestHandler } from 'express';
import { env } from '../config/env.js';

// Prevenção contra DoS/DDoS e força bruta
export const globalRateLimiter: RequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 200, // limite por IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Muitas requisições originadas deste IP. Tente novamente mais tarde.',
  },
});

export const authRateLimiter: RequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // limite estrito para login
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Muitas tentativas de login. Aguarde 15 minutos para tentar novamente.',
  },
});

// Configuração estrita de CORS baseada nas regras de segurança
export const corsSecurity: RequestHandler = cors({
  origin: (origin, callback) => {
    // Permite requisições sem origin apenas se em desenvolvimento local ou ferramentas locais
    if (!origin || origin === env.ALLOWED_ORIGIN) {
      callback(null, true);
    } else {
      callback(new Error('Bloqueado pelas políticas de CORS do sistema.'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});

export const helmetSecurity: RequestHandler = helmet({
  contentSecurityPolicy: true,
  crossOriginEmbedderPolicy: false,
});
