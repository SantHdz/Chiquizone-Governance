# Base de conocimiento del asistente

Solo lo que está aquí, más los paquetes de `src/data/paquetes.ts`, puede usar el asistente para contestar. Si algo no está, el asistente no lo inventa: pasa la conversación a Sant.

## Reglas

- Un archivo por tema. Nada de borradores ni versiones viejas: si cambia, se edita el archivo.
- Cada archivo empieza con sus metadatos: `titulo`, `categoria`, `responsable`, `actualizado` (AAAA-MM-DD) y `vigente` (`si` o `no`).
- Cada `##` es un fragmento que el asistente puede citar. Escribe cada sección para que se entienda sola.
- Todo cambio entra por PR y lo aprueba el responsable de la categoría.
- Después de editar, corre `npm run conocimiento` en `bot/`; CI revisa que el índice esté al día.

## Categorías y responsables

| Categoría | Qué cubre | Responsable |
|---|---|---|
| servicio | Zonas, horarios, espacio, montaje, limpieza | Sant |
| apartado | Anticipo, garantía, contrato, pagos | Sant |
| seguridad | Cuidadoras, reglas de la zona | Sant |
