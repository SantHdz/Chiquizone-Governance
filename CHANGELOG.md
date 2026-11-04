# Cambios

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/). Versiones con [SemVer](https://semver.org/lang/es/).

## [Sin publicar]

### Agregado
- Asistente de WhatsApp, fase 1 (`bot/`): cotiza con los precios del sitio, revisa la agenda en Google Calendar y pasa la conversación a Sant.
- Asistente, fase 1.5: identidad por número en D1, registros de cada respuesta, base de conocimiento curada con fuentes, guardia de montos, defensa contra inyección, límite de uso y aviso de IA.
- Asistente: modo de búsqueda con Vectorize y reranker, apagado por un interruptor; reindexado incremental y comparación de ambos modos con las mismas preguntas.
- README como caso de estudio, registro de decisiones (`docs/decisiones/`) y resumen del benchmark.
- CI en GitHub Actions: tokens válidos y al día, y build en cada pull request.
- Plantillas de issues (bug, mejora, decisión de diseño) y CODEOWNERS.
- Licencia: todos los derechos reservados.
- Rediseño de la página: hero con la foto real del montaje, globos, banderines y chispas del logo en SVG, entradas al hacer scroll y menú móvil.
- Foto del montaje en WebP (640 y 1000 px) e imagen para redes (`public/fotos/`).
- Skill ui-ux-pro-max para guiar decisiones de UX y movimiento (PR #16).
- Logo grande en el inicio que viaja al centro de la barra al hacer scroll, con colores por tokens y versión para tema marino (ADR 0009, propuesta).
- Logo vectorizado provisional (`scripts/vectorizar-logo.py`) hasta tener el SVG oficial.
- Paso opcional "¿Quieres sumar algo?" en Arma tu zona: ocho complementos y el combo Fiesta completa, con total estimado y apartado del 50 % que se actualizan al marcar, y mensaje de WhatsApp con la cuenta (ADR 0011, propuesta). Los datos viven en `src/data/complementos.ts` y `calcular()` es la única cuenta.
- Íconos para los complementos (bocina, burbujas, letrero, picnic, montaña rusa, brincolín, hora extra y combo).
- Capa de SEO (ADR 0012, propuesta): seis páginas por tema (playground móvil, juegos para bebés, cuidadoras, precios, San Juan del Río y Tequisquiapan), datos estructurados enlazados, `robots.txt` abierto a buscadores de IA, `sitemap.xml`, `llms.txt`, página 404 y la prueba `npm run seo` en CI. Guía en `docs/seo.md`.

### Cambiado
- Título, descripción y metaetiquetas del inicio con las palabras que busca la gente; la ceja del inicio dice "Playground móvil para fiestas". Las direcciones llevan barra final.
- Precios aprobados por Sant el 3 de noviembre: Baby baby sube de $1,870 a $1,970 (apartado de $985) y Pro Baby de $3,200 a $3,800 (apartado de $1,900), ahora con 2 cuidadoras.
- Títulos en Fraunces con una palabra en cursiva; Fredoka queda para impacto puntual (ADR 0006, aceptada).
- Secciones con ceja, título y entradilla; "Cómo funciona" junto a los requisitos del espacio; Splash dentro de Paquetes.
- Tema oscuro (marino) automático según el sistema.
- Inicio más calmado: sin "Desde $…", horas, espacio ni zonas; titular, dos botones, logo y foto.
- Barra con el logo al centro y enlaces a los lados; menú móvil con ícono de tres rayas.
- Anticipo confirmado: 50 % del total por transferencia, más $500 de garantía que se devuelve (issue #3). `site.ts` guarda el porcentaje y no un monto fijo.
- Al lanzar solo se muestran Baby baby y Pro Baby (issue #5). Cada paquete tiene `disponible` en `src/data/paquetes.ts`; el resto del sitio se arma con los publicados: las preguntas de "Arma tu zona", el bloque Splash, la sección Pro, el formulario y los datos estructurados. Si falta un paquete para alguna respuesta, el build falla con un aviso claro.

## [0.1.0] · 2026-10-30

### Agregado
- Sitio en Astro con los 8 paquetes reales y cotizador por WhatsApp.
- Tokens en tres capas con validación de contraste AA.
- Componentes revisados: Botón, Etiqueta, Tarjeta de paquete, Campo, Pasos y Loader.
- 29 íconos Phosphor Bold y plan de motion.
- Fase 1 del benchmark: Arma tu zona, ¿Tu fecha está libre?, Lo que llega a tu fiesta, Tu fiesta semana a semana y Preguntas frecuentes.
- Datos estructurados de negocio local, servicio y preguntas frecuentes.

### Cambiado
- Superficies en blanco hueso `#FFFCF7` en lugar de blanco puro.
