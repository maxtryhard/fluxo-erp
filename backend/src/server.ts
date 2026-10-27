import express, { ErrorRequestHandler } from 'express';
import { env } from './config/env.js';
import { authRouter } from './routes/authRoutes.js';
import { erpRouter } from './routes/erpRoutes.js';
import { corsSecurity, globalRateLimiter, helmetSecurity } from './middlewares/security.js';
import { initDefaultUsers } from './services/authService.js';

const app = express();

app.disable('x-powered-by');
app.use(helmetSecurity);
app.use(corsSecurity);
app.use(express.json({ limit: '100kb' }));
app.use(globalRateLimiter);

app.get('/api/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});
app.use('/api/auth', authRouter);
app.use('/api/erp', erpRouter);

app.use((_req, res) => {
  res.status(404).json({ error: 'Rota não encontrada.' });
});

const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof SyntaxError && 'body' in error) {
    res.status(400).json({ error: 'Corpo da requisição JSON inválido.' });
    return;
  }

  if (error instanceof Error && error.message.startsWith('Bloqueado pelas políticas de CORS')) {
    res.status(403).json({ error: 'Origem não autorizada.' });
    return;
  }

  console.error('Erro não tratado na API:', error);
  res.status(500).json({ error: 'Erro interno do servidor.' });
};
app.use(errorHandler);

const start = async (): Promise<void> => {
  await initDefaultUsers();
  app.listen(env.PORT, () => {
    console.log(`API disponível em http://localhost:${env.PORT}`);
  });
};

start().catch((error: unknown) => {
  console.error('Falha ao iniciar a API:', error);
  process.exitCode = 1;
});
