/*
 * Revisa el SEO de lo que Astro ya generó en dist/. Corre en `npm run check` (y por tanto en CI):
 * si una página pierde su título, su canonical, su h1, sus datos estructurados o un enlace interno
 * se rompe, el PR no pasa.
 *
 * Qué comprueba, en cada página indexable:
 *   título (único, 15 a 70 caracteres), descripción (única, 70 a 170), canonical correcto, un solo h1,
 *   lang es-MX, Open Graph y Twitter completos, imágenes con alt y medidas, JSON-LD válido con el negocio,
 *   la página y sus ids sin repetir, y que no lleve noindex.
 * Y en todo el sitio:
 *   cada enlace interno (y su #ancla) existe; sitemap.xml lista exactamente las páginas indexables;
 *   robots.txt apunta al sitemap y no bloquea; llms.txt existe; las páginas con noindex no están en el sitemap.
 *
 * Solo usa Node: no hay dependencias nuevas. Uso: npm run seo (después de npm run build).
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const DIST = 'dist';
const errores = [];
const avisos = [];
const falla = (pagina, msg) => errores.push(`${pagina}: ${msg}`);
const avisa = (pagina, msg) => avisos.push(`${pagina}: ${msg}`);

if (!existsSync(DIST)) {
  console.error('No existe dist/. Corre `npm run build` primero.');
  process.exit(1);
}

const siteUrl = (/url:\s*'(https?:\/\/[^']+)'/.exec(readFileSync('src/data/site.ts', 'utf8')) ?? [])[1];
if (!siteUrl) { console.error('No encontré `url` en src/data/site.ts.'); process.exit(1); }

function archivos(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? archivos(p) : [p];
  });
}
const todos = archivos(DIST);
const htmls = todos.filter((f) => f.endsWith('.html'));

/* "dist/precios/index.html" -> "/precios/" */
const rutaDe = (f) => '/' + relative(DIST, f).split(sep).join('/').replace(/index\.html$/, '');
const esc = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const attr = (tag, nombre) => {
  const m = new RegExp(`\\s${nombre}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i').exec(tag);
  return m ? esc(m[1] ?? m[2]) : undefined;
};
const metas = (html) => [...html.matchAll(/<meta\b[^>]*>/gi)].map((m) => m[0]);
const meta = (html, clave, valor) => {
  const tag = metas(html).find((t) => attr(t, clave) === valor);
  return tag ? attr(tag, 'content') : undefined;
};

const paginas = new Map();
for (const f of htmls) {
  const html = readFileSync(f, 'utf8');
  const ruta = rutaDe(f);
  const robots = meta(html, 'name', 'robots') ?? '';
  paginas.set(ruta, { f, html, ruta, noindex: /noindex/i.test(robots), ids: new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])) });
}
const indexables = [...paginas.values()].filter((p) => !p.noindex);

const titulos = new Map();
const descripciones = new Map();

for (const p of indexables) {
  const { html, ruta } = p;
  const id = ruta;

  /* título */
  const titulosHtml = [...html.matchAll(/<title>([\s\S]*?)<\/title>/gi)];
  if (titulosHtml.length !== 1) falla(id, `debe tener un solo <title> (tiene ${titulosHtml.length})`);
  const titulo = esc((titulosHtml[0]?.[1] ?? '').trim());
  if (titulo.length < 15 || titulo.length > 70) falla(id, `título de ${titulo.length} caracteres (debe tener entre 15 y 70): "${titulo}"`);
  if (titulo.length > 60) avisa(id, `título de ${titulo.length} caracteres: Google puede cortarlo (procura 60 o menos)`);
  if (titulos.has(titulo)) falla(id, `título repetido con ${titulos.get(titulo)}: "${titulo}"`);
  titulos.set(titulo, id);

  /* descripción */
  const desc = meta(html, 'name', 'description');
  if (!desc) falla(id, 'falta <meta name="description">');
  else {
    if (desc.length < 70 || desc.length > 170) falla(id, `descripción de ${desc.length} caracteres (debe tener entre 70 y 170)`);
    if (descripciones.has(desc)) falla(id, `descripción repetida con ${descripciones.get(desc)}`);
    descripciones.set(desc, id);
  }

  /* canonical */
  const canon = [...html.matchAll(/<link\b[^>]*>/gi)].map((m) => m[0]).filter((t) => attr(t, 'rel') === 'canonical');
  if (canon.length !== 1) falla(id, `debe tener un solo canonical (tiene ${canon.length})`);
  const esperado = new URL(ruta, siteUrl).toString();
  const href = canon[0] ? attr(canon[0], 'href') : undefined;
  if (href !== esperado) falla(id, `canonical es "${href}" y debería ser "${esperado}"`);

  /* encabezados */
  const h1 = [...html.matchAll(/<h1\b[\s\S]*?<\/h1>/gi)];
  if (h1.length !== 1) falla(id, `debe tener un solo <h1> (tiene ${h1.length})`);

  /* idioma */
  if (!/<html[^>]*\slang="es-MX"/i.test(html)) falla(id, 'falta lang="es-MX" en <html>');

  /* Open Graph y Twitter */
  for (const [clave, valor] of [['property', 'og:title'], ['property', 'og:description'], ['property', 'og:image'], ['property', 'og:url'], ['property', 'og:site_name'], ['name', 'twitter:card'], ['name', 'twitter:image']]) {
    if (!meta(html, clave, valor)) falla(id, `falta ${valor}`);
  }
  if (meta(html, 'property', 'og:url') !== esperado) falla(id, 'og:url no coincide con el canonical');
  if (!/^https:\/\//.test(meta(html, 'property', 'og:image') ?? '')) falla(id, 'og:image debe ser una dirección absoluta https');
  if (!meta(html, 'property', 'og:image:alt')) falla(id, 'falta og:image:alt');

  /* imágenes */
  for (const m of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag = m[0];
    const alt = attr(tag, 'alt');
    if (alt === undefined || (alt.trim() === '' && attr(tag, 'role') !== 'presentation')) falla(id, `imagen sin alt: ${attr(tag, 'src')}`);
    if (!attr(tag, 'width') || !attr(tag, 'height')) falla(id, `imagen sin width/height (causa saltos de diseño): ${attr(tag, 'src')}`);
  }

  /* datos estructurados */
  const bloques = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
  if (bloques.length === 0) falla(id, 'no tiene datos estructurados (JSON-LD)');
  const nodos = [];
  for (const b of bloques) {
    try {
      const j = JSON.parse(b);
      if (j['@context'] !== 'https://schema.org') falla(id, 'JSON-LD sin @context de schema.org');
      nodos.push(...(j['@graph'] ?? [j]));
    } catch (e) {
      falla(id, `JSON-LD no es JSON válido: ${e.message}`);
    }
  }
  const tipos = (n) => [].concat(n['@type'] ?? []);
  const idsNodos = nodos.map((n) => n['@id']).filter(Boolean);
  const repetidos = idsNodos.filter((x, i) => idsNodos.indexOf(x) !== i);
  if (repetidos.length) falla(id, `ids repetidos en los datos estructurados: ${[...new Set(repetidos)].join(', ')}`);
  const negocio = nodos.find((n) => tipos(n).includes('LocalBusiness'));
  if (!negocio) falla(id, 'falta el nodo LocalBusiness');
  else {
    for (const campo of ['name', 'url', 'telephone', 'address', 'areaServed', 'description']) if (!negocio[campo]) falla(id, `LocalBusiness sin ${campo}`);
    if (negocio.aggregateRating || negocio.review) falla(id, 'hay calificaciones o reseñas en los datos: solo pueden salir de reseñas reales');
  }
  const pag = nodos.find((n) => tipos(n).includes('WebPage'));
  if (!pag) falla(id, 'falta el nodo WebPage');
  else if (pag.url !== esperado) falla(id, `WebPage.url es "${pag.url}" y debería ser "${esperado}"`);
  if (ruta === '/' && !nodos.some((n) => tipos(n).includes('WebSite'))) falla(id, 'el inicio debe tener el nodo WebSite');
  if (ruta !== '/' && !nodos.some((n) => tipos(n).includes('BreadcrumbList'))) falla(id, 'falta BreadcrumbList');
  for (const n of nodos.filter((x) => tipos(x).includes('FAQPage'))) {
    const visible = html.replace(/<script[\s\S]*?<\/script>/gi, '');
    for (const q of n.mainEntity ?? []) if (!visible.includes(esc(q.name).replace(/&/g, '&amp;')) && !visible.includes(q.name)) falla(id, `la pregunta del FAQPage no aparece en la página: "${q.name}"`);
  }

  /* noindex no debe estar en páginas que sí van al sitemap (ya filtradas), y el texto no debe ser delgado */
  const texto = html.replace(/<(script|style|svg)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  const palabras = texto.split(' ').filter((w) => /\p{L}/u.test(w)).length;
  if (ruta !== '/' && palabras < 250) avisa(id, `solo ${palabras} palabras visibles: puede leerse como contenido delgado`);
  p.palabras = palabras;
}

/* enlaces internos y sus anclas */
for (const p of paginas.values()) {
  for (const m of p.html.matchAll(/<a\b[^>]*>/gi)) {
    const href = attr(m[0], 'href');
    if (!href || !href.startsWith('/') || href.startsWith('//')) continue;
    const [sinHash, hash] = href.split('#');
    const [rutaDestino] = sinHash.split('?');
    const destino = rutaDestino === '' ? p.ruta : rutaDestino;
    const existe = paginas.get(destino) ?? paginas.get(destino.endsWith('/') ? destino : destino + '/');
    const esArchivo = existsSync(join(DIST, destino)) && statSync(join(DIST, destino)).isFile();
    if (!existe && !esArchivo) { falla(p.ruta, `enlace roto: ${href}`); continue; }
    if (existe && !destino.endsWith('/') && !esArchivo) avisa(p.ruta, `enlace sin barra final: ${href}`);
    if (hash && existe && !existe.ids.has(hash)) falla(p.ruta, `el ancla #${hash} no existe en ${existe.ruta} (enlace ${href})`);
  }
}

/* sitemap */
const sitemapPath = join(DIST, 'sitemap.xml');
if (!existsSync(sitemapPath)) falla('sitemap.xml', 'no existe');
else {
  const locs = [...readFileSync(sitemapPath, 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const esperadas = indexables.map((p) => new URL(p.ruta, siteUrl).toString());
  for (const u of esperadas) if (!locs.includes(u)) falla('sitemap.xml', `falta ${u}`);
  for (const u of locs) {
    if (!esperadas.includes(u)) falla('sitemap.xml', `lista ${u}, que no es una página indexable del sitio`);
  }
  if (new Set(locs).size !== locs.length) falla('sitemap.xml', 'tiene direcciones repetidas');
}

/* robots.txt y llms.txt */
const robotsPath = join(DIST, 'robots.txt');
if (!existsSync(robotsPath)) falla('robots.txt', 'no existe');
else {
  const r = readFileSync(robotsPath, 'utf8');
  if (!r.includes(`Sitemap: ${new URL('/sitemap.xml', siteUrl)}`)) falla('robots.txt', 'no apunta al sitemap.xml del sitio');
  if (/^\s*Disallow:\s*\/\s*$/im.test(r)) falla('robots.txt', 'tiene "Disallow: /": bloquearía todo el sitio');
  for (const a of ['OAI-SearchBot', 'Claude-SearchBot', 'PerplexityBot', 'Googlebot', 'Bingbot']) if (!r.includes(`User-agent: ${a}`)) falla('robots.txt', `no menciona a ${a}`);
}
const llmsPath = join(DIST, 'llms.txt');
if (!existsSync(llmsPath)) falla('llms.txt', 'no existe');
else if (!readFileSync(llmsPath, 'utf8').startsWith('# ')) falla('llms.txt', 'debe empezar con un título "# Nombre"');

/* resumen */
const lineas = [...paginas.values()].map((p) => `  ${p.noindex ? '·' : '✓'} ${p.ruta}${p.noindex ? ' (noindex)' : ` · ${p.palabras ?? 0} palabras`}`);
console.log(`SEO · ${indexables.length} páginas indexables de ${paginas.size}\n${lineas.join('\n')}`);
for (const a of avisos) console.warn(`  aviso  ${a}`);
if (errores.length) {
  console.error(`\nSEO: ${errores.length} problema(s):`);
  for (const e of errores) console.error(`  ✗ ${e}`);
  process.exit(1);
}
console.log('\nSEO OK');
