import { beforeEach, describe, expect, it, vi } from 'vitest';
import { publicados } from '../../src/data/paquetes';
import { tratoVigente, pisoDe, type EstadoNegociacion } from '../src/negociacion';

const apartarTentativo = vi.fn();
vi.mock('../src/apartado', async (original) => ({
  ...(await original<typeof import('../src/apartado')>()),
  apartarTentativo: (...a: unknown[]) => apartarTentativo(...a),
}));
const { apartar, hoyISO, negociar } = await import('../src/acciones');

function kvFalso() {
  const datos = new Map<string, string>();
  return {
    datos,
    kv: {
      get: async (k: string, tipo?: string) => {
        const v = datos.get(k);
        return v == null ? null : tipo === 'json' ? JSON.parse(v) : v;
      },
      put: async (k: string, v: string) => void datos.set(k, v),
    } as unknown as KVNamespace,
  };
}

function dbFalsa(compras = 0) {
  const insertados: unknown[][] = [];
  const db = {
    prepare: (sql: string) => ({
      bind: (...p: unknown[]) => ({
        first: async () => (sql.includes('COUNT(*)') ? { n: compras } : null),
        run: async () => {
          insertados.push(p);
          return { meta: { last_row_id: 1, changes: 1 } };
        },
      }),
    }),
  } as unknown as D1Database;
  return { db, insertados };
}

const paquete = publicados[0];
const env = (kv: KVNamespace, db: D1Database) => ({
  CONVERSACIONES: kv,
  DB: db,
  GOOGLE_SA_EMAIL: 'x@y',
  GOOGLE_SA_KEY: 'k',
  GOOGLE_CALENDAR_ID: 'c',
});
const entradaApartar = { nombre: 'Ana', fecha: '2026-12-10', hora_inicio: '16:00', municipio: 'Tequisquiapan', paquete: paquete.id, ninos: 12 };

beforeEach(() => {
  apartarTentativo.mockReset();
  apartarTentativo.mockResolvedValue({ ok: true, eventoId: 'ev1', vence: '2026-11-04T05:00:00.000Z' });
});

describe('tratoVigente', () => {
  it('sin negociación queda el precio de lista', () => {
    const t = tratoVigente({ ajustes: [] }, paquete.precio);
    expect(t).toMatchObject({ precio: paquete.precio, anticipo: Math.ceil(paquete.precio / 2), ajustes: '' });
  });

  it('aplica el descuento y lista las cortesías', () => {
    const estado: EstadoNegociacion = {
      ajustes: [{ tipo: 'descuento', pct: 10, razones: ['entre-semana'] }, { tipo: 'concesion', concesion: 'maquina-de-burbujas' }],
    };
    const t = tratoVigente(estado, paquete.precio);
    expect(t.precio).toBe(Math.ceil(paquete.precio * 0.9));
    expect(t.ajustes).toMatch(/^10 % de descuento, /);
  });

  it('un descuento ganado solo por varios servicios no aplica a un solo apartado', () => {
    const estado: EstadoNegociacion = { ajustes: [{ tipo: 'descuento', pct: 10, razones: ['varios-servicios'] }] };
    expect(tratoVigente(estado, paquete.precio).precio).toBe(paquete.precio);
  });

  it('nunca baja del piso', () => {
    const estado: EstadoNegociacion = { ajustes: [{ tipo: 'descuento', pct: 90, razones: ['buen-fin'] }] };
    expect(tratoVigente(estado, paquete.precio).precio).toBe(pisoDe(paquete.precio));
  });
});

describe('negociar en el servidor', () => {
  it('guarda el ajuste en KV y no deja pasar de 2', async () => {
    const { kv, datos } = kvFalso();
    const { db } = dbFalsa();
    const e = env(kv, db);
    const ahora = new Date('2026-11-03T18:00:00Z');
    const entrada = { paquetes: [paquete.id], fecha: '2026-12-10', pide: 'descuento' };
    const r1 = JSON.parse(await negociar(e, '521', entrada, ahora));
    expect(r1.permitido).toBe(true);
    expect(JSON.parse(datos.get('neg:521')!).ajustes).toHaveLength(1);
    await negociar(e, '521', { ...entrada, pide: 'concesion' }, ahora);
    const r3 = JSON.parse(await negociar(e, '521', entrada, ahora));
    expect(r3.permitido).toBe(false);
    expect(r3).not.toHaveProperty('siguienteEstado');
  });

  it('la quinta compra sale de D1', async () => {
    const { kv } = kvFalso();
    const { db } = dbFalsa(4);
    const r = JSON.parse(
      await negociar(env(kv, db), '521', { paquetes: [paquete.id], fecha: '2026-12-12', pide: 'descuento' }, new Date('2026-11-03T18:00:00Z')),
    );
    expect(r.descuentoPct).toBe(20);
  });

  it('hoy se cuenta en México, no en UTC', () => {
    expect(hoyISO(new Date('2026-11-14T03:00:00Z'))).toBe('2026-11-13');
  });
});

describe('apartar en el servidor', () => {
  it('aparta con el precio negociado, guarda en D1 y avisa a Sant', async () => {
    const { kv, datos } = kvFalso();
    datos.set('neg:521', JSON.stringify({ ajustes: [{ tipo: 'descuento', pct: 10, razones: ['entre-semana'] }] }));
    const { db, insertados } = dbFalsa();
    const avisar = vi.fn(async () => {});
    const r = JSON.parse(await apartar(env(kv, db), '521', entradaApartar, avisar));
    const esperado = Math.ceil(paquete.precio * 0.9);
    expect(apartarTentativo.mock.calls[0][1]).toMatchObject({ telefono: '521', precio: esperado, ajustes: '10 % de descuento' });
    expect(r).toMatchObject({ apartado: true, precio: esperado, anticipo: Math.ceil(esperado / 2) });
    expect(insertados[0]).toContain('ev1');
    expect(avisar).toHaveBeenCalledOnce();
  });

  it('suma los complementos a precio de lista y cobra el anticipo sobre el total', async () => {
    const { kv, datos } = kvFalso();
    datos.set('neg:521', JSON.stringify({ ajustes: [{ tipo: 'descuento', pct: 10, razones: ['entre-semana'] }] }));
    const { db } = dbFalsa();
    const r = JSON.parse(
      await apartar(env(kv, db), '521', { ...entradaApartar, paquete: 'baby-baby', complementos: ['bocina'] }, async () => {}),
    );
    const total = Math.ceil(1970 * 0.9) + 250;
    expect(r).toMatchObject({ apartado: true, precio: total, anticipo: Math.ceil(total / 2) });
    expect(apartarTentativo.mock.calls[0][1].complementos).toMatch(/Bocina.*\$250/);
  });

  it('si el horario ya no está libre devuelve alternativas y no guarda ni avisa', async () => {
    apartarTentativo.mockResolvedValue({ ok: false, motivo: 'choca', alternativas: ['18:00'] });
    const { kv } = kvFalso();
    const { db, insertados } = dbFalsa();
    const avisar = vi.fn(async () => {});
    const r = JSON.parse(await apartar(env(kv, db), '521', entradaApartar, avisar));
    expect(r).toEqual({ apartado: false, motivo: 'choca', alternativas: ['18:00'] });
    expect(insertados).toHaveLength(0);
    expect(avisar).not.toHaveBeenCalled();
  });
});
