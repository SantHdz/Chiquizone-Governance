/*
 * Pide a ChatGPT (API de imágenes de OpenAI) la foto o ilustración de una pieza, con el prompt de marca.
 * La IA solo hace la imagen de fondo: el logo, los textos y los colores los pone la plantilla.
 *
 * Necesita la variable OPENAI_API_KEY. Opcionales: OPENAI_IMAGE_MODEL (por defecto gpt-image-1) y
 * OPENAI_IMAGE_QUALITY (low, medium o high; por defecto medium).
 *
 * Siempre pide al menos dos opciones por escena, para elegir antes de publicar.
 */
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { construirPrompt } from './prompt.mjs';

const tamanos = { post: '1024x1536', historia: '1024x1536', cuadrado: '1024x1024' };

export const MIN_OPCIONES = 2;

/* Devuelve las rutas <base>-1.png, <base>-2.png… Las que ya existen se reutilizan y solo se piden las que faltan. */
export async function generarImagenes({ tipo = 'foto', escena, formato = 'post', hueco, base, opciones = MIN_OPCIONES }) {
  const n = Math.max(MIN_OPCIONES, Math.min(Number(opciones) || MIN_OPCIONES, 4));
  const archivos = Array.from({ length: n }, (_, i) => `${base}-${i + 1}.png`);
  const faltan = archivos.filter((a) => !existsSync(a));
  if (!faltan.length) return { archivos, nuevas: 0 };
  const clave = process.env.OPENAI_API_KEY;
  if (!clave) throw new Error('Falta OPENAI_API_KEY. Crea una clave en platform.openai.com/api-keys y ponla en tu archivo .env o en la terminal.');

  const { prompt, negativo } = construirPrompt({ tipo, escena, formato, hueco });
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { Authorization: `Bearer ${clave}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1',
      // La API no tiene prompt negativo: va como instrucción al final.
      prompt: `${prompt}\n\nEvita por completo: ${negativo}.`,
      size: tamanos[formato] || '1024x1536',
      quality: process.env.OPENAI_IMAGE_QUALITY || 'medium',
      n: faltan.length,
    }),
  });
  const cuerpo = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`OpenAI respondió ${res.status}: ${cuerpo.error?.message || 'sin detalle'}`);
  const datos = (cuerpo.data || []).map((d) => d.b64_json).filter(Boolean);
  if (!datos.length) throw new Error('OpenAI no devolvió imágenes.');
  mkdirSync(dirname(base), { recursive: true });
  faltan.forEach((a, i) => { if (datos[i]) writeFileSync(a, Buffer.from(datos[i], 'base64')); });
  return { archivos: archivos.filter((a) => existsSync(a)), nuevas: Math.min(datos.length, faltan.length) };
}
