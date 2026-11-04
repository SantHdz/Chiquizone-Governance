/*
 * Cotización con los mismos datos que el sitio: src/data/paquetes.ts es la única fuente de precios.
 * La lógica de recomendación es la misma que "Arma tu zona".
 */
import { publicados, familias, incluidoSiempre, type Familia, type Paquete } from '../../src/data/paquetes';
import { site } from '../../src/data/site';
import {
  ahorro,
  calcular,
  comboDe,
  combosPublicados,
  complementosDe,
  complementosPublicados,
  trae,
  type Linea,
  type Seleccion,
} from '../../src/data/complementos';

/** Decisión de Sant (issue #3): anticipo del 50 % y garantía de 500 MXN que se devuelve. */
export const ANTICIPO = site.bookingDepositPct / 100;
export const GARANTIA_MXN = site.guaranteeDeposit;

export interface Preferencias {
  edad: Familia;
  agua: boolean;
  cuidadoras: boolean;
}

export interface Cotizacion {
  id: string;
  nombre: string;
  edades: string;
  precio: number;
  anticipo: number;
  saldo: number;
  garantia: number;
  incluye: string[];
  extras: string[];
  siempre: string[];
}

/** Solo recomienda paquetes publicados. Si ninguno encaja, devuelve null y el asistente pasa a Sant. */
export function recomendar(p: Preferencias): Paquete | null {
  return publicados.find((x) => x.familia === p.edad && x.splash === p.agua && x.pro === p.cuidadoras) ?? null;
}

export function cotizar(paquete: Paquete): Cotizacion {
  const anticipo = Math.ceil(paquete.precio * ANTICIPO);
  return {
    id: paquete.id,
    nombre: paquete.nombre,
    edades: familias[paquete.familia].edades,
    precio: paquete.precio,
    anticipo,
    saldo: paquete.precio - anticipo,
    garantia: GARANTIA_MXN,
    incluye: paquete.incluye,
    extras: paquete.extras ?? [],
    siempre: incluidoSiempre,
  };
}

/* ---------- complementos: misma cuenta que "Arma tu zona" (src/data/complementos.ts) ---------- */

/**
 * Cada cosa que la clienta puede sumar, como un id plano para el esquema estricto de la herramienta:
 * "bocina", "brincolin:grande" (complemento con opción) o "combo:fiesta-completa".
 */
export const OPCIONES_COMPLEMENTO: string[] = [
  ...combosPublicados.map((k) => `combo:${k.id}`),
  ...complementosPublicados.flatMap((c) => (c.opciones ? c.opciones.map((o) => `${c.id}:${o.id}`) : [c.id])),
];

/** Convierte la lista de la herramienta en la selección de calcular(). Ignora ids desconocidos. */
export function seleccionDe(lista: string[]): Seleccion {
  const sel: Seleccion = { extras: [], opciones: {} };
  for (const x of lista) {
    if (!OPCIONES_COMPLEMENTO.includes(x)) continue;
    const [a, b] = x.split(':');
    if (a === 'combo') sel.combo = b;
    else {
      sel.extras.push(a);
      if (b) sel.opciones![a] = b;
    }
  }
  return sel;
}

export interface CotizacionCompleta {
  paquete: string;
  nombre: string;
  precioPaquete: number;
  complementos: Linea[];
  /** Lo que pidió pero ese paquete no ofrece (o ya viene en el combo): no se cobra. */
  noAplican: string[];
  total: number;
  anticipo: number;
  saldo: number;
  garantia: number;
}

/**
 * Total con complementos sobre un precio de paquete dado (el de lista o el negociado).
 * El descuento de negociar aplica solo al paquete; los complementos van a precio de lista.
 */
export function cotizarConComplementos(paqueteId: string, lista: string[], precioPaquete?: number): CotizacionCompleta {
  const p = publicados.find((x) => x.id === paqueteId);
  if (!p) throw new Error(`Paquete no disponible: ${paqueteId}`);
  const cuenta = calcular(p.id, seleccionDe(lista));
  const cobrados = new Set(cuenta.lineas.map((l) => l.id));
  const noAplican = lista.filter((x) => {
    const [a, b] = x.split(':');
    return a === 'combo' ? !cobrados.has(b) : !cobrados.has(a);
  });
  const base = precioPaquete ?? p.precio;
  const total = base + cuenta.lineas.reduce((s, l) => s + l.precio, 0);
  const anticipo = Math.ceil(total * ANTICIPO);
  return {
    paquete: p.id,
    nombre: p.nombre,
    precioPaquete: base,
    complementos: cuenta.lineas,
    noAplican,
    total,
    anticipo,
    saldo: total - anticipo,
    garantia: GARANTIA_MXN,
  };
}

/** Catálogo en texto para el prompt del asistente. Cambia solo cuando cambian paquetes.ts o complementos.ts. */
export function catalogo(): string {
  const paquetesTexto = publicados
    .map((p) => {
      const c = cotizar(p);
      const extras = c.extras.length ? ` Suma: ${c.extras.join(', ')}.` : '';
      return `- ${c.nombre} (${c.edades}${p.splash ? ', con agua' : ''}): $${c.precio} MXN. Incluye: ${c.incluye.join(', ')}.${extras}`;
    })
    .join('\n');
  const extrasTexto = publicados
    .map((p) => {
      const lista = complementosDe(p.id).map((c) =>
        c.opciones
          ? `${c.nombre} (${c.opciones.map((o) => `${o.etiqueta.toLowerCase()} $${o.precio}`).join(', ')})`
          : `${c.nombre} $${c.precio}${c.detalle ? ` (${c.detalle.replace(/\.$/, '')})` : ''}`,
      );
      const k = comboDe(p.id);
      const combo = k ? ` Combo ${k.nombre}: ${trae(k).toLowerCase()} por $${k.precio} (ahorra $${ahorro(k)}).` : '';
      return lista.length ? `- Con ${p.nombre}: ${lista.join('; ')}.${combo}` : '';
    })
    .filter(Boolean)
    .join('\n');
  return extrasTexto ? `${paquetesTexto}\n\nComplementos opcionales (precios en MXN):\n${extrasTexto}` : paquetesTexto;
}

/** Precios oficiales de complementos y combos, para la guardia de salida. */
export function preciosDeComplementos(): number[] {
  return [
    ...complementosPublicados.flatMap((c) => (c.opciones ? c.opciones.map((o) => o.precio) : [c.precio!])),
    ...combosPublicados.flatMap((k) => [k.precio, ahorro(k)]),
  ];
}
