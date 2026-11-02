# 0008 · El logo del inicio viaja a la barra

- **Estado:** Propuesta (pendiente de la revisión de Sant)
- **Fecha:** 2026-11-02
- **Decide:** Sant

## Contexto

Chiquizone apenas comienza y su logo es el activo de marca más fuerte. Con el logo chico en la barra y el inicio cargado de datos (precio, horas, espacio y zonas), la marca pasaba a segundo plano. Sant pidió bajar el logo al contenido de la derecha, que al hacer scroll se desplace a la barra, quitar los datos del inicio y cuidar que haya animación sutil.

## Opciones

1. **Logo grande en el inicio que viaja a la barra** con el scroll.
2. **Dos logos sin viaje:** uno grande en el inicio y otro chico en la barra que aparece al pasar.
3. **Dejar el logo en la barra** y solo agrandarlo.

## Decisión

Opción 1, con estas reglas:

- **Logo vectorial con colores por tokens.** El logo vertical se define una vez como `<symbol>` y sus cuatro colores salen de `logo-marino`, `logo-frambuesa`, `logo-sol` y `logo-salvia`. En el tema marino, el marino pasa a crema para no perderse. El vector es provisional (`scripts/vectorizar-logo.py`).
- **Logo al centro de la barra, con enlaces a los lados.** El logo sale de la derecha; un destino a la izquierda cruzaría el titular durante el viaje. En el centro el recorrido queda libre de texto.
- **Arriba del todo la barra no muestra enlaces.** Aparecen cuando el logo llega a su lugar. Así el logo no pasa por encima de ellos y el inicio se calma. Con teclado se alcanzan siempre.
- **El viaje sigue al scroll, sin parallax.** El logo sube con la página hasta la barra y ahí termina de achicarse. La distancia es la que falta para que su borde de abajo llegue a la barra (entre 160 y 420 px) y el avance se suaviza para que no vaya a tirones.
- **Movimiento reducido y sin JavaScript.** Con movimiento reducido no hay viaje: el logo de la barra aparece cuando el del inicio sale de pantalla. Sin JavaScript se ven los dos logos.
- **El inicio queda con titular, dos botones, logo y foto.** "Desde $…", horas de juego, espacio y zonas salen del inicio y siguen en Paquetes, Qué incluye y el pie.

## Consecuencias

- El logo vectorizado es provisional: hay que reemplazarlo por el SVG oficial exportado desde Affinity (issue #11).
- La barra cambia en todas las páginas del sitio.
- Si Sant prefiere el logo a la izquierda, el viaje cruzaría el titular y habría que rehacer la composición del inicio.
