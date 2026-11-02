# 0008 · Un asistente de WhatsApp atiende, cotiza y revisa la agenda

- **Estado:** Aceptada (fase 1)
- **Fecha:** 2026-11-02
- **Decide:** Santiago Hernández

## Contexto

Las clientas deciden y apartan por WhatsApp (decisión 0004), pero cada cotización depende de que Sant conteste. Sant quiere que todo el ciclo de venta sea automático: cierre, seguimiento, recordatorios, newsletter y recontratación anual, sin dejar de contestar ni recibir llamadas en su celular.

## Decisión

- Un asistente a la medida en el mismo número, con WhatsApp Cloud API en **coexistencia** con la app de WhatsApp Business.
- Un modelo de Claude con herramientas limitadas: `cotizar`, `revisar_fecha` y `pasar_a_sant`. Nunca inventa precios ni fechas.
- Precios desde `src/data/paquetes.ts`, la misma fuente que el sitio.
- Agenda en Google Calendar: máximo 2 fiestas por día y 8 horas entre el inicio de una y otra (5 de fiesta, 1 de recogida, 1 de traslado, 1 de montaje).
- Apartado con 50 % de anticipo y 500 MXN de garantía.
- Se construye en fases. La fase 1 cotiza y revisa fechas; el apartado lo cierra Sant.

## Consecuencias

- El sitio sigue siendo estático; el botón de WhatsApp lleva al mismo número.
- Aparece un servicio pequeño (Cloudflare Worker) con secretos que hay que cuidar.
- Cuando Sant contesta desde la app, el asistente se pausa 12 horas en ese chat.
- El texto del sitio "Apartas con $500" debe cambiar al nuevo esquema de anticipo.
- Propuesta completa, costos y fases: documento "Chiquizone · Propuesta de chatbot de reservas".
