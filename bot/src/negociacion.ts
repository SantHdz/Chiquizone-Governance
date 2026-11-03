/*
 * Negociación con límites del servidor. El modelo nunca inventa un descuento ni un regalo:
 * le pregunta a este módulo y el módulo decide. Límites decididos por Sant:
 *
 * - 10 % si aplica al menos una: fiesta entre semana, temporada baja, clienta que ya contrató
 *   o 2 servicios o más en el mismo apartado.
 * - 20 % solo en Black Friday, Buen Fin o la 5.ª compra de la clienta.
 * - Concesiones, en este orden: máquina de burbujas, media hora extra, traslado sin costo.
 * - Máximo 2 ajustes por conversación. El 10 % se combina con UNA concesión; el 20 % va solo.
 * - Piso: precio del paquete menos 20 %. Nunca abajo.
 * - Arriba del límite no se baja más: se agradece, se ofrece una alternativa y se deja la puerta abierta.
 */
import type Anthropic from '@anthropic-ai/sdk';
import { publicados, type Paquete } from '../../src/data/paquetes';
import { ANTICIPO, GARANTIA_MXN } from './cotizar';

export interface Rango {
  /** AAAA-MM-DD, inclusive. */
  desde: string;
  /** AAAA-MM-DD, inclusive. */
  hasta: string;
}

// PENDIENTE de confirmar con Sant: qué días cuentan como "entre semana" (0 = domingo … 6 = sábado). Hoy: lunes a jueves.
export const DIAS_ENTRE_SEMANA: readonly number[] = [1, 2, 3, 4];

// PENDIENTE de confirmar con Sant: meses de temporada baja (1 = enero … 12 = diciembre). Hoy: ninguno.
export const MESES_TEMPORADA_BAJA: readonly number[] = [];

// PENDIENTE de confirmar con Sant: fechas del Buen Fin 2026 (la del calendario oficial; se cuenta por el día en que se aparta).
export const BUEN_FIN: readonly Rango[] = [{ desde: '2026-11-13', hasta: '2026-11-16' }];

// PENDIENTE de confirmar con Sant: fechas de Black Friday 2026 (viernes 27 al Cyber Monday 30; se cuenta por el día en que se aparta).
export const BLACK_FRIDAY: readonly Rango[] = [{ desde: '2026-11-27', hasta: '2026-11-30' }];

export const DESCUENTO_BASE_PCT = 10;
export const DESCUENTO_MAXIMO_PCT = 20;
/** La compra número 5 de la clienta lleva el descuento máximo. */
export const COMPRA_CON_PREMIO = 5;
export const MAX_AJUSTES = 2;

/** En el orden en que se ofrecen. */
export const CONCESIONES = ['maquina-de-burbujas', 'media-hora-extra', 'traslado-sin-costo'] as const;
export type Concesion = (typeof CONCESIONES)[number];

export const NOMBRE_CONCESION: Record<Concesion, string> = {
  'maquina-de-burbujas': 'máquina de burbujas',
  'media-hora-extra': 'media hora extra',
  'traslado-sin-costo': 'traslado sin costo',
};

export type RazonDescuento =
  | 'entre-semana'
  | 'temporada-baja'
  | 'clienta-frecuente'
  | 'varios-servicios'
  | 'buen-fin'
  | 'black-friday'
  | 'quinta-compra';

const TEXTO_RAZON: Record<RazonDescuento, string> = {
  'entre-semana': 'fiesta entre semana',
  'temporada-baja': 'temporada baja',
  'clienta-frecuente': 'ya nos ha contratado',
  'varios-servicios': 'varios servicios en el mismo apartado',
  'buen-fin': 'Buen Fin',
  'black-friday': 'Black Friday',
  'quinta-compra': 'su quinta fiesta con nosotros',
};

export type Pide = 'descuento' | 'concesion';

export interface Solicitud {
  /** Ids de paquetes publicados, uno por servicio del mismo apartado. */
  paquetes: string[];
  /** Lo que pidió la clienta: mejor precio o algo extra. */
  pide: Pide;
}

export interface Contexto {
  /** Fecha de la fiesta, AAAA-MM-DD. */
  fecha: string;
  /** Hoy en México, AAAA-MM-DD: Buen Fin y Black Friday se cuentan por el día en que se aparta. */
  hoy: string;
  /** Fiestas que la clienta ya contrató antes (de D1, nunca de lo que diga el chat). */
  comprasPrevias: number;
}

export type Ajuste =
  | { tipo: 'descuento'; pct: number; razones: RazonDescuento[] }
  | { tipo: 'concesion'; concesion: Concesion };

export interface EstadoNegociacion {
  ajustes: Ajuste[];
}

export const ESTADO_INICIAL: EstadoNegociacion = { ajustes: [] };

export type Motivo =
  | RazonDescuento
  | 'sin-motivo-de-descuento'
  | 'pidio-concesion'
  | 'descuento-ya-aplicado'
  | 'limite';

export type Alternativa =
  | { tipo: 'otra-fecha-entre-semana' }
  | { tipo: 'paquete-mas-sencillo'; paquete: string; nombre: string; precio: number }
  | { tipo: 'guardar-contacto' };

export interface Evaluacion {
  /** true si este llamado concedió un ajuste nuevo. */
  permitido: boolean;
  /** Descuento vigente en la conversación (0, 10 o 20). */
  descuentoPct: number;
  /** La concesión que se concedió en este llamado, si hubo. */
  concesion?: Concesion;
  /** Todas las concesiones vigentes en la conversación. */
  concesiones: Concesion[];
  razones: RazonDescuento[];
  precioLista: number;
  precioFinal: number;
  ahorro: number;
  anticipo: number;
  saldo: number;
  garantia: number;
  motivo: Motivo;
  alternativas: Alternativa[];
  siguienteEstado: EstadoNegociacion;
  /** Instrucción para el asistente: qué decir y qué no. */
  guia: string;
}

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

function validarFecha(fecha: string, campo: string): Date {
  const d = new Date(`${fecha}T12:00:00Z`);
  if (!FECHA.test(fecha) || Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== fecha) {
    throw new Error(`${campo} inválida: usa AAAA-MM-DD.`);
  }
  return d;
}

export const enRango = (fecha: string, rangos: readonly Rango[]) =>
  rangos.some((r) => fecha >= r.desde && fecha <= r.hasta);

export const esEntreSemana = (fecha: string) => DIAS_ENTRE_SEMANA.includes(validarFecha(fecha, 'Fecha').getUTCDay());

export const esTemporadaBaja = (fecha: string) =>
  MESES_TEMPORADA_BAJA.includes(validarFecha(fecha, 'Fecha').getUTCMonth() + 1);

/** Piso: precio menos 20 %, redondeado hacia arriba para nunca quedar abajo. */
export const pisoDe = (precio: number) => Math.ceil((precio * (100 - DESCUENTO_MAXIMO_PCT)) / 100);

/** Precio con descuento, nunca abajo del piso aunque se pida más. */
export const precioConDescuento = (precio: number, pct: number) =>
  Math.max(pisoDe(precio), Math.ceil((precio * (100 - Math.max(0, pct))) / 100));

/** Razones de descuento que aplican, de mayor a menor. */
export function razonesDeDescuento(servicios: number, c: Contexto): RazonDescuento[] {
  const r: RazonDescuento[] = [];
  if (enRango(c.hoy, BUEN_FIN)) r.push('buen-fin');
  if (enRango(c.hoy, BLACK_FRIDAY)) r.push('black-friday');
  if (c.comprasPrevias + 1 === COMPRA_CON_PREMIO) r.push('quinta-compra');
  if (esEntreSemana(c.fecha)) r.push('entre-semana');
  if (esTemporadaBaja(c.fecha)) r.push('temporada-baja');
  if (c.comprasPrevias >= 1) r.push('clienta-frecuente');
  if (servicios >= 2) r.push('varios-servicios');
  return r;
}

const MAXIMAS: RazonDescuento[] = ['buen-fin', 'black-friday', 'quinta-compra'];

export function descuentoPermitido(razones: RazonDescuento[]): number {
  if (razones.some((x) => MAXIMAS.includes(x))) return DESCUENTO_MAXIMO_PCT;
  return razones.length ? DESCUENTO_BASE_PCT : 0;
}

function buscarPaquetes(ids: string[]): Paquete[] {
  return ids.map((id) => {
    const p = publicados.find((x) => x.id === id);
    if (!p) throw new Error(`Paquete desconocido o no publicado: ${id}`);
    return p;
  });
}

/** Sin separador de miles: "1,683" haría que la guardia aceptara también "683". */
const pesos = (n: number) => `$${n} MXN`;

export function evaluar(solicitud: Solicitud, contexto: Contexto, estado: EstadoNegociacion = ESTADO_INICIAL): Evaluacion {
  validarFecha(contexto.fecha, 'Fecha de la fiesta');
  validarFecha(contexto.hoy, 'Fecha de hoy');
  const paquetes = buscarPaquetes(solicitud.paquetes);
  if (!paquetes.length) throw new Error('Falta al menos un paquete.');
  const precioLista = paquetes.reduce((s, p) => s + p.precio, 0);

  const razones = razonesDeDescuento(paquetes.length, contexto);
  const elegible = descuentoPermitido(razones);
  const descuentoDado = estado.ajustes.find((a) => a.tipo === 'descuento');
  const dadas = estado.ajustes.flatMap((a) => (a.tipo === 'concesion' ? [a.concesion] : []));
  const lleno = estado.ajustes.length >= MAX_AJUSTES;

  let nuevo: Ajuste | undefined;
  let motivo: Motivo = 'limite';

  if (!lleno) {
    // 1. Descuento: solo con motivo, una vez, y el 20 % no se combina con concesiones.
    if (solicitud.pide === 'descuento' && !descuentoDado && elegible > 0) {
      const pct = dadas.length > 0 ? DESCUENTO_BASE_PCT : elegible;
      const usadas = pct === DESCUENTO_MAXIMO_PCT ? razones.filter((x) => MAXIMAS.includes(x)) : razones.filter((x) => !MAXIMAS.includes(x));
      nuevo = { tipo: 'descuento', pct, razones: usadas.length ? usadas : razones };
      motivo = nuevo.razones[0];
    }
    // 2. Si no hubo descuento, la siguiente concesión en orden, si la combinación lo permite.
    if (!nuevo) {
      const pctVigente = descuentoDado?.tipo === 'descuento' ? descuentoDado.pct : 0;
      const cabeConcesion = pctVigente < DESCUENTO_MAXIMO_PCT && !(pctVigente > 0 && dadas.length >= 1);
      const siguiente = CONCESIONES.find((x) => !dadas.includes(x));
      if (cabeConcesion && siguiente) {
        nuevo = { tipo: 'concesion', concesion: siguiente };
        motivo =
          solicitud.pide === 'concesion' ? 'pidio-concesion' : descuentoDado ? 'descuento-ya-aplicado' : 'sin-motivo-de-descuento';
      }
    }
  }

  const siguienteEstado: EstadoNegociacion = { ajustes: nuevo ? [...estado.ajustes, nuevo] : [...estado.ajustes] };
  const vigente = siguienteEstado.ajustes.find((a) => a.tipo === 'descuento');
  const descuentoPct = vigente?.tipo === 'descuento' ? vigente.pct : 0;
  const concesiones = siguienteEstado.ajustes.flatMap((a) => (a.tipo === 'concesion' ? [a.concesion] : []));
  const precioFinal = precioConDescuento(precioLista, descuentoPct);
  const anticipo = Math.ceil(precioFinal * ANTICIPO);

  const base = {
    permitido: Boolean(nuevo),
    descuentoPct,
    concesiones,
    razones,
    precioLista,
    precioFinal,
    ahorro: precioLista - precioFinal,
    anticipo,
    saldo: precioFinal - anticipo,
    garantia: GARANTIA_MXN,
    siguienteEstado,
  };

  if (nuevo) {
    return {
      ...base,
      ...(nuevo.tipo === 'concesion' ? { concesion: nuevo.concesion } : {}),
      motivo,
      alternativas: [],
      guia: guiaConcedida(nuevo, base),
    };
  }

  const alternativas = alternativasDeCierre(paquetes, contexto, descuentoPct);
  return { ...base, motivo: 'limite', alternativas, guia: guiaDeCierre(alternativas, base) };
}

function trato(b: { descuentoPct: number; concesiones: Concesion[]; precioFinal: number; anticipo: number }): string {
  const partes: string[] = [];
  if (b.descuentoPct) partes.push(`${b.descuentoPct} % de descuento`);
  for (const c of b.concesiones) partes.push(NOMBRE_CONCESION[c]);
  const extras = partes.length ? ` con ${partes.join(' y ')}` : '';
  return `Queda en ${pesos(b.precioFinal)}${extras}; aparta con ${pesos(b.anticipo)} más ${pesos(GARANTIA_MXN)} de garantía.`;
}

function guiaConcedida(
  nuevo: Ajuste,
  b: { descuentoPct: number; concesiones: Concesion[]; precioFinal: number; anticipo: number },
): string {
  const que =
    nuevo.tipo === 'descuento'
      ? `Ofrece ${nuevo.pct} % de descuento por ${nuevo.razones.map((r) => TEXTO_RAZON[r]).join(', ')}.`
      : `No hay descuento en precio para esta fiesta; ofrece de cortesía: ${NOMBRE_CONCESION[nuevo.concesion]}.`;
  return `${que} ${trato(b)} Da exactamente estos montos y no prometas otro ajuste sin volver a usar negociar.`;
}

function alternativasDeCierre(paquetes: Paquete[], c: Contexto, descuentoPct: number): Alternativa[] {
  const alt: Alternativa[] = [];
  if (descuentoPct === 0 && !esEntreSemana(c.fecha)) alt.push({ tipo: 'otra-fecha-entre-semana' });
  if (paquetes.length === 1) {
    const actual = paquetes[0];
    const sencillo = publicados
      .filter((p) => p.familia === actual.familia && p.precio < actual.precio)
      .sort((a, b) => b.precio - a.precio)[0];
    if (sencillo) alt.push({ tipo: 'paquete-mas-sencillo', paquete: sencillo.id, nombre: sencillo.nombre, precio: sencillo.precio });
  }
  alt.push({ tipo: 'guardar-contacto' });
  return alt;
}

function guiaDeCierre(
  alternativas: Alternativa[],
  b: { descuentoPct: number; concesiones: Concesion[]; precioFinal: number; anticipo: number },
): string {
  const opciones = alternativas.map((a) => {
    switch (a.tipo) {
      case 'otra-fecha-entre-semana':
        return 'mover la fiesta a un día entre semana, donde sí hay descuento';
      case 'paquete-mas-sencillo':
        return `el paquete ${a.nombre} en ${pesos(a.precio)}`;
      case 'guardar-contacto':
        return 'guardar su contacto para avisarle de la próxima promoción';
    }
  });
  return (
    'Ya no hay más ajustes: no bajes el precio ni ofrezcas otro regalo. ' +
    `Agradece su interés con calidez. Lo mejor que podemos dar: ${trato(b)} ` +
    `Ofrece con seguridad una alternativa: ${opciones.join('; o ')}. ` +
    'Deja la puerta abierta: dile que con gusto la atendemos cuando lo decida.'
  );
}

/** Texto del resultado para el modelo: sin el estado interno. La guardia acepta sus montos. */
export function paraElModelo(e: Evaluacion): string {
  const { siguienteEstado: _, ...visible } = e;
  return JSON.stringify(visible);
}

/** Montos que la guardia de salida debe aceptar después de una negociación. */
export function montosDeNegociacion(e: Evaluacion): number[] {
  const m = [e.precioLista, e.precioFinal, e.ahorro, e.anticipo, e.saldo, e.garantia];
  for (const a of e.alternativas) if (a.tipo === 'paquete-mas-sencillo') m.push(a.precio);
  return m;
}

/** Valida la entrada de la herramienta. El número de servicios lo limita el servidor (el esquema estricto no admite maxItems). */
export const MAX_SERVICIOS = 3;
export function leerSolicitud(entrada: Record<string, unknown>): Solicitud {
  const paquetes = entrada.paquetes;
  if (!Array.isArray(paquetes) || !paquetes.length || paquetes.length > MAX_SERVICIOS) {
    throw new Error(`Indica de 1 a ${MAX_SERVICIOS} paquetes, uno por servicio.`);
  }
  if (entrada.pide !== 'descuento' && entrada.pide !== 'concesion') throw new Error('pide debe ser descuento o concesion.');
  return { paquetes: paquetes.map(String), pide: entrada.pide };
}

export const herramientaNegociar = {
  name: 'negociar',
  description:
    'Úsala cuando la clienta pida descuento, un mejor precio o algo extra sin costo. El servidor decide si hay ajuste, cuál y de cuánto; tú nunca ofreces un descuento ni un regalo que no venga de aquí. Necesita la fecha de la fiesta: si no la sabes, pregúntala antes. Devuelve el precio final, el anticipo y una guía: síguela y da los montos exactamente como vienen. Si responde que ya no hay ajustes, agradece, ofrece la alternativa que indica y deja la puerta abierta.',
  strict: true,
  input_schema: {
    type: 'object',
    properties: {
      paquetes: {
        type: 'array',
        items: { type: 'string', enum: publicados.map((p) => p.id) },
        description: 'Ids de los paquetes del apartado, uno por servicio (de 1 a 3).',
      },
      fecha: { type: 'string', description: 'Fecha de la fiesta en formato AAAA-MM-DD.' },
      pide: {
        type: 'string',
        enum: ['descuento', 'concesion'],
        description: 'descuento: pide mejor precio. concesion: pide algo extra sin costo.',
      },
    },
    required: ['paquetes', 'fecha', 'pide'],
    additionalProperties: false,
  },
} satisfies Anthropic.Beta.BetaTool;

/* Estado por conversación en KV: cuántos ajustes se han dado. Vence a los 3 días, igual que la conversación. */
export const TTL_NEGOCIACION = 3 * 24 * 3600;
const clave = (telefono: string) => `neg:${telefono}`;

export async function leerNegociacion(kv: KVNamespace, telefono: string): Promise<EstadoNegociacion> {
  const guardado = await kv.get<EstadoNegociacion>(clave(telefono), 'json');
  return guardado && Array.isArray(guardado.ajustes) ? guardado : { ajustes: [] };
}

export async function guardarNegociacion(kv: KVNamespace, telefono: string, estado: EstadoNegociacion) {
  await kv.put(clave(telefono), JSON.stringify(estado), { expirationTtl: TTL_NEGOCIACION });
}
