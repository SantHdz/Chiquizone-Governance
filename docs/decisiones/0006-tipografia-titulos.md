# 0006 · Tipografía de títulos

- **Estado:** Aceptada
- **Fecha:** 2026-11-02
- **Decide:** Sant

## Contexto

Los títulos usaban Fredoka, redondeada y amable. El benchmark señala que las marcas premium del sector usan una serif editorial en títulos y que lo muy infantil resta confianza al comprador adulto. La esencia pide "casi de lujo" sin perder la alegría de fiesta.

## Opciones

1. **Fraunces en títulos**, con cursiva para una palabra clave por título, y Nunito en texto. Fredoka se queda para impacto puntual.
2. **Mantener Fredoka** y solo bajar la saturación de color de la interfaz.

## Decisión

Opción 1. Se agrega el primitivo `font-headline` (Fraunces, con ejes `opsz` y `SOFT`) y los estilos "Títulos" lo usan: `display-xl`, `display-l`, `title`, `subtitle` y `price`. Fredoka pasa a `font-display`, reservado para titulares muy potentes o específicos: promos, nombres de paquete y etiquetas grandes (estilo `impact`). Nunito sigue en texto corrido.

Regla de uso: una sola palabra en cursiva por título, en el color de acento, para marcar la idea. Nunca dos.

## Consecuencias

- Se cargan tres familias desde Google Fonts; Fraunces es variable y pesa más que Fredoka. Se limita a pesos 500–700.
- Los componentes de Figma que usan Fredoka en títulos (Paso, tarjetas) se actualizan en el issue #10.
