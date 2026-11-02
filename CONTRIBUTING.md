# Cómo trabajamos en Chiquizone

Todo cambio pasa por un pull request (PR), para tener trazabilidad: quién cambió qué, cuándo y por qué.

## El flujo

0. **Issue primero.** Todo empieza con un issue (bug, mejora o decisión de diseño) para que quede el porqué.
1. **Rama nueva desde `main`** por cada cambio, con un nombre que diga qué es:
   - `feat/arma-tu-zona` para algo nuevo
   - `fix/faq-flecha` para corregir algo
   - `tokens/blanco-hueso` para cambios de tokens del DS
   - `docs/readme` para documentación
2. **Commits pequeños** con mensaje en español que diga qué cambia: `Agrega preguntas frecuentes con datos estructurados`.
3. **Push y PR** hacia `main`, llenando la plantilla y ligando el issue con `Cierra #N`.
4. **CI** revisa que los tokens estén al día y que el sitio compile.
5. **Revisión:** Sant revisa y aprueba. Nadie hace merge de su propio PR sin revisión.
6. **Merge** con "Squash and merge" para que `main` quede con un commit por cambio.

## Fuente única de verdad

- Los tokens viven en `tokens/1-primitivos.json`, `2-semanticos.json` y `3-componentes.json`.
- `npm run tokens` genera `src/styles/tokens.css`; no se edita a mano.
- Las variables de Figma se generan desde los mismos tokens.

## En VS Code

- Panel **Control de código fuente** (Ctrl/Cmd + Shift + G): ver cambios, hacer commit, cambiar de rama.
- Extensión **GitHub Pull Requests**: crear, revisar y aprobar PRs sin salir de VS Code.

## Decisiones de diseño

Una decisión que cambia la marca, los tokens o un componente se registra en `docs/decisiones/` con la plantilla. Se sube en el mismo PR que la aplica.

## Cambios

Cada PR que cambia algo visible agrega una línea en `CHANGELOG.md`, en "Sin publicar".
