#!/usr/bin/env node
/*
 * Arma el prompt de imagen con el estilo de Chiquizone fijo, para cualquier generador (Midjourney,
 * DALL·E, Imagen, Firefly, Flux, Leonardo). Tú solo describes la escena; el estilo, la paleta, el hueco
 * para el texto y el prompt negativo salen de identidad/estilo.json.
 *
 *   node scripts/arte/prompt.mjs --escena "corral de colores con brincolín blanco junto a una alberca"
 *   node scripts/arte/prompt.mjs --tipo ilustracion --escena "tres globos y un pastel" --formato historia --hueco arriba
 *   node scripts/arte/prompt.mjs ... --json      (salida en JSON, para Make o cualquier automatización)
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const estilo = JSON.parse(readFileSync(join(raiz, 'identidad/estilo.json'), 'utf8'));

const proporciones = { post: '4:5', cuadrado: '1:1', historia: '9:16' };
const huecos = {
  arriba: 'Deja el tercio superior de la imagen despejado y de tono claro, para poner texto encima.',
  izquierda: 'Deja la mitad izquierda despejada y de tono claro, para poner texto encima.',
  derecha: 'Deja la mitad derecha despejada y de tono claro, para poner texto encima.',
  ninguno: '',
};

export function construirPrompt({ tipo = 'foto', escena, formato = 'post', hueco = 'ninguno' }) {
  if (!escena) throw new Error('Falta --escena: describe qué se ve, no cómo se ve.');
  const ia = estilo.ia;
  const estiloBloque = tipo === 'ilustracion' ? ia.bloque_estilo_ilustracion : ia.bloque_estilo_foto;
  const prompt = [
    `Escena: ${escena.trim().replace(/\.$/, '')}.`,
    estiloBloque,
    tipo === 'foto' ? ia.personas : '',
    huecos[hueco] ?? '',
    'Sin texto ni logotipos en la imagen.',
  ].filter(Boolean).join(' ');
  return { prompt, negativo: ia.negativo, proporcion: proporciones[formato] || '4:5', tipo, formato };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const a = process.argv.slice(2);
  const opt = (n, d) => { const i = a.indexOf(`--${n}`); return i >= 0 ? a[i + 1] : d; };
  try {
    const r = construirPrompt({ tipo: opt('tipo'), escena: opt('escena'), formato: opt('formato'), hueco: opt('hueco') });
    if (a.includes('--json')) console.log(JSON.stringify(r, null, 2));
    else console.log(`${r.prompt}\n\nNEGATIVO: ${r.negativo}\nPROPORCIÓN: ${r.proporcion}  (en Midjourney: --ar ${r.proporcion} --no ${r.negativo.split(', ').slice(0, 12).join(', ')})`);
  } catch (e) { console.error(e.message); process.exit(1); }
}
