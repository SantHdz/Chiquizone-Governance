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

- **Tokens** en `src/styles/tokens.css`: paleta (oat, shell, sage, honey, clay, sky, walnut), roles semánticos (`--color-*`), familias de paquete (`--family-*`), escala tipográfica Fraunces/Karla, espacios `--space-1…10` y radios.
- **Componentes** solo consumen tokens, nunca colores sueltos.
- **Guía viva** en `/design-system` (no indexada).

## Publicación

Pensado para GitHub Pages, Netlify o Cloudflare Pages (salida estática en `dist/`). El dominio `chiquizone.com` está en Squarespace; al publicar solo hay que apuntar el DNS.
