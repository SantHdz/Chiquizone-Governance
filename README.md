# Chiquizone · sitio web

Sitio de Chiquizone, renta de zonas de juego para fiestas en San Juan del Río y Tequisquiapan, Qro.

Hecho con [Astro](https://astro.build): HTML estático, rápido y sin JavaScript salvo el cotizador por WhatsApp.

## Uso

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # genera dist/
```

## Dónde se cambia cada cosa

| Qué | Archivo |
| --- | --- |
| Precios, paquetes y lo que incluyen | `src/data/paquetes.ts` |
| Correo, WhatsApp, zonas, anticipo | `src/data/site.ts` |
| Colores, tipografía, espacios | `src/styles/tokens.css` |
| Componentes (botón, tarjeta, pasos…) | `src/components/` |
| Página principal | `src/pages/index.astro` |

## Design system

La fuente de verdad de la marca es el **design system de Chiquizone** (artifact en claude.ai: https://claude.ai/artifact/A31paMUEPLJDYTHqE8SByR). Este sitio usa los mismos nombres de token.

- **Color**: escalas `--frambuesa-*`, `--marino-*`, `--sol-*`, `--salvia-*` (50 a 900; los 500 son exactos del logo) y roles semánticos (`--surface`, `--ink`, `--accent`, `--family-*`…). Los alias `--color-*` que usan los componentes apuntan a esos roles.
- **Tipografía**: Fredoka (títulos, botones, precios) y Nunito (texto).
- **Logos** en `public/brand/`; favicon con el pin de la "o".
- **Componentes** solo consumen tokens, nunca colores sueltos.
- **Guía viva** en `/design-system` (no indexada).

## Publicación

Pensado para GitHub Pages, Netlify o Cloudflare Pages (salida estática en `dist/`). El dominio `chiquizone.com` está en Squarespace; al publicar solo hay que apuntar el DNS.
