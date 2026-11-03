# 0012 · SEO por páginas, datos estructurados y apertura a buscadores de IA

- **Estado:** Propuesta
- **Fecha:** 2026-11-03
- **Decide:** Santiago Hernández (pidió reforzar el SEO para Google y para buscadores de IA; el sitio no se publica sin su revisión)

## Contexto

El sitio era una sola página con título, descripción y un bloque de datos estructurados. Una página no alcanza para aparecer en búsquedas distintas ("playground móvil", "juegos infantiles para fiestas", "juegos para bebés", "niñeras para fiestas", "San Juan del Río"). Tampoco tenía `robots.txt`, mapa del sitio ni forma de revisar que el SEO no se rompa con un cambio.

Lo que dicen las fuentes oficiales (consultadas el 3 de noviembre de 2026):

- Google: para salir en sus respuestas con IA no se necesita marcado ni archivos especiales, solo una página indexada y apta para mostrar fragmentos. Indexar no está garantizado. Los resultados enriquecidos de preguntas frecuentes dejaron de mostrarse en mayo de 2026.
- OpenAI: `OAI-SearchBot` decide si un sitio sale en la búsqueda de ChatGPT; `GPTBot` solo entrena modelos y es independiente.
- `llms.txt` es una convención reciente: ningún buscador grande ha confirmado que la use para posicionar.

## Decisión

- **Seis páginas por tema** además del inicio: playground móvil, juegos para bebés, cuidadoras para fiestas, precios, San Juan del Río y Tequisquiapan. Cada una responde una búsqueda distinta con datos reales del negocio, sin texto de relleno ni datos inventados.
- **Una sola lista de páginas** (`src/data/seo.ts`): de ahí salen títulos, descripciones, `sitemap.xml`, `llms.txt`, migas de pan, el pie y los enlaces entre páginas. Los precios y reglas salen de `paquetes.ts`, `complementos.ts` y `site.ts`.
- **Datos estructurados enlazados** (`src/lib/schema.ts`): negocio local con su catálogo de precios, sitio, página y migas. No se escriben reseñas, calificaciones, horarios ni redes sociales que no existan.
- **Todos los rastreadores son bienvenidos**, incluidos los de buscadores de IA y los que entrenan modelos. El sitio es publicidad: mientras más lo lean, mejor. Optar por salir del entrenamiento es cambiar tres líneas de `robots.txt`.
- **`npm run seo` corre en CI** y revisa títulos, descripciones, canonical, h1, datos estructurados, imágenes, enlaces internos, mapa del sitio y robots. Un cambio que rompa el SEO no pasa.

## Consecuencias

- Una página nueva se agrega en `src/data/seo.ts` y se escribe con el molde `Landing`.
- Mientras no se lance, `netlify.toml` (ADR 0010) manda `noindex` en todo el sitio: nada de esto se indexa hasta que Sant lo decida. Al lanzar hay que quitar ese bloque (guía en `docs/seo.md`).
- Las páginas de zona (San Juan del Río, Tequisquiapan) son cortas porque hoy solo hay dos datos distintos entre ellas (traslado incluido o por cotizar). Pesarán más con datos reales de Sant: lugares donde ya montaron, fotos de cada lugar y reseñas verdaderas.
- Posicionar depende también de lo que el código no controla: Google Search Console, el Perfil de Negocio de Google, reseñas reales y enlaces desde otros sitios. Están en `docs/seo.md`.
