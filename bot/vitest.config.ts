import { defineConfig } from 'vitest/config';

// `npm test` corre solo las pruebas sin costo. `npm run eval` corre evals/ contra el modelo real (gasta tokens).
export default defineConfig({
  test: { include: process.env.EVALS ? ['evals/**/*.test.ts'] : ['test/**/*.test.ts'] },
});
