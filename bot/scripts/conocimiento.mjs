// Compila bot/conocimiento/*.md en src/conocimiento.generado.ts:
// limpia el texto, descarta lo que no está vigente y parte cada archivo en fragmentos por sección (##),
// con metadatos para citar la fuente. Las secciones largas se parten por tamaño con 15 % de superposición.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const carpeta = join(raiz, 'conocimiento');
const MAX = 1200;
const SOLAPE = 0.15;
const REQUERIDOS = ['titulo', 'categoria', 'responsable', 'actualizado', 'vigente'];

const limpiar = (t) => t.replace(/\r/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();

function partir(texto) {
  if (texto.length <= MAX) return [texto];
  const partes = [];
  const paso = Math.floor(MAX * (1 - SOLAPE));
  for (let i = 0; i < texto.length; i += paso) {
    partes.push(texto.slice(i, i + MAX));
    if (i + MAX >= texto.length) break;
  }
  return partes;
}

const fragmentos = [];
for (const archivo of readdirSync(carpeta).filter((f) => f.endsWith('.md') && f !== 'README.md').sort()) {
  const crudo = readFileSync(join(carpeta, archivo), 'utf8');
  const m = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(crudo.replace(/\r/g, ''));
  if (!m) throw new Error(`${archivo}: falta el bloque de metadatos`);
  const meta = Object.fromEntries(m[1].split('\n').map((l) => l.split(/:\s*/, 2).map((s) => s.trim())));
  for (const k of REQUERIDOS) if (!meta[k]) throw new Error(`${archivo}: falta "${k}"`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(meta.actualizado)) throw new Error(`${archivo}: fecha inválida`);
  if (meta.vigente !== 'si') continue;

  const secciones = m[2].split(/^## /m).slice(1);
  for (const s of secciones) {
    const [encabezado, ...resto] = s.split('\n');
    const texto = limpiar(resto.join('\n'));
    if (!texto) continue;
    partir(texto).forEach((t, i, todas) => {
      const base = `${archivo.replace(/\.md$/, '')}#${encabezado.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-')}`;
      fragmentos.push({
        id: todas.length > 1 ? `${base}-${i + 1}` : base,
        archivo,
        titulo: meta.titulo,
        seccion: encabezado.trim(),
        categoria: meta.categoria,
        responsable: meta.responsable,
        actualizado: meta.actualizado,
        texto: t,
      });
    });
  }
}

const salida = `// Generado por scripts/conocimiento.mjs desde conocimiento/*.md. No se edita a mano.
import type { Fragmento } from './conocimiento';

export const fragmentos: Fragmento[] = ${JSON.stringify(fragmentos, null, 2)};
`;
writeFileSync(join(raiz, 'src', 'conocimiento.generado.ts'), salida);
console.log(`${fragmentos.length} fragmentos de conocimiento`);
