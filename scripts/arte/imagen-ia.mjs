/*
 * Pide a ChatGPT (API de imágenes de OpenAI) la foto o ilustración de una pieza, con el prompt de marca.
 * La IA solo hace la imagen de fondo: el logo, los textos y los colores los pone la plantilla.
 *
 * Necesita la variable OPENAI_API_KEY. Opcionales: OPENAI_IMAGE_MODEL (por defecto gpt-image-1) y
 * OPENAI_IMAGE_QUALITY (low, medium o high; por defecto medium).
 */
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { construirPrompt } from './prompt.mjs';

const tamanos = { post: '1024x1536', historia: '1024x1536', cuadrado: '1024x1024' };

export async function generarImagen({ tipo = 'foto', escena, formato = 'post', hueco, destino }) {
  const clave = process.env.OPENAI_API_KEY;
  if (!clave) throw new Error('Falta OPENAI_API_KEY. Crea una clave en platform.openai.com/api-keys y ponla en tu archivo .env o en la terminal.');
  if (existsSync(destino)) return { archivo: destino, reutilizada: true };

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
      n: 1,
    }),
  });
  const cuerpo = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`OpenAI respondió ${res.status}: ${cuerpo.error?.message || 'sin detalle'}`);
  const b64 = cuerpo.data?.[0]?.b64_json;
  if (!b64) throw new Error('OpenAI no devolvió imagen.');
  mkdirSync(dirname(destino), { recursive: true });
  writeFileSync(destino, Buffer.from(b64, 'base64'));
  return { archivo: destino, reutilizada: false };
}
