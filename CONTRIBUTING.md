# Cómo trabajamos en Chiquizone

Todo cambio pasa por un pull request (PR), para tener trazabilidad: quién cambió qué, cuándo y por qué.

## El flujo

1. **Rama nueva desde `main`** por cada cambio, con un nombre que diga qué es:
   - `feat/arma-tu-zona` para algo nuevo
   - `fix/faq-flecha` para corregir algo
   - `tokens/blanco-hueso` para cambios de tokens del DS
   - `docs/readme` para documentación
2. **Commits pequeños** con mensaje en español que diga qué cambia: `Agrega preguntas frecuentes con datos estructurados`.
3. **Push y PR** hacia `main`, llenando la plantilla.
4. **Revisión:** Sant revisa y aprueba. Nadie hace merge de su propio PR sin revisión.
5. **Merge** con "Squash and merge" para que `main` quede con un commit por cambio.

## Fuente única de verdad

- Los tokens viven en `tokens/1-primitivos.json`, `2-semanticos.json` y `3-componentes.json`.
- `npm run tokens` genera `src/styles/tokens.css`; no se edita a mano.
- Las variables de Figma se generan desde los mismos tokens.

## En VS Code

- Panel **Control de código fuente** (Ctrl/Cmd + Shift + G): ver cambios, hacer commit, cambiar de rama.
- Extensión **GitHub Pull Requests**: crear, revisar y aprobar PRs sin salir de VS Code.
