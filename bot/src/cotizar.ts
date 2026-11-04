/*
 * Cotización con los mismos datos que el sitio: src/data/paquetes.ts es la única fuente de precios.
 * La lógica de recomendación es la misma que "Arma tu zona".
 */
import { publicados, familias, incluidoSiempre, type Familia, type Paquete } from '../../src/data/paquetes';
import { site } from '../../src/data/site';

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

/** Catálogo en texto para el prompt del asistente. Cambia solo cuando cambia paquetes.ts. */
export function catalogo(): string {
  return publicados
    .map((p) => {
      const c = cotizar(p);
      const extras = c.extras.length ? ` Suma: ${c.extras.join(', ')}.` : '';
      return `- ${c.nombre} (${c.edades}${p.splash ? ', con agua' : ''}): $${c.precio} MXN. Incluye: ${c.incluye.join(', ')}.${extras}`;
    })
    .join('\n');
}
