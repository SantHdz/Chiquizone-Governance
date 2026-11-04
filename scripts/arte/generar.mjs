#!/usr/bin/env node
/*
 * Genera el arte de Chiquizone en PNG a partir de una lista de piezas (JSON o CSV).
 *
 *   node scripts/arte/generar.mjs identidad/piezas-ejemplo.json
 *   node scripts/arte/generar.mjs piezas.csv --salida arte/salida --solo promo-baby
 *   node scripts/arte/generar.mjs piezas.csv --ia     (pide a ChatGPT la imagen de las piezas con escena)
 *
 * Cada pieza se multiplica por sus temas × formatos × variantes. Las variantes cambian solo lo que el
 * manual permite mover (lado de los globos, giro de la foto, inicio de los banderines, chispas); el
 * resto queda fijo. Antes de dibujar, valida la pieza contra identidad/estilo.json y se detiene si
 * algo se sale de la marca (usa --forzar para dibujar de todos modos y ver el problema).
 *
 * Necesita Playwright: npm i -D playwright && npx playwright install chromium
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname, extname, join } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { render, rng } from './plantillas.mjs';
import { construirPrompt } from './prompt.mjs';
import { generarImagenes } from './imagen-ia.mjs';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const estilo = JSON.parse(readFileSync(join(raiz, 'identidad/estilo.json'), 'utf8'));

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d; };
const conValor = ['--salida', '--solo'];
const entrada = args.find((a, i) => !a.startsWith('--') && !conValor.includes(args[i - 1]));
if (!entrada) {
  console.error('Uso: node scripts/arte/generar.mjs <piezas.json|piezas.csv> [--salida dir] [--solo id] [--forzar]');
  process.exit(1);
}
const salida = resolve(opt('salida', join(raiz, 'arte/salida')));
const solo = opt('solo');
const forzar = args.includes('--forzar');
const conIa = args.includes('--ia');
try { process.loadEnvFile(join(raiz, '.env')); } catch { /* sin .env: se usan las variables de la terminal */ }

/* ---------- Lectura ---------- */
function leerCsv(txt) {
  const filas = []; let fila = [], campo = '', comillas = false;
  for (let i = 0; i < txt.length; i++) {
    const c = txt[i];
    if (comillas) { if (c === '"' && txt[i + 1] === '"') { campo += '"'; i++; } else if (c === '"') comillas = false; else campo += c; }
    else if (c === '"') comillas = true;
    else if (c === ',') { fila.push(campo); campo = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && txt[i + 1] === '\n') i++; fila.push(campo); filas.push(fila); fila = []; campo = ''; }
    else campo += c;
  }
  if (campo || fila.length) { fila.push(campo); filas.push(fila); }
  const [cab, ...resto] = filas.filter((f) => f.some((x) => x.trim()));
  const lista = (s) => (s ? s.split('|').map((x) => x.trim()).filter(Boolean) : undefined);
  return resto.map((f) => {
    const o = Object.fromEntries(cab.map((k, i) => [k.trim(), (f[i] ?? '').trim()]));
    return {
      ...o,
      temas: lista(o.temas), formatos: lista(o.formatos),
      variantes: o.variantes ? Number(o.variantes) : undefined,
      foto_real: /^(si|sí|true|1)$/i.test(o.foto_real || ''),
      paquete: o.paquete_nombre ? {
        nombre: o.paquete_nombre, edad: o.paquete_edad, precio: o.paquete_precio,
        detalle: o.paquete_detalle, incluye: lista(o.paquete_incluye),
      } : undefined,
    };
  });
}
const ruta = resolve(entrada);
const base = dirname(ruta);
const piezas = (extname(ruta) === '.csv' ? leerCsv(readFileSync(ruta, 'utf8')) : JSON.parse(readFileSync(ruta, 'utf8')))
  .filter((p) => !solo || p.id === solo);

/* ---------- Validación contra el manual ---------- */
function validar(p) {
  const errores = [];
  if (!p.id || !/^[a-z0-9-]+$/.test(p.id)) errores.push('id en minúsculas y guiones');
  if (!['foto', 'frase', 'promo'].includes(p.plantilla)) errores.push(`plantilla "${p.plantilla}" no existe (foto, frase, promo)`);
  for (const t of p.temas || []) if (!estilo.temas[t]) errores.push(`tema "${t}" no existe (${Object.keys(estilo.temas).join(', ')})`);
  for (const f of p.formatos || []) if (!estilo.formatos[f]) errores.push(`formato "${f}" no existe (${Object.keys(estilo.formatos).join(', ')})`);
  const titulo = p.titulo || '';
  const cursivas = (titulo.match(/\*[^*]+\*/g) || []).length;
  if (titulo && cursivas !== estilo.reglas_texto.cursivas_por_titulo)
    errores.push(`el título lleva ${cursivas} palabras en cursiva; debe llevar exactamente una, entre *asteriscos*`);
  if (p.plantilla !== 'promo' && !titulo) errores.push('falta el título');
  const largo = titulo.replace(/\*/g, '').length;
  for (const f of p.formatos || ['post']) {
    const max = estilo.reglas_texto.titulo_max_caracteres[f];
    if (max && largo > max) errores.push(`el título mide ${largo} caracteres; en ${f} el máximo es ${max}`);
  }
  if ((p.eyebrow || '').length > estilo.reglas_texto.eyebrow_max_caracteres) errores.push('la etiqueta superior es demasiado larga');
  if (/!!|¡¡/.test(titulo + (p.texto || ''))) errores.push('sin signos de exclamación dobles');
  if (/\p{Extended_Pictographic}/u.test(titulo + (p.texto || '') + (p.eyebrow || ''))) errores.push('sin emojis dentro del arte');
  if (/\b[A-ZÁÉÍÓÚÑ]{4,}\b/.test(titulo.replace(/\*/g, ''))) errores.push('sin palabras en MAYÚSCULAS en el título');
  if (p.foto_real && !p.foto) errores.push('foto_real sin foto');
  if (p.foto_real && p.foto_generada) errores.push('una imagen generada con IA no puede llevar la etiqueta "Montaje real"');
  if (p.foto && !existsSync(resolve(base, p.foto)) && !existsSync(resolve(raiz, p.foto))) errores.push(`no encuentro la foto ${p.foto}`);
  if (p.plantilla === 'promo' && !(p.paquete?.nombre && p.paquete?.precio)) errores.push('la promo necesita paquete.nombre y paquete.precio');
  return errores;
}

/* ---------- Dibujo ---------- */
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { console.error('Falta Playwright. Instálalo con: npm i -D playwright && npx playwright install chromium'); process.exit(1); }

const assets = {
  url: (f) => pathToFileURL(existsSync(resolve(base, f)) ? resolve(base, f) : resolve(raiz, f)).href,
  logo: (n) => pathToFileURL(join(raiz, `identidad/assets/logos/chiquizone-${n}.png`)).href,
};

const hash = (s) => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 7);
const navegador = await chromium.launch();
const manifiesto = [];
let fallas = 0;

for (const pieza of piezas) {
  /* Con --ia, una pieza con escena y sin foto recibe al menos dos opciones de ChatGPT. Se dibuja la pieza
     con cada una para elegir; ninguna se da por buena hasta que pones la elegida en "foto". Las imágenes
     se guardan en arte/fotos-ia/ y se reutilizan para no pagar dos veces; bórralas para pedir otras. */
  let opcionesIa = null;
  if (conIa && pieza.escena && !pieza.foto) {
    try {
      const r = await generarImagenes({ tipo: pieza.escena_tipo || 'foto', escena: pieza.escena, formato: (pieza.formatos || ['post'])[0],
        hueco: pieza.hueco, base: join(raiz, 'arte/fotos-ia', pieza.id), opciones: pieza.opciones_ia });
      opcionesIa = r.archivos;
      pieza.foto = opcionesIa[0];
      pieza.foto_generada = true;
      console.log(`  · ${pieza.id}: ${opcionesIa.length} opciones de ChatGPT (${r.nuevas} nuevas) en arte/fotos-ia/`);
    } catch (e) {
      console.error(`✗ ${pieza.id}: no se pudo generar la imagen con ChatGPT. ${e.message}`);
    }
  }
  const errores = validar(pieza);
  if (errores.length) {
    console.error(`✗ ${pieza.id}:\n  - ${errores.join('\n  - ')}`);
    fallas++;
    if (!forzar) continue;
  }
  const temas = pieza.temas || ['crema'];
  const formatos = pieza.formatos || ['post'];
  const variantes = Math.max(1, Math.min(pieza.variantes || 1, 12));
  const dir = join(salida, pieza.id);
  mkdirSync(dir, { recursive: true });

  const fotos = opcionesIa || [pieza.foto];
  for (const [k, foto] of fotos.entries()) for (const nombreFormato of formatos) for (const nombreTema of temas) for (let v = 1; v <= variantes; v++) {
    pieza.foto = foto;
    const formato = estilo.formatos[nombreFormato];
    const tema = estilo.temas[nombreTema];
    const r = rng(hash(`${pieza.id}|${v}`));
    const html = render({ pieza, tema, formato, nombreFormato, r, assets, fuentes: estilo.tipografia.google_fonts });
    const nombre = `${pieza.id}-${nombreFormato}-${nombreTema}-v${v}${opcionesIa ? `-opcion${k + 1}` : ''}`;
    const archivoHtml = join(dir, `${nombre}.html`);
    writeFileSync(archivoHtml, html);
    const pagina = await navegador.newPage({ viewport: { width: formato.ancho, height: formato.alto } });
    await pagina.goto(pathToFileURL(archivoHtml).href, { waitUntil: 'networkidle' });
    await pagina.evaluate(() => document.fonts.ready);
    await pagina.screenshot({ path: join(dir, `${nombre}.png`) });
    await pagina.close();
    manifiesto.push({ id: pieza.id, archivo: join(pieza.id, `${nombre}.png`), formato: nombreFormato, tema: nombreTema, variante: v,
      ...(opcionesIa && { opcion: k + 1, foto, por_elegir: true }) });
    console.log(`✓ ${nombre}.png`);
  }

  if (opcionesIa) {
    console.log(`  · ${pieza.id}: elige una opción y pon su ruta en "foto" (con foto_generada: true) antes de subirla.`);
    pieza.foto = undefined;
  }

  /* Si la pieza pide una escena y aún no tiene foto, deja listo el prompt para generarla. */
  if (pieza.escena && !pieza.foto) {
    const pr = construirPrompt({ tipo: pieza.escena_tipo || 'foto', escena: pieza.escena, formato: formatos[0], hueco: pieza.hueco });
    writeFileSync(join(dir, 'prompt.txt'), `${pr.prompt}\n\nNEGATIVO: ${pr.negativo}\nPROPORCIÓN: ${pr.proporcion}\n`);
    console.log(`  · ${pieza.id}: prompt de imagen en ${join(pieza.id, 'prompt.txt')}`);
  }
}

await navegador.close();
writeFileSync(join(salida, 'manifiesto.json'), JSON.stringify(manifiesto, null, 2));
console.log(`\n${manifiesto.length} imágenes en ${salida}${fallas ? ` · ${fallas} piezas con errores` : ''}`);
process.exit(fallas && !forzar ? 1 : 0);
