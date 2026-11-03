import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  apartarTentativo,
  confirmarApartado,
  datosDeHerramienta,
  herramientaApartar,
  liberarVencidos,
  HORAS_APARTADO,
  type DatosApartado,
} from '../src/apartado';
import type { EventoGoogle } from '../src/calendario';
import { liberarApartados, type Env } from '../src/index';
import { cotizar } from '../src/cotizar';
import { publicados } from '../../src/data/paquetes';

/** Llave RSA de prueba en PEM (PKCS#8), hecha con WebCrypto para no depender de node:crypto. */
async function llavePem(): Promise<string> {
  const par = (await crypto.subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true,
    ['sign', 'verify'],
  )) as CryptoKeyPair;
  const der = new Uint8Array((await crypto.subtle.exportKey('pkcs8', par.privateKey)) as ArrayBuffer);
  let s = '';
  for (const b of der) s += String.fromCharCode(b);
  return `-----BEGIN PRIVATE KEY-----\n${btoa(s)}\n-----END PRIVATE KEY-----`;
}

interface Llamada {
  metodo: string;
  url: URL;
  cuerpo?: Record<string, unknown>;
}

/** Google Calendar en memoria: token, list (por día o por propiedad privada), insert, get, patch y delete. */
function calendarioFalso() {
  const eventos = new Map<string, EventoGoogle>();
  const llamadas: Llamada[] = [];
  let n = 0;
  /** Se corre justo después de un insert: simula a otra clienta que aparta al mismo tiempo. */
  let alInsertar: (() => void) | undefined;

  const agregar = (e: EventoGoogle) => {
    const id = e.id ?? `ev${++n}`;
    const creado = { status: 'confirmed', created: new Date(Date.UTC(2026, 10, 3, 12, 0, n)).toISOString(), ...e, id };
    eventos.set(id, creado);
    return creado;
  };

  const responder = async (entrada: RequestInfo | URL, init: RequestInit = {}): Promise<Response> => {
    const url = new URL(String(entrada));
    const metodo = init.method ?? 'GET';
    const cuerpo = init.body && typeof init.body === 'string' ? JSON.parse(init.body) : undefined;
    llamadas.push({ metodo, url, cuerpo });
    const json = (x: unknown, status = 200) => new Response(JSON.stringify(x), { status });

    if (url.hostname === 'oauth2.googleapis.com') return json({ access_token: 'token-de-prueba' });
    const [, id] = /\/events(?:\/([^/]+))?$/.exec(url.pathname) ?? [];

    if (!id && metodo === 'GET') {
      const desde = url.searchParams.get('timeMin');
      const propiedad = url.searchParams.get('privateExtendedProperty');
      const items = [...eventos.values()].filter((e) => {
        if (e.status === 'cancelled') return false;
        if (desde) return (e.start?.dateTime ?? e.start?.date ?? '').startsWith(desde.slice(0, 10));
        if (propiedad) {
          const [k, v] = propiedad.split('=');
          return e.extendedProperties?.private?.[k] === v;
        }
        return true;
      });
      return json({ items });
    }
    if (!id && metodo === 'POST') {
      const creado = agregar(cuerpo as EventoGoogle);
      alInsertar?.();
      alInsertar = undefined;
      return json(creado);
    }
    const evento = id ? eventos.get(decodeURIComponent(id)) : undefined;
    if (!evento) return json({ error: 'not found' }, 404);
    if (metodo === 'GET') return json(evento);
    if (metodo === 'PATCH') {
      Object.assign(evento, cuerpo);
      return json(evento);
    }
    if (metodo === 'DELETE') {
      eventos.delete(evento.id!);
      return new Response(null, { status: 204 });
    }
    return json({ error: 'método' }, 405);
  };

  return {
    eventos,
    llamadas,
    agregar,
    fetch: vi.fn(responder),
    despuesDeInsertar(f: () => void) {
      alInsertar = f;
    },
    deCalendario: (metodo: string) => llamadas.filter((l) => l.metodo === metodo && l.url.hostname === 'www.googleapis.com'),
  };
}

let pem = '';
beforeAll(async () => {
  pem = await llavePem();
});

let cal: ReturnType<typeof calendarioFalso>;
const env = () => ({
  GOOGLE_SA_EMAIL: 'asistente@chiquizone-asistente.iam.gserviceaccount.com',
  GOOGLE_SA_KEY: pem,
  GOOGLE_CALENDAR_ID: 'montajes@group.calendar.google.com',
  GOOGLE_SUBJECT: 'hola@chiquizone.com',
});

beforeEach(() => {
  cal = calendarioFalso();
  vi.stubGlobal('fetch', cal.fetch);
});
afterEach(() => {
  vi.unstubAllGlobals();
});

const ahora = new Date('2026-11-03T18:00:00Z');
const datos: DatosApartado = {
  telefono: '5214270000000',
  nombre: 'Ana López',
  fecha: '2026-11-14',
  hora: '10:00',
  municipio: 'San Juan del Río',
  paquete: 'Pro Baby',
  ninos: 12,
  precio: 3000,
  anticipo: 1500,
};

const fiesta = (fecha: string, inicio: string, fin: string, privado?: Record<string, string>): EventoGoogle => ({
  start: { dateTime: `${fecha}T${inicio}:00-06:00` },
  end: { dateTime: `${fecha}T${fin}:00-06:00` },
  ...(privado ? { extendedProperties: { private: privado } } : {}),
});

describe('apartar tentativo', () => {
  it('inserta el evento con la hora de la fiesta, los datos y las propiedades privadas', async () => {
    const r = await apartarTentativo(env(), datos, ahora);
    const vence = new Date(ahora.getTime() + HORAS_APARTADO * 3600_000).toISOString();
    expect(r).toEqual({ ok: true, eventoId: 'ev1', vence });
    expect(vence).toBe('2026-11-04T06:00:00.000Z');

    const [insert] = cal.deCalendario('POST');
    expect(insert.url.pathname).toBe('/calendar/v3/calendars/montajes%40group.calendar.google.com/events');
    expect(insert.cuerpo).toMatchObject({
      summary: 'TENTATIVO · Ana López · Pro Baby',
      start: { dateTime: '2026-11-14T10:00:00-06:00', timeZone: 'America/Mexico_City' },
      end: { dateTime: '2026-11-14T15:00:00-06:00', timeZone: 'America/Mexico_City' },
      extendedProperties: { private: { estado: 'tentativo', vence, telefono: '5214270000000' } },
    });
    const descripcion = String(insert.cuerpo?.description);
    for (const dato of ['+5214270000000', 'San Juan del Río', 'Niños: 12', 'Precio: $3000 MXN', 'Anticipo: $1500 MXN', 'Estado: tentativo']) {
      expect(descripcion).toContain(dato);
    }
  });

  it('revisa la agenda antes de insertar y no aparta un horario ocupado', async () => {
    cal.agregar(fiesta('2026-11-14', '10:00', '15:00'));
    const r = await apartarTentativo(env(), { ...datos, hora: '11:00' }, ahora);
    expect(r).toEqual({ ok: false, motivo: 'choca', alternativas: ['18:00'] });
    expect(cal.deCalendario('POST')).toHaveLength(0);
  });

  it('un día bloqueado no se aparta', async () => {
    cal.agregar({ start: { date: '2026-11-14' }, end: { date: '2026-11-15' } });
    expect(await apartarTentativo(env(), datos, ahora)).toMatchObject({ ok: false, motivo: 'dia-bloqueado' });
  });

  it('si otra clienta apartó antes al mismo tiempo, cede y borra su evento', async () => {
    // Entre la revisión y el insert, otra conversación ya apartó las 10:00 (su evento se creó antes).
    cal.agregar({ ...fiesta('2026-11-14', '10:00', '15:00', { estado: 'tentativo' }), created: '2026-11-03T11:00:00.000Z' });
    cal.eventos.get('ev1')!.status = 'cancelled'; // invisible en la primera lectura
    cal.despuesDeInsertar(() => {
      cal.eventos.get('ev1')!.status = 'confirmed';
    });
    const r = await apartarTentativo(env(), datos, ahora);
    expect(r).toMatchObject({ ok: false, motivo: 'choca' });
    expect(cal.deCalendario('DELETE').map((l) => l.url.pathname.split('/').pop())).toEqual(['ev2']);
    expect([...cal.eventos.keys()]).toEqual(['ev1']);
  });

  it('un apartado tentativo posterior no le quita la fecha al primero', async () => {
    cal.despuesDeInsertar(() => {
      cal.agregar({ ...fiesta('2026-11-14', '10:00', '15:00', { estado: 'tentativo' }), created: '2026-11-03T23:00:00.000Z' });
    });
    expect(await apartarTentativo(env(), datos, ahora)).toMatchObject({ ok: true, eventoId: 'ev1' });
    expect(cal.deCalendario('DELETE')).toHaveLength(0);
  });
});

describe('confirmar apartado', () => {
  it('quita TENTATIVO del título y marca el estado como confirmado', async () => {
    const r = await apartarTentativo(env(), datos, ahora);
    if (!r.ok) throw new Error('debió apartar');
    expect(await confirmarApartado(env(), r.eventoId)).toEqual({ ok: true, telefono: '5214270000000' });

    const [patch] = cal.deCalendario('PATCH');
    expect(patch.cuerpo).toMatchObject({
      summary: 'Ana López · Pro Baby',
      extendedProperties: { private: { estado: 'confirmado', telefono: '5214270000000' } },
    });
    expect(String(patch.cuerpo?.description)).toContain('Estado: confirmado, anticipo recibido.');
    expect(cal.eventos.get(r.eventoId)?.summary).toBe('Ana López · Pro Baby');
  });

  it('avisa si el apartado ya se liberó', async () => {
    expect(await confirmarApartado(env(), 'no-existe')).toEqual({ ok: false, motivo: 'no-existe' });
    expect(cal.deCalendario('PATCH')).toHaveLength(0);
  });
});

describe('liberar vencidos', () => {
  const sembrar = () => {
    cal.agregar(fiesta('2026-11-14', '10:00', '15:00', { estado: 'tentativo', vence: '2026-11-03T17:59:00.000Z', telefono: '521111' }));
    cal.agregar(fiesta('2026-11-15', '10:00', '15:00', { estado: 'tentativo', vence: '2026-11-03T19:00:00.000Z', telefono: '522222' }));
    cal.agregar(fiesta('2026-11-16', '10:00', '15:00', { estado: 'confirmado', vence: '2026-11-01T00:00:00.000Z', telefono: '523333' }));
    cal.agregar(fiesta('2026-11-17', '10:00', '15:00'));
  };

  it('borra solo los tentativos cuyo plazo ya pasó y devuelve a quién avisar', async () => {
    sembrar();
    expect(await liberarVencidos(env(), ahora)).toEqual([{ eventoId: 'ev1', telefono: '521111', fecha: '2026-11-14' }]);
    expect(cal.deCalendario('DELETE').map((l) => l.url.pathname.split('/').pop())).toEqual(['ev1']);
    expect([...cal.eventos.keys()]).toEqual(['ev2', 'ev3', 'ev4']);
    const [lista] = cal.deCalendario('GET');
    expect(lista.url.searchParams.get('privateExtendedProperty')).toBe('estado=tentativo');
  });

  it('ignora los confirmados aunque Google los devuelva en la lista', async () => {
    sembrar();
    // Google filtra por propiedad; si alguna vez no lo hiciera, el código revisa el estado otra vez.
    cal.fetch.mockImplementationOnce(async () => new Response(JSON.stringify({ access_token: 't' })));
    cal.fetch.mockImplementationOnce(async () => new Response(JSON.stringify({ items: [...cal.eventos.values()] })));
    expect((await liberarVencidos(env(), ahora)).map((l) => l.telefono)).toEqual(['521111']);
    expect(cal.eventos.has('ev3')).toBe(true);
  });

  it('el cron marca como liberado en D1 cada apartado que borró', async () => {
    sembrar();
    const consultas: { sql: string; params: unknown[] }[] = [];
    const db = {
      prepare: (sql: string) => ({
        bind: (...params: unknown[]) => ({
          run: async () => {
            consultas.push({ sql, params });
            return { meta: { changes: 1 } };
          },
        }),
      }),
    } as unknown as D1Database;
    const liberados = await liberarApartados({ ...env(), DB: db } as unknown as Env, ahora);
    expect(liberados).toHaveLength(1);
    expect(consultas).toEqual([
      { sql: "UPDATE apartados SET estado = ?2 WHERE evento_id = ?1 AND estado = 'tentativo'", params: ['ev1', 'liberado'] },
    ]);
  });
});

describe('herramienta apartar_fecha', () => {
  it('es estricta y pide los seis datos', () => {
    expect(herramientaApartar.strict).toBe(true);
    expect(herramientaApartar.input_schema.additionalProperties).toBe(false);
    expect(herramientaApartar.input_schema.required).toEqual(['nombre', 'fecha', 'hora_inicio', 'municipio', 'paquete', 'ninos']);
  });

  it('los montos salen de cotizar y el teléfono del webhook, no del modelo', () => {
    const p = publicados[0];
    const d = datosDeHerramienta(
      { nombre: ' Ana ', fecha: '2026-11-14', hora_inicio: '9:30', municipio: 'Tequisquiapan', paquete: p.id, ninos: 10, precio: 1 },
      '5214270000000',
    );
    expect(d).toEqual({
      telefono: '5214270000000',
      nombre: 'Ana',
      fecha: '2026-11-14',
      hora: '09:30',
      municipio: 'Tequisquiapan',
      paquete: p.nombre,
      ninos: 10,
      precio: cotizar(p).precio,
      anticipo: cotizar(p).anticipo,
    });
  });

  it('rechaza municipios fuera de cobertura y paquetes no publicados', () => {
    const base = { nombre: 'Ana', fecha: '2026-11-14', hora_inicio: '10:00', municipio: 'Tequisquiapan', paquete: publicados[0].id, ninos: 10 };
    expect(() => datosDeHerramienta({ ...base, municipio: 'Querétaro' }, '52')).toThrow(/cobertura/);
    expect(() => datosDeHerramienta({ ...base, paquete: 'terreneitor-splash-pro' }, '52')).toThrow(/Paquete/);
    expect(() => datosDeHerramienta({ ...base, ninos: 0 }, '52')).toThrow(/niños/);
  });
});
