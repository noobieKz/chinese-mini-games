import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { createLocalServer } from './index';
if (existsSync('.env')) loadEnvFile('.env');
const port = Number(process.env.PORT) || 3001;
createLocalServer().http.listen(port, '0.0.0.0', () =>
  console.log(`HanPlay server: http://localhost:${port}`),
);
