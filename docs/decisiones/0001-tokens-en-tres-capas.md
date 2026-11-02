# 0001 · Tokens en tres capas con validación de contraste

- **Estado:** Aceptada
- **Fecha:** 2026-10-30
- **Decide:** Santiago Hernández

## Contexto

El sitio, el design system documentado y Figma necesitaban hablar el mismo idioma. Una paleta suelta en CSS obligaba a cambiar el mismo color en varios lugares y no decía para qué servía cada uno.

## Decisión

Tres capas en `tokens/`:

1. **Primitivos:** valores crudos (`frambuesa-500 = #B5456F`, `space-4 = 16px`).
2. **Semánticos:** roles que apuntan a primitivos (`accent → frambuesa-500`), con temas claro y marino.
3. **Componentes:** decisiones por componente que apuntan a semánticos (`button-primary-bg → accent`).

`scripts/build-tokens.mjs` falla si una capa salta a otra que no le toca o si un par `-bg`/`-fg` baja de 4.5:1.

## Consecuencias

- Cambiar el color de acción es una línea.
- Nadie edita `src/styles/tokens.css` a mano; CI revisa que esté al día.
- Las variables de Figma se crean con la misma estructura (una colección por capa).
