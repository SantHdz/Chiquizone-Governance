/*
 * Cotización con los mismos datos que el sitio: src/data/paquetes.ts es la única fuente de precios.
 * La lógica de recomendación es la misma que "Arma tu zona".
 */
import { paquetes, familias, incluidoSiempre, type Familia, type Paquete } from '../../src/data/paquetes';

/** Decisión de Sant (2026-11-02): 50 % de anticipo y 500 MXN de garantía. */
export const ANTICIPO = 0.5;
export const GARANTIA_MXN = 500;

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

export function recomendar(p: Preferencias): Paquete {
  const paquete = paquetes.find(
    (x) => x.familia === p.edad && x.splash === p.agua && x.pro === p.cuidadoras,
  );
  if (!paquete) throw new Error(`No hay paquete para ${JSON.stringify(p)}`);
  return paquete;
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
  return paquetes
    .map((p) => {
      const c = cotizar(p);
      const extras = c.extras.length ? ` Suma: ${c.extras.join(', ')}.` : '';
      return `- ${c.nombre} (${c.edades}${p.splash ? ', con agua' : ''}): $${c.precio} MXN. Incluye: ${c.incluye.join(', ')}.${extras}`;
    })
    .join('\n');
}
