/*
 * Worker de Cloudflare que recibe el webhook de WhatsApp y contesta con el asistente.
 *
 * GET  /webhook  verificación de Meta (hub.challenge)
 * POST /webhook  mensajes entrantes; responde 200 de inmediato y procesa en segundo plano
 */
import Anthropic from '@anthropic-ai/sdk';
import { responder } from './asistente';
import { leerDia, type EnvCalendario } from './calendario';
import { enPausa, guardarConversacion, leerConversacion, pausar, yaProcesado } from './memoria';
import { enviarPlantilla, enviarTexto, firmaValida, leerEventos, type EnvWhatsApp, type Evento } from './whatsapp';

export interface Env extends EnvWhatsApp, EnvCalendario {
  ANTHROPIC_API_KEY: string;
  WA_VERIFY_TOKEN: string;
  /** Número personal de Sant para avisos (opcional). */
  AVISOS_WA?: string;
  AVISOS_PLANTILLA?: string;
  CONVERSACIONES: KVNamespace;
}

async function avisarASant(env: Env, telefono: string, motivo: string, resumen: string) {
  await pausar(env.CONVERSACIONES, telefono, motivo);
  if (!env.AVISOS_WA) return;
  await enviarPlantilla(
    env,
    env.AVISOS_WA,
    env.AVISOS_PLANTILLA ?? 'aviso_conversacion',
    `${motivo} · +${telefono} · ${resumen}`,
  );
}

async function procesar(evento: Evento, env: Env) {
  const kv = env.CONVERSACIONES;

  // Sant contestó desde la app: el asistente se hace a un lado en ese chat.
  if (evento.tipo === 'eco') {
    await pausar(kv, evento.para, 'sant-contesto');
    return;
  }
  if (await yaProcesado(kv, evento.id)) return;
  if (await enPausa(kv, evento.de)) return;

  // Fotos, audios y comprobantes de pago los revisa Sant.
  if (evento.tipo === 'no-texto') {
    await enviarTexto(env, evento.de, 'Recibí tu archivo. Se lo paso a Sant para que lo revise y te conteste en breve.');
    await avisarASant(env, evento.de, 'archivo', 'La clienta mandó un archivo (foto, audio o comprobante).');
    return;
  }

  const cliente = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  const historia = await leerConversacion(kv, evento.de);
  const texto = evento.nombre ? `(${evento.nombre}) ${evento.texto}` : evento.texto;

  const r = await responder(cliente, historia, texto, {
    leerDia: (fecha) => leerDia(env, fecha),
    pasarASant: (motivo, resumen) => avisarASant(env, evento.de, motivo, resumen),
  });

  await guardarConversacion(kv, evento.de, r.mensajes);
  if (r.respuesta) await enviarTexto(env, evento.de, r.respuesta);
}

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname !== '/webhook') return new Response('Chiquizone', { status: 404 });

    if (req.method === 'GET') {
      const ok =
        url.searchParams.get('hub.mode') === 'subscribe' &&
        url.searchParams.get('hub.verify_token') === env.WA_VERIFY_TOKEN;
      return ok ? new Response(url.searchParams.get('hub.challenge') ?? '') : new Response('Prohibido', { status: 403 });
    }

    if (req.method === 'POST') {
      const cuerpo = await req.text();
      if (!(await firmaValida(cuerpo, req.headers.get('x-hub-signature-256'), env.WA_APP_SECRET))) {
        return new Response('Firma inválida', { status: 401 });
      }
      for (const evento of leerEventos(JSON.parse(cuerpo))) {
        ctx.waitUntil(procesar(evento, env).catch((e) => console.error('Error al procesar', e)));
      }
      return new Response('ok');
    }

    return new Response('Método no permitido', { status: 405 });
  },
} satisfies ExportedHandler<Env>;
