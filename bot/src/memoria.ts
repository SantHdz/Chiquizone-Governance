/*
 * Estado por conversación en Cloudflare KV.
 *
 * La historia se guarda completa y solo se le agregan mensajes al final (los modelos actuales
 * rechazan historias editadas). Una conversación inactiva 3 días, o muy larga, empieza de nuevo.
 */
import type Anthropic from '@anthropic-ai/sdk';

type Mensaje = Anthropic.Beta.BetaMessageParam;

const TTL_CONVERSACION = 3 * 24 * 3600;
const TTL_PAUSA = 12 * 3600;
const TTL_PROCESADO = 24 * 3600;
export const MAX_MENSAJES = 80;

export async function leerConversacion(kv: KVNamespace, telefono: string): Promise<Mensaje[]> {
  const guardada = await kv.get<Mensaje[]>(`conv:${telefono}`, 'json');
  if (!guardada || guardada.length > MAX_MENSAJES) return [];
  return guardada;
}

export async function guardarConversacion(kv: KVNamespace, telefono: string, mensajes: Mensaje[]) {
  await kv.put(`conv:${telefono}`, JSON.stringify(mensajes), { expirationTtl: TTL_CONVERSACION });
}

/** Mientras haya pausa, el asistente no contesta: la conversación es de Sant. */
export async function pausar(kv: KVNamespace, telefono: string, motivo: string) {
  await kv.put(`pausa:${telefono}`, motivo, { expirationTtl: TTL_PAUSA });
}

export async function enPausa(kv: KVNamespace, telefono: string): Promise<boolean> {
  return (await kv.get(`pausa:${telefono}`)) !== null;
}

/** Meta reintenta webhooks; cada mensaje se procesa una sola vez. */
export async function yaProcesado(kv: KVNamespace, idMensaje: string): Promise<boolean> {
  const clave = `msg:${idMensaje}`;
  if ((await kv.get(clave)) !== null) return true;
  await kv.put(clave, '1', { expirationTtl: TTL_PROCESADO });
  return false;
}
