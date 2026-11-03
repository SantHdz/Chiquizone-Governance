/*
 * robots.txt. Se genera para que la dirección del mapa del sitio salga de site.url y no de un texto fijo.
 *
 * Decisión (docs/decisiones/0012-seo-y-buscadores-de-ia.md): todo el sitio es público y está hecho para
 * que lo encuentren, así que se permite a todos los rastreadores, incluidos los de buscadores de IA
 * (para que puedan citarlo y recomendarlo) y los que entrenan modelos. Para optar por salir de
 * entrenamiento basta pasar GPTBot, ClaudeBot y Google-Extended a "Disallow: /": las citas no se pierden.
 *
 * No se bloquea /design-system/ aquí a propósito: esa página lleva `noindex`, y un rastreador solo ve
 * el `noindex` si puede entrar a leerla.
 */
import type { APIRoute } from 'astro';
import { urlDe } from '../data/seo';

const agentes = [
  '*',
  // Google y Bing (Bing alimenta a varios asistentes)
  'Googlebot', 'Bingbot',
  // OpenAI: búsqueda en ChatGPT, páginas que abre ChatGPT por una persona y entrenamiento
  'OAI-SearchBot', 'ChatGPT-User', 'GPTBot',
  // Anthropic: búsqueda, páginas que abre Claude por una persona y entrenamiento
  'Claude-SearchBot', 'Claude-User', 'ClaudeBot',
  // Perplexity
  'PerplexityBot', 'Perplexity-User',
  // Google Gemini y Apple
  'Google-Extended', 'Applebot', 'Applebot-Extended',
];

export const GET: APIRoute = () => {
  const cuerpo = [
    '# Chiquizone: sitio público. Todos los rastreadores son bienvenidos.',
    ...agentes.map((a) => `User-agent: ${a}`),
    'Allow: /',
    '',
    `Sitemap: ${urlDe('/sitemap.xml')}`,
    '',
  ].join('\n');
  return new Response(cuerpo, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
