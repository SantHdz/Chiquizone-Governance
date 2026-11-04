/*
 * Apartado tentativo (fase 2): la fecha queda separada en el calendario mientras llega el anticipo.
 *
 * Decisión de Sant (2026-11-03): el apartado dura 12 horas. Si no llega el anticipo del 50 %,
 * el cron de cada 30 minutos (`scheduled` en index.ts) borra el evento y la fecha vuelve a estar libre.
 *
 * El evento es una fiesta normal (con la hora de la fiesta), así que bloquea la agenda igual que una confirmada.
 * Su estado vive en `extendedProperties.private`: estado (tentativo | confirmado), vence (ISO) y telefono.
 */
import type Anthropic from '@anthropic-ai/sdk';
import { aHora, deHora, revisar, REGLAS, type Motivo } from './agenda';
import { eventosADia, eventosDelDia, leerDia, OFFSET, tokenDeAcceso, urlEventos, type EnvCalendario, type EventoGoogle } from './calendario';
import { cotizar, OPCIONES_COMPLEMENTO } from './cotizar';
import { publicados } from '../../src/data/paquetes';
import { site } from '../../src/data/site';

/** Decisión de Sant (2026-11-03): 12 horas para mandar el anticipo. */
export const HORAS_APARTADO = 12;
const PREFIJO = 'TENTATIVO · ';
const ZONA = 'America/Mexico_City';
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

export interface DatosApartado {
  /** wa_id firmado por Meta; nunca lo que escriba la clienta. */
  telefono: string;
  nombre: string;
  /** AAAA-MM-DD */
  fecha: string;
  /** HH:MM, hora de inicio de la fiesta. */
  hora: string;
  municipio: string;
  /** Nombre del paquete, como sale en el evento. */
  paquete: string;
  ninos: number;
  /** Montos calculados en el servidor con cotizar(), nunca por el modelo. */
  precio: number;
  anticipo: number;
  /** Descuento o cortesías que dio negociar, para que Sant los vea en el evento. */
  ajustes?: string;
  /** Complementos cobrados, en texto para el evento: "Bocina con música infantil $250, …". */
  complementos?: string;
}

export type ResultadoApartado =
  | { ok: true; eventoId: string; vence: string }
  | { ok: false; motivo: Motivo; alternativas: string[] };

export interface Liberado {
  eventoId: string;
  telefono: string;
  fecha: string;
}

export const venceLegible = (vence: string) =>
  new Intl.DateTimeFormat('es-MX', { timeZone: ZONA, dateStyle: 'long', timeStyle: 'short' }).format(new Date(vence));

/** Cuerpo del evento para events.insert. */
export function eventoTentativo(d: DatosApartado, vence: string) {
  const inicio = deHora(d.hora);
  return {
    summary: `${PREFIJO}${d.nombre} · ${d.paquete}`,
    description: [
      `Clienta: ${d.nombre}`,
      `WhatsApp: +${d.telefono}`,
      `Municipio: ${d.municipio}`,
      `Niños: ${d.ninos}`,
      `Paquete: ${d.paquete}`,
      ...(d.complementos ? [`Complementos: ${d.complementos}`] : []),
      `Precio: $${d.precio} MXN`,
      `Anticipo: $${d.anticipo} MXN`,
      ...(d.ajustes ? [`Ajustes: ${d.ajustes}`] : []),
      `Estado: tentativo, vence ${venceLegible(vence)}. Si no llega el anticipo, el asistente libera la fecha.`,
    ].join('\n'),
    start: { dateTime: `${d.fecha}T${aHora(inicio)}:00${OFFSET}`, timeZone: ZONA },
    end: { dateTime: `${d.fecha}T${aHora(inicio + REGLAS.fiestaMin)}:00${OFFSET}`, timeZone: ZONA },
    extendedProperties: { private: { estado: 'tentativo', vence, telefono: d.telefono } },
  };
}

async function llamar(token: string, url: string, init: RequestInit = {}): Promise<Response> {
  return fetch(url, {
    ...init,
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
  });
}

async function json<T>(res: Response, que: string): Promise<T> {
  if (!res.ok) throw new Error(`Google Calendar ${que} ${res.status}: ${await res.text()}`);
  return (await res.json()) as T;
}

const orden = (e: EventoGoogle) => `${e.created ?? ''}|${e.id ?? ''}`;

/**
 * Después de insertar se vuelve a leer el día: si otro apartado entró al mismo tiempo,
 * se queda el que se creó primero y el otro cede (los apartados tentativos posteriores no cuentan).
 */
async function revisarDespues(env: EnvCalendario, d: DatosApartado, propio: EventoGoogle) {
  const otros = (await eventosDelDia(env, d.fecha)).filter(
    (e) => e.id !== propio.id && !(e.extendedProperties?.private?.estado === 'tentativo' && orden(e) > orden(propio)),
  );
  return revisar(deHora(d.hora), eventosADia(d.fecha, otros));
}

/** Aparta la fecha 12 horas. Revisa la agenda antes y después de insertar para que nadie más tome el horario. */
export async function apartarTentativo(env: EnvCalendario, d: DatosApartado, ahora = new Date()): Promise<ResultadoApartado> {
  if (!FECHA.test(d.fecha)) throw new Error(`Fecha inválida: ${d.fecha}`);
  const inicio = deHora(d.hora);
  const antes = revisar(inicio, await leerDia(env, d.fecha));
  if (!antes.libre) return { ok: false, motivo: antes.motivo, alternativas: antes.alternativas.map(aHora) };

  const vence = new Date(ahora.getTime() + HORAS_APARTADO * 3600_000).toISOString();
  const token = await tokenDeAcceso(env);
  const creado = await json<EventoGoogle>(
    await llamar(token, urlEventos(env), { method: 'POST', body: JSON.stringify(eventoTentativo(d, vence)) }),
    'insert',
  );
  if (!creado.id) throw new Error('Google Calendar no devolvió el id del evento');

  const despues = await revisarDespues(env, d, creado);
  if (!despues.libre) {
    await borrar(token, env, creado.id);
    return { ok: false, motivo: despues.motivo, alternativas: despues.alternativas.map(aHora) };
  }
  return { ok: true, eventoId: creado.id, vence };
}

async function borrar(token: string, env: EnvCalendario, id: string) {
  const res = await llamar(token, urlEventos(env, id), { method: 'DELETE' });
  // 404 o 410: ya no existe, la fecha ya está libre.
  if (!res.ok && res.status !== 404 && res.status !== 410) {
    throw new Error(`Google Calendar delete ${res.status}: ${await res.text()}`);
  }
}

export type Confirmacion = { ok: true; telefono: string } | { ok: false; motivo: 'no-existe' };

/** Llegó el anticipo: el evento queda confirmado y el cron ya no lo libera. */
export async function confirmarApartado(env: EnvCalendario, eventoId: string): Promise<Confirmacion> {
  const token = await tokenDeAcceso(env);
  const res = await llamar(token, urlEventos(env, eventoId));
  if (res.status === 404 || res.status === 410) return { ok: false, motivo: 'no-existe' };
  const evento = await json<EventoGoogle>(res, 'get');
  if (evento.status === 'cancelled') return { ok: false, motivo: 'no-existe' };

  const privado = evento.extendedProperties?.private ?? {};
  if (privado.estado === 'confirmado') return { ok: true, telefono: privado.telefono ?? '' };
  const cambios = {
    summary: (evento.summary ?? '').replace(PREFIJO, ''),
    description: (evento.description ?? '').replace(/^Estado: .*$/m, 'Estado: confirmado, anticipo recibido.'),
    extendedProperties: { private: { ...privado, estado: 'confirmado' } },
  };
  await json(await llamar(token, urlEventos(env, eventoId), { method: 'PATCH', body: JSON.stringify(cambios) }), 'patch');
  return { ok: true, telefono: privado.telefono ?? '' };
}

/** Borra los apartados tentativos vencidos y devuelve a quién avisar. Los confirmados no se tocan. */
export async function liberarVencidos(env: EnvCalendario, ahora = new Date()): Promise<Liberado[]> {
  const token = await tokenDeAcceso(env);
  const liberados: Liberado[] = [];
  let pagina: string | undefined;
  do {
    const params = new URLSearchParams({ privateExtendedProperty: 'estado=tentativo', singleEvents: 'true', maxResults: '250' });
    if (pagina) params.set('pageToken', pagina);
    const r = await json<{ items?: EventoGoogle[]; nextPageToken?: string }>(
      await llamar(token, `${urlEventos(env)}?${params}`),
      'list',
    );
    for (const e of r.items ?? []) {
      const privado = e.extendedProperties?.private;
      const vence = Date.parse(privado?.vence ?? '');
      if (!e.id || privado?.estado !== 'tentativo' || !(vence <= ahora.getTime())) continue;
      await borrar(token, env, e.id);
      liberados.push({ eventoId: e.id, telefono: privado.telefono ?? '', fecha: (e.start?.dateTime ?? '').slice(0, 10) });
    }
    pagina = r.nextPageToken;
  } while (pagina);
  return liberados;
}

/** Herramienta para el asistente. El teléfono sale del webhook y los montos de cotizar(), no del modelo. */
export const herramientaApartar: Anthropic.Beta.BetaTool = {
  name: 'apartar_fecha',
  description: `Aparta la fecha en la agenda por ${HORAS_APARTADO} horas mientras llega el anticipo del ${site.bookingDepositPct} %. Úsala solo cuando la clienta ya dio nombre, fecha, hora de inicio, municipio, paquete y número de niños, y pidió apartar. Vuelve a revisar la agenda: si el horario ya no está libre, devuelve alternativas.`,
  strict: true,
  input_schema: {
    type: 'object',
    properties: {
      nombre: { type: 'string', description: 'Nombre de quien aparta.' },
      fecha: { type: 'string', description: 'Fecha de la fiesta en formato AAAA-MM-DD.' },
      hora_inicio: { type: 'string', description: 'Hora de inicio de la fiesta en formato HH:MM, 24 horas.' },
      municipio: { type: 'string', enum: [...site.areas], description: 'Municipio de la fiesta.' },
      paquete: { type: 'string', enum: publicados.map((p) => p.id), description: 'Id del paquete que eligió.' },
      ninos: { type: 'integer', description: 'Número aproximado de niños.' },
      complementos: {
        type: 'array',
        items: { type: 'string', enum: OPCIONES_COMPLEMENTO },
        description: 'Los mismos complementos que cotizaste, o lista vacía.',
      },
    },
    required: ['nombre', 'fecha', 'hora_inicio', 'municipio', 'paquete', 'ninos', 'complementos'],
    additionalProperties: false,
  },
};

/** Valida la entrada de apartar_fecha y completa precio y anticipo con cotizar(). Lanza un error legible si algo falta. */
export function datosDeHerramienta(entrada: Record<string, unknown>, telefono: string): DatosApartado {
  const nombre = String(entrada.nombre ?? '').trim().slice(0, 80);
  const fecha = String(entrada.fecha ?? '');
  const hora = aHora(deHora(String(entrada.hora_inicio ?? '')));
  const municipio = String(entrada.municipio ?? '');
  const paquete = publicados.find((p) => p.id === entrada.paquete);
  const ninos = Number(entrada.ninos);
  if (!nombre) throw new Error('Falta el nombre.');
  if (!FECHA.test(fecha)) throw new Error('Fecha inválida: usa AAAA-MM-DD.');
  if (!site.areas.includes(municipio)) throw new Error('Municipio fuera de cobertura: pasa la conversación a Sant.');
  if (!paquete) throw new Error('Paquete no disponible.');
  if (!Number.isInteger(ninos) || ninos < 1) throw new Error('Número de niños inválido.');
  const c = cotizar(paquete);
  return { telefono, nombre, fecha, hora, municipio, paquete: c.nombre, ninos, precio: c.precio, anticipo: c.anticipo };
}
