/*
 * Guardia de salida: ningún monto llega a la clienta si no salió del servidor.
 * Se permiten los precios, anticipos, saldos y garantía de los paquetes publicados y
 * cualquier monto que devolvió una herramienta en esta conversación.
 */
import { publicados } from '../../src/data/paquetes';
import { cotizar, GARANTIA_MXN, preciosDeComplementos } from './cotizar';

export function montosOficiales(): Set<number> {
  const s = new Set<number>([GARANTIA_MXN]);
  for (const p of publicados) {
    const c = cotizar(p);
    s.add(c.precio).add(c.anticipo).add(c.saldo);
  }
  for (const n of preciosDeComplementos()) s.add(n);
  return s;
}

const aNumero = (t: string) => Number(t.replace(/[,\s]/g, '').replace(/\.00$/, ''));

/** Montos de dinero en un texto: "$1,870", "$ 935", "1870 pesos", "500 MXN". */
export function montosEn(texto: string): number[] {
  const encontrados: number[] = [];
  for (const m of texto.matchAll(/\$\s?(\d[\d,]*(?:\.\d{2})?)/g)) encontrados.push(aNumero(m[1]));
  for (const m of texto.matchAll(/(\d[\d,]*(?:\.\d{2})?)\s?(?:MXN|pesos|mxn)\b/g)) encontrados.push(aNumero(m[1]));
  return encontrados;
}

/** Montos dentro de los resultados de herramientas (JSON con números). */
export function montosDeHerramientas(resultados: string[]): Set<number> {
  const s = new Set<number>();
  for (const r of resultados) for (const m of r.matchAll(/\b\d{3,6}\b/g)) s.add(Number(m[0]));
  return s;
}

export interface Revision {
  ok: boolean;
  noPermitidos: number[];
}

export function revisarMontos(texto: string, permitidos: Set<number>): Revision {
  const noPermitidos = montosEn(texto).filter((n) => !permitidos.has(n));
  return { ok: noPermitidos.length === 0, noPermitidos };
}
