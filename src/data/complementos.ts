/*
 * Complementos de Chiquizone: lo que el cliente suma a su paquete en "Arma tu zona".
 * Precios y reglas: documento "Precios de Baby baby y extras", aprobado por Sant el 3 nov 2026.
 *
 * Para cambiar un precio, quitar un complemento o decidir en qué paquete se ofrece, edita solo este archivo:
 * el paso "¿Quieres sumar algo?", el total y el mensaje de WhatsApp se arman con estos datos.
 * El apartado (50 %) se calcula sobre el total con complementos; la garantía de $500 no cambia (site.ts).
 */
import { paquetes, publicados } from './paquetes';
import { site } from './site';

/** Una variante con su propio precio, por ejemplo el tamaño del brincolín. */
export interface Opcion {
  id: string;
  /** Lo que se lee junto al botón: "Mediano". */
  etiqueta: string;
  /** Cómo aparece en el resumen y en el mensaje de WhatsApp: "Brincolín mediano". */
  nombre: string;
  precio: number;
}

export interface Complemento {
  id: string;
  nombre: string;
  /** Nombre corto para listas: "Bocina". Si falta, se usa `nombre`. */
  corto?: string;
  /** Archivo de `src/icons/` (sin .svg). */
  icono: string;
  /** Precio fijo. Si el complemento tiene `opciones`, el precio sale de la opción elegida. */
  precio?: number;
  opciones?: Opcion[];
  /** Una línea de ayuda visible en la tarjeta. */
  detalle?: string;
  /** Ids de los paquetes donde se ofrece. Donde el paquete ya lo trae, no se ofrece. */
  paquetes: string[];
  /** Se puede contratar hoy. Lo que no, no se muestra ni se suma. */
  disponible: boolean;
}

/** Varios complementos a menor precio que sueltos. Cada paquete puede tener el suyo. */
export interface Combo {
  id: string;
  nombre: string;
  /** Ids de complementos con precio fijo. */
  incluye: string[];
  precio: number;
  paquetes: string[];
  disponible: boolean;
}

const ambos = ['baby-baby', 'pro-baby'];
const soloBabyBaby = ['baby-baby'];

export const complementos: Complemento[] = [
  { id: 'bocina', nombre: 'Bocina con música infantil', corto: 'Bocina', icono: 'bocina', precio: 250, paquetes: ambos, disponible: true },
  // Pro Baby ya trae la máquina de burbujas y la montaña rusa: ahí no se ofrecen.
  { id: 'burbujas', nombre: 'Máquina de burbujas', corto: 'Burbujas', icono: 'burbujas', precio: 300, detalle: '5 horas, líquido incluido.', paquetes: soloBabyBaby, disponible: true },
  { id: 'letrero', nombre: 'Letrero con el nombre', corto: 'Letrero', icono: 'letrero', precio: 350, detalle: 'Dinos el nombre 3 días antes.', paquetes: ambos, disponible: true },
  { id: 'picnic', nombre: 'Picnic Chiqui, 2 mesitas', icono: 'picnic', precio: 250, paquetes: ambos, disponible: true },
  { id: 'montana-rusa', nombre: 'Montaña rusa', icono: 'montana-rusa', precio: 400, detalle: 'Para niños de 2 años o más.', paquetes: soloBabyBaby, disponible: true },
  {
    id: 'brincolin', nombre: 'Brincolín para los grandes', icono: 'brincolin', paquetes: ambos, disponible: true,
    // TODO: confirmar con Sant el espacio del grande; el documento solo dice "más espacio".
    detalle: 'Pide 3 × 3 m más de espacio y un enchufe aparte.',
    opciones: [
      { id: 'mediano', etiqueta: 'Mediano', nombre: 'Brincolín mediano', precio: 550 },
      { id: 'grande', etiqueta: 'Grande', nombre: 'Brincolín grande', precio: 750 },
    ],
  },
  {
    id: 'hora-extra', nombre: 'Hora extra', icono: 'hora-extra', paquetes: ambos, disponible: true,
    opciones: [
      { id: 'sola', etiqueta: 'Sin cuidadora', nombre: 'Hora extra', precio: 400 },
      { id: 'con-cuidadora', etiqueta: 'Con cuidadora', nombre: 'Hora extra con cuidadora', precio: 600 },
    ],
  },
  // Sant la llama "nana"; el sitio dice "cuidadora" en todo lo demás.
  { id: 'cuidadora-extra', nombre: 'Cuidadora extra, 5 h', icono: 'cuidado', precio: 1000, paquetes: soloBabyBaby, disponible: true },
];

export const combos: Combo[] = [
  // Sueltos suman $900; Pro no lleva burbujas porque ya las trae.
  { id: 'fiesta-completa', nombre: 'Fiesta completa', incluye: ['bocina', 'burbujas', 'letrero'], precio: 750, paquetes: soloBabyBaby, disponible: true },
  { id: 'fiesta-completa-pro', nombre: 'Fiesta completa', incluye: ['bocina', 'letrero'], precio: 500, paquetes: ['pro-baby'], disponible: true },
];

/* ---------- validación: falla al compilar, no frente al cliente ---------- */
const norm = (s: string) => s.trim().toLowerCase();
const ids = new Set<string>();
for (const c of complementos) {
  if (ids.has(c.id)) throw new Error(`Complementos: id repetido "${c.id}".`);
  ids.add(c.id);
  if ((c.precio === undefined) === (c.opciones === undefined)) {
    throw new Error(`Complementos: "${c.id}" necesita un precio o sus opciones, no las dos cosas ni ninguna.`);
  }
  for (const pid of c.paquetes) {
    const p = paquetes.find((x) => x.id === pid);
    if (!p) throw new Error(`Complementos: "${c.id}" apunta al paquete "${pid}", que no existe en paquetes.ts.`);
    const yaTrae = [...p.incluye, ...(p.extras ?? [])].some((x) => norm(x) === norm(c.nombre));
    if (yaTrae) throw new Error(`Complementos: ${p.nombre} ya trae "${c.nombre}"; quítalo de "paquetes" en complementos.ts.`);
  }
}
for (const k of combos) {
  for (const pid of k.paquetes) {
    if (!paquetes.some((x) => x.id === pid)) throw new Error(`Combo "${k.id}": el paquete "${pid}" no existe en paquetes.ts.`);
    for (const cid of k.incluye) {
      const c = complementos.find((x) => x.id === cid);
      if (!c || c.precio === undefined) throw new Error(`Combo "${k.id}": "${cid}" no existe o tiene opciones.`);
      if (!c.paquetes.includes(pid)) throw new Error(`Combo "${k.id}": "${cid}" no se ofrece en "${pid}".`);
    }
  }
}

/* ---------- lo que se muestra hoy ---------- */
const publicadoEn = (lista: string[]) => lista.some((id) => publicados.some((p) => p.id === id));
export const complementosPublicados = complementos.filter((c) => c.disponible && publicadoEn(c.paquetes));
export const combosPublicados = combos.filter((k) => k.disponible && publicadoEn(k.paquetes));
/** Si no hay nada que ofrecer, "Arma tu zona" no muestra el paso. */
export const hayComplementos = complementosPublicados.length > 0;

export const complementoPorId = (id: string) => complementos.find((c) => c.id === id);
export const comboDe = (paqueteId: string) => combosPublicados.find((k) => k.paquetes.includes(paqueteId));
export const complementosDe = (paqueteId: string) => complementosPublicados.filter((c) => c.paquetes.includes(paqueteId));

/** Qué trae el combo, en una frase: "Bocina, burbujas y letrero". */
export const trae = (k: Combo) => {
  const n = k.incluye.map((id) => {
    const c = complementoPorId(id)!;
    return (c.corto ?? c.nombre).toLowerCase();
  });
  const frase = n.length > 1 ? `${n.slice(0, -1).join(', ')} y ${n[n.length - 1]}` : n[0];
  return frase.charAt(0).toUpperCase() + frase.slice(1);
};

/** Lo que costarían los complementos del combo por separado. */
export const precioSuelto = (k: Combo) => k.incluye.reduce((s, id) => s + (complementoPorId(id)?.precio ?? 0), 0);
export const ahorro = (k: Combo) => precioSuelto(k) - k.precio;

/* ---------- el total ---------- */
export interface Seleccion {
  /** Id del combo marcado. */
  combo?: string;
  /** Ids de los complementos marcados. */
  extras: string[];
  /** Opción elegida por complemento; si falta, vale la primera. */
  opciones?: Record<string, string>;
}

export interface Linea {
  id: string;
  nombre: string;
  /** Qué trae, para el combo. */
  detalle?: string;
  precio: number;
}

export interface Cuenta {
  paquete: number;
  lineas: Linea[];
  total: number;
  /** Anticipo: el porcentaje de `site.bookingDepositPct` sobre el total con complementos. */
  apartar: number;
}

/**
 * Suma el paquete y lo que el cliente marcó. Ignora lo que ese paquete no ofrece y lo que ya viene dentro del combo,
 * para no cobrar dos veces. El navegador y el asistente usan esta misma cuenta.
 */
export function calcular(paqueteId: string, sel: Seleccion): Cuenta {
  const p = paquetes.find((x) => x.id === paqueteId);
  if (!p) throw new Error(`Paquete desconocido: ${paqueteId}`);
  const lineas: Linea[] = [];

  const combo = sel.combo ? combosPublicados.find((k) => k.id === sel.combo && k.paquetes.includes(p.id)) : undefined;
  if (combo) {
    lineas.push({
      id: combo.id,
      nombre: combo.nombre,
      detalle: trae(combo),
      precio: combo.precio,
    });
  }

  for (const id of sel.extras) {
    const c = complementosDe(p.id).find((x) => x.id === id);
    if (!c || combo?.incluye.includes(id) || lineas.some((l) => l.id === id)) continue;
    if (c.opciones) {
      const o = c.opciones.find((x) => x.id === sel.opciones?.[id]) ?? c.opciones[0];
      lineas.push({ id, nombre: o.nombre, precio: o.precio });
    } else {
      lineas.push({ id, nombre: c.nombre, precio: c.precio! });
    }
  }

  const total = p.precio + lineas.reduce((s, l) => s + l.precio, 0);
  return { paquete: p.precio, lineas, total, apartar: Math.round((total * site.bookingDepositPct) / 100) };
}
