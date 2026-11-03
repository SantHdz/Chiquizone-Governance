import { describe, expect, it } from 'vitest';
import {
  CONCESIONES,
  ESTADO_INICIAL,
  MAX_AJUSTES,
  evaluar,
  guardarNegociacion,
  herramientaNegociar,
  leerNegociacion,
  leerSolicitud,
  montosDeNegociacion,
  paraElModelo,
  pisoDe,
  precioConDescuento,
  TTL_NEGOCIACION,
  type Contexto,
  type EstadoNegociacion,
  type Solicitud,
} from '../src/negociacion';
import { montosDeHerramientas, montosOficiales, revisarMontos } from '../src/guardia';
import { publicados } from '../../src/data/paquetes';

// Fechas de 2026: 2026-12-05 es sábado, 2026-12-08 es martes. Buen Fin 2026: 13 al 16 de noviembre.
const SABADO = '2026-12-05';
const MARTES = '2026-12-08';
const HOY = '2026-12-01';
const paquete = publicados[0];
const pideDescuento: Solicitud = { paquetes: [paquete.id], pide: 'descuento' };
const pideConcesion: Solicitud = { paquetes: [paquete.id], pide: 'concesion' };
const sinMotivo: Contexto = { fecha: SABADO, hoy: HOY, comprasPrevias: 0 };
const entreSemana: Contexto = { fecha: MARTES, hoy: HOY, comprasPrevias: 0 };

/** Corre varias peticiones seguidas, pasando el estado de una a la siguiente. */
function seguidas(pedidos: Solicitud[], c: Contexto, estado: EstadoNegociacion = ESTADO_INICIAL) {
  return pedidos.map((s) => {
    const r = evaluar(s, c, estado);
    estado = r.siguienteEstado;
    return r;
  });
}

describe('negociación: descuentos', () => {
  it('sin motivo no hay descuento: ofrece la primera concesión al precio de lista', () => {
    const r = evaluar(pideDescuento, sinMotivo);
    expect(r.descuentoPct).toBe(0);
    expect(r.precioFinal).toBe(paquete.precio);
    expect(r.concesion).toBe('maquina-de-burbujas');
    expect(r.motivo).toBe('sin-motivo-de-descuento');
  });

  it('10 % en fiesta entre semana, con anticipo del 50 %', () => {
    const r = evaluar(pideDescuento, entreSemana);
    expect(r.permitido).toBe(true);
    expect(r.descuentoPct).toBe(10);
    expect(r.motivo).toBe('entre-semana');
    expect(r.precioFinal).toBe(Math.ceil(paquete.precio * 0.9));
    expect(r.anticipo).toBe(Math.ceil(r.precioFinal / 2));
    expect(r.anticipo + r.saldo).toBe(r.precioFinal);
  });

  it('10 % a clienta que ya contrató y con 2 servicios', () => {
    expect(evaluar(pideDescuento, { ...sinMotivo, comprasPrevias: 1 }).descuentoPct).toBe(10);
    const dos = evaluar({ paquetes: [paquete.id, paquete.id], pide: 'descuento' }, sinMotivo);
    expect(dos.descuentoPct).toBe(10);
    expect(dos.razones).toContain('varios-servicios');
    expect(dos.precioLista).toBe(paquete.precio * 2);
  });

  it('20 % en Buen Fin (por el día en que se aparta)', () => {
    const r = evaluar(pideDescuento, { ...sinMotivo, hoy: '2026-11-14' });
    expect(r.descuentoPct).toBe(20);
    expect(r.motivo).toBe('buen-fin');
    expect(r.precioFinal).toBe(pisoDe(paquete.precio));
  });

  it('20 % en la quinta compra, 10 % en la sexta', () => {
    expect(evaluar(pideDescuento, { ...sinMotivo, comprasPrevias: 4 }).descuentoPct).toBe(20);
    expect(evaluar(pideDescuento, { ...sinMotivo, comprasPrevias: 4 }).motivo).toBe('quinta-compra');
    expect(evaluar(pideDescuento, { ...sinMotivo, comprasPrevias: 5 }).descuentoPct).toBe(10);
  });

  it('nunca baja del piso (precio menos 20 %)', () => {
    for (const p of publicados) {
      expect(precioConDescuento(p.precio, 50)).toBe(pisoDe(p.precio));
      expect(pisoDe(p.precio)).toBeGreaterThanOrEqual(p.precio * 0.8);
    }
    const [a, b, c] = seguidas([pideDescuento, pideDescuento, pideDescuento], { ...entreSemana, hoy: '2026-11-14' });
    for (const r of [a, b, c]) expect(r.precioFinal).toBeGreaterThanOrEqual(pisoDe(paquete.precio));
  });

  it('el descuento no se acumula: pedir otra vez da una concesión, no más porcentaje', () => {
    const [primero, segundo] = seguidas([pideDescuento, pideDescuento], entreSemana);
    expect(primero.descuentoPct).toBe(10);
    expect(segundo.descuentoPct).toBe(10);
    expect(segundo.concesion).toBe('maquina-de-burbujas');
    expect(segundo.motivo).toBe('descuento-ya-aplicado');
  });
});

describe('negociación: concesiones y combinaciones', () => {
  it('las concesiones salen en orden', () => {
    expect(CONCESIONES).toEqual(['maquina-de-burbujas', 'media-hora-extra', 'traslado-sin-costo']);
    const [a, b] = seguidas([pideConcesion, pideConcesion], sinMotivo);
    expect([a.concesion, b.concesion]).toEqual(['maquina-de-burbujas', 'media-hora-extra']);
    expect(b.concesiones).toEqual(['maquina-de-burbujas', 'media-hora-extra']);
  });

  it(`máximo ${MAX_AJUSTES} ajustes por conversación`, () => {
    const rs = seguidas([pideConcesion, pideConcesion, pideConcesion, pideDescuento], entreSemana);
    expect(rs.map((r) => r.permitido)).toEqual([true, true, false, false]);
    expect(rs[3].siguienteEstado.ajustes).toHaveLength(MAX_AJUSTES);
    expect(rs[3].descuentoPct).toBe(0);
  });

  it('10 % + una concesión sí; nada más después', () => {
    const [d, c, otra] = seguidas([pideDescuento, pideConcesion, pideConcesion], entreSemana);
    expect(d.descuentoPct).toBe(10);
    expect(c.concesion).toBe('maquina-de-burbujas');
    expect(c.descuentoPct).toBe(10);
    expect(otra.permitido).toBe(false);
    expect(otra.concesiones).toEqual(['maquina-de-burbujas']);
  });

  it('una concesión primero y luego el 10 % también cabe', () => {
    const [c, d] = seguidas([pideConcesion, pideDescuento], entreSemana);
    expect(c.concesion).toBe('maquina-de-burbujas');
    expect(d.descuentoPct).toBe(10);
    expect(d.concesiones).toEqual(['maquina-de-burbujas']);
  });

  it('dos concesiones ya no admiten descuento', () => {
    const [, , d] = seguidas([pideConcesion, pideConcesion, pideDescuento], entreSemana);
    expect(d.permitido).toBe(false);
    expect(d.descuentoPct).toBe(0);
  });

  it('el 20 % va solo: no se suma ninguna concesión', () => {
    const [d, c] = seguidas([pideDescuento, pideConcesion], { ...sinMotivo, comprasPrevias: 4 });
    expect(d.descuentoPct).toBe(20);
    expect(c.permitido).toBe(false);
    expect(c.concesiones).toEqual([]);
    expect(c.precioFinal).toBe(pisoDe(paquete.precio));
  });

  it('con una concesión ya dada, el 20 % se vuelve 10 % para no pasar el límite', () => {
    const [, d] = seguidas([pideConcesion, pideDescuento], { ...sinMotivo, hoy: '2026-11-14' });
    expect(d.descuentoPct).toBe(10);
    expect(d.concesiones).toEqual(['maquina-de-burbujas']);
  });
});

describe('negociación: arriba del límite', () => {
  it('agradece, ofrece alternativas y deja la puerta abierta', () => {
    const [, , r] = seguidas([pideConcesion, pideConcesion, pideDescuento], sinMotivo);
    expect(r.permitido).toBe(false);
    expect(r.motivo).toBe('limite');
    expect(r.precioFinal).toBe(paquete.precio);
    expect(r.alternativas.map((a) => a.tipo)).toEqual(['otra-fecha-entre-semana', 'guardar-contacto']);
    expect(r.guia).toMatch(/Agradece/);
    expect(r.guia).toMatch(/no bajes el precio/);
    expect(r.guia).toMatch(/puerta abierta/);
  });

  it('a un paquete Pro le ofrece el paquete más sencillo de su familia', () => {
    const pro = publicados.find((p) => p.pro)!;
    const base = publicados.find((p) => !p.pro && p.familia === pro.familia)!;
    const s: Solicitud = { paquetes: [pro.id], pide: 'descuento' };
    const [, , r] = seguidas([s, s, s], entreSemana);
    expect(r.motivo).toBe('limite');
    expect(r.alternativas).toContainEqual({ tipo: 'paquete-mas-sencillo', paquete: base.id, nombre: base.nombre, precio: base.precio });
    expect(r.alternativas.map((a) => a.tipo)).not.toContain('otra-fecha-entre-semana');
  });
});

describe('negociación: entrada, guardia y memoria', () => {
  it('rechaza paquetes no publicados, fechas inválidas y demasiados servicios', () => {
    expect(() => evaluar({ paquetes: ['terreneitor'], pide: 'descuento' }, sinMotivo)).toThrow(/no publicado/);
    expect(() => evaluar(pideDescuento, { ...sinMotivo, fecha: '2026-02-30' })).toThrow(/inválida/);
    expect(() => leerSolicitud({ paquetes: [], pide: 'descuento' })).toThrow();
    expect(() => leerSolicitud({ paquetes: Array(4).fill(paquete.id), pide: 'descuento' })).toThrow();
    expect(() => leerSolicitud({ paquetes: [paquete.id], pide: 'regalo' })).toThrow();
    expect(leerSolicitud({ paquetes: [paquete.id], pide: 'concesion', fecha: MARTES })).toEqual(pideConcesion);
  });

  it('la herramienta es estricta y solo ofrece paquetes publicados', () => {
    expect(herramientaNegociar.strict).toBe(true);
    expect(herramientaNegociar.input_schema.additionalProperties).toBe(false);
    expect(herramientaNegociar.input_schema.required).toEqual(['paquetes', 'fecha', 'pide']);
    expect(herramientaNegociar.input_schema.properties.paquetes.items.enum).toEqual(publicados.map((p) => p.id));
  });

  it('los montos negociados pasan la guardia y los inventados no', () => {
    const r = evaluar(pideDescuento, entreSemana);
    const texto = paraElModelo(r);
    expect(texto).not.toContain('siguienteEstado');
    const permitidos = new Set([...montosOficiales(), ...montosDeHerramientas([texto])]);
    for (const m of montosDeNegociacion(r)) expect(permitidos.has(m)).toBe(true);
    const fmt = (n: number) => n.toLocaleString('en-US');
    expect(revisarMontos(`Queda en $${fmt(r.precioFinal)} y apartas con $${fmt(r.anticipo)}.`, permitidos).ok).toBe(true);
    expect(revisarMontos('Te lo dejo en $1,000.', permitidos).ok).toBe(false);
    // La guía no usa separador de miles: "1,683" no debe colar "683".
    expect(permitidos.has(r.precioFinal % 1000)).toBe(false);
  });

  it(`guarda el estado en neg:<telefono> por ${TTL_NEGOCIACION / 86400} días`, async () => {
    const datos = new Map<string, { v: string; ttl?: number }>();
    const kv = {
      get: async (k: string, tipo?: string) => {
        const d = datos.get(k);
        return d ? (tipo === 'json' ? JSON.parse(d.v) : d.v) : null;
      },
      put: async (k: string, v: string, o?: { expirationTtl?: number }) => void datos.set(k, { v, ttl: o?.expirationTtl }),
    } as unknown as KVNamespace;
    expect(await leerNegociacion(kv, '521')).toEqual({ ajustes: [] });
    const r = evaluar(pideDescuento, entreSemana, await leerNegociacion(kv, '521'));
    await guardarNegociacion(kv, '521', r.siguienteEstado);
    expect(datos.get('neg:521')?.ttl).toBe(3 * 24 * 3600);
    expect(await leerNegociacion(kv, '521')).toEqual(r.siguienteEstado);
  });
});
