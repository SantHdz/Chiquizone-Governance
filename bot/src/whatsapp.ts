/*
 * WhatsApp Cloud API: firma del webhook, lectura de mensajes y envío de respuestas.
 * El número usa coexistencia: Sant sigue contestando y recibiendo llamadas en la app.
 */

export interface EnvWhatsApp {
  WA_TOKEN: string;
  WA_PHONE_NUMBER_ID: string;
  WA_APP_SECRET: string;
  GRAPH_VERSION: string;
}

export type Evento =
  | { tipo: 'mensaje'; id: string; de: string; nombre?: string; texto: string }
  | { tipo: 'no-texto'; id: string; de: string }
  /** Mensaje que Sant mandó desde la app del celular (coexistencia). */
  | { tipo: 'eco'; para: string };

const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

/** Meta firma cada webhook con HMAC-SHA256 del cuerpo y el secreto de la app. */
export async function firmaValida(cuerpo: string, cabecera: string | null, secreto: string): Promise<boolean> {
  if (!cabecera?.startsWith('sha256=')) return false;
  const llave = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secreto),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const esperada = `sha256=${hex(await crypto.subtle.sign('HMAC', llave, new TextEncoder().encode(cuerpo)))}`;
  if (esperada.length !== cabecera.length) return false;
  let diff = 0;
  for (let i = 0; i < esperada.length; i++) diff |= esperada.charCodeAt(i) ^ cabecera.charCodeAt(i);
  return diff === 0;
}

interface Payload {
  entry?: {
    changes?: {
      field?: string;
      value?: {
        contacts?: { wa_id?: string; profile?: { name?: string } }[];
        messages?: { id: string; from: string; type: string; text?: { body?: string } }[];
        message_echoes?: { to?: string }[];
      };
    }[];
  }[];
}

export function leerEventos(payload: Payload): Evento[] {
  const eventos: Evento[] = [];
  for (const entrada of payload.entry ?? []) {
    for (const cambio of entrada.changes ?? []) {
      const v = cambio.value ?? {};
      if (cambio.field === 'smb_message_echoes') {
        for (const eco of v.message_echoes ?? []) if (eco.to) eventos.push({ tipo: 'eco', para: eco.to });
        continue;
      }
      if (cambio.field !== 'messages') continue;
      for (const m of v.messages ?? []) {
        const nombre = v.contacts?.find((c) => c.wa_id === m.from)?.profile?.name;
        if (m.type === 'text' && m.text?.body) {
          eventos.push({ tipo: 'mensaje', id: m.id, de: m.from, nombre, texto: m.text.body });
        } else {
          eventos.push({ tipo: 'no-texto', id: m.id, de: m.from });
        }
      }
    }
  }
  return eventos;
}

/**
 * WhatsApp entrega los números móviles de México como 521XXXXXXXXXX, pero para enviarles hay
 * que usar 52XXXXXXXXXX (así quedan registrados en la lista de destinatarios de prueba).
 */
export function destinoWhatsApp(waId: string): string {
  return waId.replace(/^521(\d{10})$/, '52$1');
}

/** WhatsApp rechaza parámetros de plantilla con saltos de línea, tabuladores o 4+ espacios seguidos. */
export function parametroDePlantilla(texto: string): string {
  return texto
    .replace(/\s*[\r\n\t]+\s*/g, ' · ')
    .replace(/ {2,}/g, ' ')
    .trim()
    .slice(0, 1000);
}

export async function enviarTexto(env: EnvWhatsApp, para: string, texto: string): Promise<void> {
  const res = await fetch(`https://graph.facebook.com/${env.GRAPH_VERSION}/${env.WA_PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: { authorization: `Bearer ${env.WA_TOKEN}`, 'content-type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to: destinoWhatsApp(para), type: 'text', text: { body: texto } }),
  });
  if (!res.ok) throw new Error(`WhatsApp ${res.status}: ${await res.text()}`);
}

/**
 * Aviso a un número personal fuera de la ventana de 24 h: WhatsApp exige una plantilla aprobada.
 * La plantilla lleva un solo parámetro en el cuerpo: el resumen de la conversación.
 */
export async function enviarPlantilla(
  env: EnvWhatsApp,
  para: string,
  plantilla: string,
  parametro: string,
): Promise<void> {
  const res = await fetch(`https://graph.facebook.com/${env.GRAPH_VERSION}/${env.WA_PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: { authorization: `Bearer ${env.WA_TOKEN}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: destinoWhatsApp(para),
      type: 'template',
      template: {
        name: plantilla,
        language: { code: 'es_MX' },
        components: [{ type: 'body', parameters: [{ type: 'text', text: parametroDePlantilla(parametro) }] }],
      },
    }),
  });
  if (!res.ok) throw new Error(`WhatsApp plantilla ${res.status}: ${await res.text()}`);
}
