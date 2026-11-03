/*
 * Lectura y escritura del calendario de montajes en Google Calendar con una cuenta de servicio.
 *
 * Convención: cada fiesta es un evento con la hora de la fiesta (no la del montaje).
 * Un evento de día completo bloquea la fecha (vacaciones, mantenimiento).
 */
import type { Dia, Fiesta } from './agenda';

/** México no tiene horario de verano desde 2022: el centro del país es UTC-6 todo el año. */
export const OFFSET = '-06:00';

export interface EnvCalendario {
  GOOGLE_SA_EMAIL: string;
  /** Llave privada PEM (PKCS#8) de la cuenta de servicio. */
  GOOGLE_SA_KEY: string;
  GOOGLE_CALENDAR_ID: string;
  /**
   * Plan B si Workspace no deja compartir el calendario con la cuenta de servicio:
   * con delegación de todo el dominio, la cuenta actúa en nombre de este usuario (hola@chiquizone.com),
   * solo con el permiso de eventos de Calendar.
   */
  GOOGLE_SUBJECT?: string;
}

/** Solo eventos: leer la agenda y apartar fechas. No puede cambiar ajustes ni compartir calendarios. */
export const ALCANCE = 'https://www.googleapis.com/auth/calendar.events';

/** Datos del JWT que la cuenta de servicio firma para pedir el token. */
export function reclamos(env: EnvCalendario, ahora: number) {
  return {
    iss: env.GOOGLE_SA_EMAIL,
    ...(env.GOOGLE_SUBJECT ? { sub: env.GOOGLE_SUBJECT } : {}),
    scope: ALCANCE,
    aud: 'https://oauth2.googleapis.com/token',
    iat: ahora,
    exp: ahora + 3600,
  };
}

export interface EventoGoogle {
  id?: string;
  status?: string;
  summary?: string;
  description?: string;
  /** Cuándo se creó, en ISO; sirve para desempatar dos apartados al mismo tiempo. */
  created?: string;
  extendedProperties?: { private?: Record<string, string> };
  transparency?: string;
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
}

const b64url = (data: ArrayBuffer | Uint8Array | string) => {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(data);
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

function pemADer(pem: string): ArrayBuffer {
  const base64 = pem.replace(/\\n/g, '\n').replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const bin = atob(base64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}

/** Token OAuth de la cuenta de servicio (JWT firmado con RS256). Se pide uno por operación. */
export async function tokenDeAcceso(env: EnvCalendario): Promise<string> {
  const ahora = Math.floor(Date.now() / 1000);
  const cabecera = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const datos = b64url(JSON.stringify(reclamos(env, ahora)));
  const llave = await crypto.subtle.importKey(
    'pkcs8',
    pemADer(env.GOOGLE_SA_KEY),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const firma = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', llave, new TextEncoder().encode(`${cabecera}.${datos}`));
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${cabecera}.${datos}.${b64url(firma)}`,
    }),
  });
  if (!res.ok) throw new Error(`Google token ${res.status}: ${await res.text()}`);
  return ((await res.json()) as { access_token: string }).access_token;
}

/** Convierte los eventos de un día en fiestas, en minutos desde la medianoche local. */
export function eventosADia(fecha: string, eventos: EventoGoogle[]): Dia {
  const medianoche = Date.parse(`${fecha}T00:00:00${OFFSET}`);
  const dia: Dia = { fiestas: [], bloqueado: false };
  for (const e of eventos) {
    if (e.status === 'cancelled' || e.transparency === 'transparent') continue;
    if (e.start?.date) {
      dia.bloqueado = true;
      continue;
    }
    if (!e.start?.dateTime || !e.end?.dateTime) continue;
    const fiesta: Fiesta = {
      inicio: Math.round((Date.parse(e.start.dateTime) - medianoche) / 60000),
      fin: Math.round((Date.parse(e.end.dateTime) - medianoche) / 60000),
    };
    dia.fiestas.push(fiesta);
  }
  return dia;
}

/** URL de los eventos del calendario de montajes; con `id`, la de un evento. */
export function urlEventos(env: EnvCalendario, id?: string): string {
  const base = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(env.GOOGLE_CALENDAR_ID)}/events`;
  return id ? `${base}/${encodeURIComponent(id)}` : base;
}

/** Eventos de un día tal como los devuelve Google, con id y propiedades privadas. */
export async function eventosDelDia(env: EnvCalendario, fecha: string): Promise<EventoGoogle[]> {
  const token = await tokenDeAcceso(env);
  const params = new URLSearchParams({
    timeMin: `${fecha}T00:00:00${OFFSET}`,
    timeMax: `${fecha}T23:59:59${OFFSET}`,
    singleEvents: 'true',
    orderBy: 'startTime',
  });
  const res = await fetch(`${urlEventos(env)}?${params}`, { headers: { authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Google Calendar ${res.status}: ${await res.text()}`);
  const { items = [] } = (await res.json()) as { items?: EventoGoogle[] };
  return items;
}

export async function leerDia(env: EnvCalendario, fecha: string): Promise<Dia> {
  return eventosADia(fecha, await eventosDelDia(env, fecha));
}
