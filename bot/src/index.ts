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
import { conFuentes, fragmentos, type Fragmento } from './conocimiento';
import { buscar, modoDe, type EnvBusqueda } from './busqueda';
import { rutaAdmin, type EnvAdmin } from './admin';
import { identificar, registrar } from './db';
import { montosDeHerramientas, montosOficiales, revisarMontos } from './guardia';
import { dentroDelLimite } from './limite';

/** Transparencia: la primera vez se aclara que es un asistente de IA. */
export const AVISO_IA =
  'Hola, soy el asistente virtual de Chiquizone, con inteligencia artificial. Te ayudo a elegir tu zona y revisar tu fecha; si prefieres, te paso con Sant en cualquier momento.';

export interface Env extends EnvWhatsApp, EnvCalendario, EnvBusqueda, EnvAdmin {
  WA_VERIFY_TOKEN: string;
  /** Número personal de Sant para avisos (opcional). */
  AVISOS_WA?: string;
  AVISOS_PLANTILLA?: string;
  CONVERSACIONES: KVNamespace;
  DB: D1Database;
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

  if (!(await dentroDelLimite(kv, evento.de))) return;

  const inicio = Date.now();
  const clienta = await identificar(env.DB, evento.de, evento.nombre);
  const historia = await leerConversacion(kv, evento.de);
  const texto = clienta.nombre ? `(${clienta.nombre}) ${evento.texto}` : evento.texto;

  // Interruptor del conocimiento: "completo" manda todo en el prompt; "busqueda" solo lo que encuentra.
  const modo = modoDe(env);
  let fuentes: Fragmento[] | undefined;
  if (modo === 'busqueda' && env.AI && env.VECTORIZE) {
    fuentes = await buscar({ AI: env.AI, VECTORIZE: env.VECTORIZE }, evento.texto).catch((e) => {
      console.error('Búsqueda no disponible, mando todo el conocimiento', e);
      return fragmentos;
    });
  }

  const r = await responder(
    new Anthropic({ apiKey: env.ANTHROPIC_API_KEY }),
    historia,
    texto,
    {
      leerDia: (fecha) => leerDia(env, fecha),
      pasarASant: (motivo, resumen) => avisarASant(env, evento.de, motivo, resumen),
    },
    { fuentes },
  );
  await guardarConversacion(kv, evento.de, r.mensajes);

  // Guardia de salida: un monto que no salió del servidor no se envía.
  const permitidos = new Set([...montosOficiales(), ...montosDeHerramientas(r.resultados)]);
  const revision = revisarMontos(r.respuesta, permitidos);
  let { texto: respuesta, usadas } = conFuentes(r.respuesta);
  let bloqueado: string | undefined;
  if (!revision.ok) {
    bloqueado = `montos no oficiales: ${revision.noPermitidos.join(', ')}`;
    respuesta = 'Déjame confirmar ese dato con Sant y te escribe en breve.';
    usadas = [];
    await avisarASant(env, evento.de, 'revision', `La guardia frenó una respuesta con ${bloqueado}.`);
  }
  if (historia.length === 0) respuesta = `${AVISO_IA}\n\n${respuesta}`;

  if (respuesta) await enviarTexto(env, evento.de, respuesta);
  await registrar(env.DB, {
    telefono: evento.de,
    pregunta: evento.texto,
    respuesta,
    herramientas: r.herramientas,
    fuentes: usadas.map((f) => f.id),
    pasoASant: r.pasoASant || Boolean(bloqueado),
    bloqueado,
    latenciaMs: Date.now() - inicio,
    tokensEntrada: r.tokensEntrada,
    tokensSalida: r.tokensSalida,
    modo,
    encontradas: fuentes?.map((f) => f.id),
  });
}

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname.startsWith('/admin/')) return rutaAdmin(req, env, url.pathname);
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
