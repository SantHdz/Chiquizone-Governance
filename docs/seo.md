# SEO de Chiquizone

Guía de cómo está armado el SEO del sitio, qué hace el código y qué solo puede hacer una persona. La decisión de fondo está en [ADR 0012](decisiones/0012-seo-y-buscadores-de-ia.md).

**Lo que sí se puede asegurar:** el sitio está técnicamente bien hecho para que Google, Bing y los buscadores de IA lo lean, lo entiendan y lo citen, y una prueba automática (`npm run seo`) evita que se rompa. **Lo que nadie puede asegurar:** en qué posición saldrá ni cuándo. Google lo aclara en su documentación: indexar y mostrar una página no está garantizado. La posición depende del tiempo, de la competencia y de cosas que están fuera del código (Perfil de Negocio, reseñas, enlaces).

## Qué hace el código

| Pieza | Dónde | Para qué |
|---|---|---|
| Siete páginas con una búsqueda cada una | `src/pages/` y `src/data/seo.ts` | Una sola página no puede salir para "playground móvil", "juegos para bebés" y "niñeras para fiestas" a la vez |
| Título, descripción, canonical, Open Graph y Twitter | `src/layouts/Base.astro` | Cómo se ve y se entiende cada página en Google, WhatsApp y redes |
| Datos estructurados enlazados (negocio local con catálogo de precios, sitio, página, migas) | `src/lib/schema.ts` | Que Google y las IA lean los datos sin adivinar |
| `robots.txt` abierto a todos los rastreadores | `src/pages/robots.txt.ts` | Permite buscadores y buscadores de IA (OAI-SearchBot, Claude-SearchBot, PerplexityBot, Googlebot, Bingbot, Applebot) y a los que entrenan modelos |
| `sitemap.xml` | `src/pages/sitemap.xml.ts` | Lista de páginas para Google y Bing; sale de `seo.ts` |
| `llms.txt` | `src/pages/llms.txt.ts` | Resumen del negocio en texto plano para asistentes de IA, con los precios del día |
| Página 404 con `noindex` | `src/pages/404.astro` | Que las direcciones rotas no entren a Google |
| Prueba `npm run seo` en CI | `scripts/verificar-seo.mjs` | Falla si falta un título, canonical o h1, si hay un enlace roto, si el sitemap no coincide o si hay reseñas inventadas en los datos |

Los precios y los datos del negocio nunca se escriben en estas piezas: salen de `paquetes.ts`, `complementos.ts` y `site.ts`. Si cambia un precio, cambian solos la página, los datos estructurados y `llms.txt`.

## Mapa de palabras clave

No hay datos de volumen de búsqueda (no tenemos acceso a Google Keyword Planner). El mapa sale de cómo busca la gente en México según el estudio de competencia del 20 de octubre y de cómo se llaman estos servicios. Después del lanzamiento, el informe de Rendimiento de Search Console dirá cuáles se buscan de verdad.

| Intención | Palabras | Página | Dónde aparecen |
|---|---|---|---|
| Categoría principal | zonas de juego para fiestas, juegos infantiles para fiestas, playground para fiestas, renta de juegos infantiles | Inicio | Título, descripción, ceja del titular, bloque "Conoce más" |
| Playground móvil | playground móvil, zona de juegos portátil, soft play | `/playground-movil/` | Título, titular, definición, preguntas frecuentes |
| Bebés | juegos para bebés, fiesta de 1 año, primer cumpleaños, alberca de pelotas, área de juegos para bebés | `/juegos-para-bebes/` | Título, titular, texto y preguntas |
| Cuidado | cuidadoras para fiestas infantiles, niñeras para fiestas, nanas | `/cuidadoras-para-fiestas-infantiles/` | Título, titular, texto y preguntas |
| Precio | precio renta de zona de juego, cuánto cuesta rentar juegos infantiles | `/precios/` | Título, tablas de paquetes y complementos |
| Local | San Juan del Río, Tequisquiapan, Querétaro | `/san-juan-del-rio/` y `/tequisquiapan/` | Título, titular, preguntas, datos estructurados |
| Complementos | máquina de burbujas, montaña rusa infantil, brincolín | `/precios/` | Tabla de complementos |

No se usó la etiqueta `meta keywords`: Google la ignora desde hace años. Tampoco se repiten palabras a la fuerza ni se esconde texto: Google lo castiga y a las personas no les sirve.

## Lo que solo puede hacer una persona

Estas son las acciones que más pesan para aparecer, y ninguna se resuelve desde el código. Van de más a menos importante.

1. **Perfil de Negocio de Google** (el mapa y el "cerca de mí"). Crearlo como negocio con área de servicio (San Juan del Río y Tequisquiapan) sin mostrar domicilio, con la categoría más cercana a renta de juegos o equipo para fiestas infantiles, fotos reales del montaje, el WhatsApp y el enlace al sitio. Verificarlo con el método que Google ofrezca.
2. **Google Search Console.** Agregar el dominio como propiedad, verificarlo por DNS, enviar `https://chiquizone.com/sitemap.xml` y pedir la indexación de las siete direcciones. Es lo único que confirma que Google entró.
3. **Reseñas reales.** Pedir a cada cliente satisfecho que deje su reseña en el Perfil de Negocio. No se compran ni se inventan. Cuando haya reseñas verdaderas se pueden mostrar en el sitio con su fuente.
4. **Bing Webmaster Tools.** Importar el sitio desde Search Console y enviar el mapa. Bing alimenta a varios asistentes de IA.
5. **Redes con el enlace del sitio.** Facebook, Instagram y TikTok con la misma dirección web, nombre y teléfono. Cuando Sant pase los enlaces reales, se agregan en `site.sameAs` (`src/data/site.ts`) y salen solos en los datos estructurados.
6. **Directorios locales** donde ya aparecen las rentadoras de la zona (Tu Fiestón, Directorio Empresas, Planeta México, Cronoshare, Bodas.com.mx). Con el mismo nombre, teléfono y correo que el sitio, porque Google compara que coincidan.
7. **Apple Business Connect** (Apple Maps), si hay tiempo.

## Al lanzar

1. Quitar el bloque `X-Robots-Tag = "noindex, nofollow"` de `netlify.toml` (decisión 0010). Hasta entonces el sitio no se indexa, a propósito.
2. Abrir `https://chiquizone.com/robots.txt`, `/sitemap.xml` y `/llms.txt` y confirmar que cargan.
3. Pasar la página de inicio por el [validador de schema.org](https://validator.schema.org/) y por la prueba de resultados enriquecidos de Google.
4. Enviar el mapa en Search Console y Bing, y pedir indexar las siete direcciones.
5. A las dos semanas, revisar en Search Console cuántas páginas están indexadas y qué búsquedas ya traen visitas.

## Cómo medir

- **Search Console, Rendimiento:** búsquedas, páginas, clics y posición. Es la medida principal.
- **Perfil de Negocio, estadísticas:** cómo te encuentran (búsqueda o mapa) y cuántos escriben o llaman.
- **Buscadores de IA, una vez al mes:** hacer la pregunta como la haría un papá ("renta de juegos infantiles para fiestas en San Juan del Río") en ChatGPT, Perplexity y Gemini, y anotar si Chiquizone sale citado. Los cambios en `robots.txt` pueden tardar un día en notarse en ChatGPT.
- **Google Trends:** comparar "playground móvil" contra "juegos infantiles para fiestas" para decidir qué palabras reforzar.

## Qué falta y qué necesito de Sant

- Enlaces reales de Facebook, Instagram, TikTok y del Perfil de Negocio (para `sameAs`).
- Fotos reales del montaje en distintos lugares (jardín, casa, salón) con una descripción de cada una: sirven para las páginas de zona y para Google Imágenes.
- Datos reales para fortalecer las páginas de zona: lugares o fraccionamientos donde ya han montado, y cuánto cuesta el traslado a Tequisquiapan.
- Reseñas verdaderas de clientes, con permiso para mostrarlas.
- Si quiere una guía por escrito ("cómo organizar el primer cumpleaños"), la redactamos con su experiencia real; una guía genérica no aporta.

## Rendimiento

Lighthouse (móvil) en el último build local: SEO 100, accesibilidad 100, prácticas recomendadas 96, rendimiento entre 77 y 80. Lo que más lo baja es la hoja de estilos de Google Fonts, que bloquea el primer pintado. Alojar las tipografías en el propio sitio lo resolvería, pero cambia cómo carga el diseño, así que queda como propuesta para decidir aparte.
