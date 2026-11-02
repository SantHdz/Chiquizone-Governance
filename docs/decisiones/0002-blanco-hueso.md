# 0002 · Blanco hueso en lugar de blanco puro

- **Estado:** Aceptada
- **Fecha:** 2026-10-30
- **Decide:** Santiago Hernández

## Contexto

El fondo de la marca es crema (`#FFF9F1`). Las tarjetas y campos usaban blanco puro y se sentían clínicos, en contra de la esencia cálida y premium. El benchmark confirma que las marcas premium del sector usan lienzos marfil o crema.

## Decisión

Nuevo primitivo `hueso = #FFFCF7`. `surface-raised` apunta a él. El blanco puro solo se usa como color de texto sobre frambuesa y marino.

## Consecuencias

- Tarjetas, campos y botón de contorno cambian solos por la cadena de tokens.
- El contraste de texto sobre superficies no cambia de forma perceptible.
