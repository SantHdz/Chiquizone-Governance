# 0003 · Íconos Phosphor en peso Bold

- **Estado:** Aceptada
- **Fecha:** 2026-10-30
- **Decide:** Santiago Hernández

## Contexto

El sitio usaba emojis como íconos. Se ven distintos en cada sistema operativo, no heredan el color del texto y restan valor percibido.

## Decisión

[Phosphor](https://phosphoricons.com) en peso Bold (licencia MIT): trazo redondeado que combina con Fredoka. 37 íconos curados con nombres en español en `src/icons/`, servidos con `Icon.astro`. Tamaños: 20 px en botones, 14 px en etiquetas, 24 px sueltos.

## Consecuencias

- En Figma están como componentes `icon/*` con el color ligado a `color/ink`.
- Los íconos propios del producto (brincolín, alberca) se dibujarán después con la misma retícula de 256 y trazo de 24.
