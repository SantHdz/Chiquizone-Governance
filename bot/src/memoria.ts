/*
 * Estado por conversación en Cloudflare KV.
 *
 * La historia se guarda completa y solo se le agregan mensajes al final (los modelos actuales
 * rechazan historias editadas). Una conversación inactiva 3 días, o muy larga, empieza de nuevo.
 *
 * Lo único que se quita es el razonamiento del modelo (bloques `thinking`): su firma queda atada al
 * prompt con el que se creó, así que tras cualquier despliegue que cambie el prompt la API rechaza
 * la historia entera. Fuera de la vuelta en curso no hace falta conservarlo.
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
  return sinRazonamiento(guardada);
}

/** Quita los bloques de razonamiento; un turno que solo tenía razonamiento desaparece. */
export function sinRazonamiento(mensajes: Mensaje[]): Mensaje[] {
  const limpios: Mensaje[] = [];
  for (const m of mensajes) {
    if (m.role !== 'assistant' || typeof m.content !== 'object' || !m.content) {
      limpios.push(m);
      continue;
    }
    const content = m.content.filter((b) => b.type !== 'thinking' && b.type !== 'redacted_thinking');
    if (content.length > 0) limpios.push({ role: 'assistant', content });
  }
  return limpios;
}

export async function guardarConversacion(kv: KVNamespace, telefono: string, mensajes: Mensaje[]) {
  await kv.put(`conv:${telefono}`, JSON.stringify(sinRazonamiento(mensajes)), { expirationTtl: TTL_CONVERSACION });
}

/** Mientras haya pausa, el asistente no contesta: la conversación es de Sant. */
/**
 * Un mismo celular de México llega como 521XXXXXXXXXX en los mensajes y puede llegar como
 * 52XXXXXXXXXX en los ecos de la app; la pausa usa siempre la forma corta para que coincidan.
 */
export const clavePausa = (telefono: string) => `pausa:${telefono.replace(/^521(\d{10})$/, '52$1')}`;

export async function pausar(kv: KVNamespace, telefono: string, motivo: string) {
  await kv.put(clavePausa(telefono), motivo, { expirationTtl: TTL_PAUSA });
}

export async function enPausa(kv: KVNamespace, telefono: string): Promise<boolean> {
  return (await kv.get(clavePausa(telefono))) !== null;
}

/** Meta reintenta webhooks; cada mensaje se procesa una sola vez. */
export async function yaProcesado(kv: KVNamespace, idMensaje: string): Promise<boolean> {
  const clave = `msg:${idMensaje}`;
  if ((await kv.get(clave)) !== null) return true;
  await kv.put(clave, '1', { expirationTtl: TTL_PROCESADO });
  return false;
}
