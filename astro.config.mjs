import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://chiquizone.com',
  // Cada página vive en una sola dirección (con barra al final): evita duplicados para Google.
  trailingSlash: 'always',
  build: { inlineStylesheets: 'always' },
});
