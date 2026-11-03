import { env } from './config/env.js';
import { app } from './app.js';
import { initDefaultUsers } from './services/authService.js';

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
