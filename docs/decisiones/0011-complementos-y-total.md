# 0011 · Complementos con total estimado en "Arma tu zona"

- **Estado:** Propuesta
- **Fecha:** 2026-11-03
- **Decide:** Santiago Hernández (precios aprobados el 3 de noviembre; el paso en el sitio espera su revisión)

## Contexto

Quien arma su zona a veces quiere sumar algo: bocina, burbujas, un brincolín para los hermanos mayores, una hora más. Hasta ahora el sitio solo recomendaba un paquete y todo lo demás se hablaba por WhatsApp, sin precio a la vista. Sant aprobó los precios del documento "Precios de Baby baby y extras" (Baby baby sube a $1,970 y Pro Baby a $3,900; ocho complementos y un combo por paquete). El apartado es del 50 % del total (issue #3), así que con complementos el cliente necesita ver el total para saber cuánto transferir.

## Decisión

- **Un paso opcional, "¿Quieres sumar algo?",** después de las preguntas de "Arma tu zona". Si no marcas nada, todo queda como antes.
- **Los complementos viven en un solo archivo,** `src/data/complementos.ts`, con su precio, el paquete donde se ofrecen y si están disponibles. Lo que un paquete ya trae (por ejemplo, Pro Baby ya incluye burbujas y montaña rusa) no se ofrece ahí, y el build falla si los datos se contradicen.
- **El total y el apartado salen de una sola función, `calcular()`.** El sitio la usa hoy en el navegador; el asistente de WhatsApp puede importar la misma, así que los dos dan siempre la misma cifra.
- **El combo "Fiesta completa" reemplaza a sus partes,** nunca se cobra dos veces. Pro Baby tiene el suyo (bocina y letrero) porque ya trae burbujas.
- **El apartado es el 50 % del total con complementos** (`site.bookingDepositPct`). La garantía de $500 no cambia.
- **El total sigue siendo una estimación.** El mensaje de WhatsApp lleva el paquete, los complementos y el total; una persona confirma fecha y disponibilidad. No hay backend ni datos guardados (ADR 0004).

## Consecuencias

- Cambiar un precio, quitar un complemento o ampliar un combo se hace en `src/data/complementos.ts` sin tocar componentes.
- Si no hay complementos disponibles, el paso desaparece y "Arma tu zona" vuelve a su forma anterior.
- Precios finales: Baby baby $1,970 y Pro Baby $3,900 con 2 cuidadoras (elegido por Sant el 3 de noviembre).
- Pendientes de Sant: si "cuidadora extra" se llama así o "nana" en el sitio, y el espacio que pide el brincolín grande.
- El asistente de WhatsApp (PR #18) usa los precios de `paquetes.ts`; su guardia de montos y sus pruebas deben leer también `complementos.ts` para aceptar totales con complementos.
