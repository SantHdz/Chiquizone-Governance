/*
 * Mapa del sitio. Lista las páginas de src/data/seo.ts: una página nueva sale aquí sola.
 * No lleva <lastmod> a propósito: Google solo lo usa si siempre es exacto, y una fecha de build que cambia
 * aunque la página no cambie le quita valor.
 */
import type { APIRoute } from 'astro';
import { todas, urlDe } from '../data/seo';

export const GET: APIRoute = () => {
  const urls = todas.map((p) => `  <url><loc>${urlDe(p.ruta)}</loc></url>`).join('\n');
  const cuerpo = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  return new Response(cuerpo, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
