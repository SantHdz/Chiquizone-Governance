/*
 * Datos que usan varias páginas por tema. Las páginas hablan de Baby baby y Pro Baby, los paquetes publicados
 * al lanzar. Si alguno deja de publicarse, el build falla con un aviso en lugar de mostrar una página que
 * habla de algo que ya no se vende.
 */
import { publicados, familias, incluidoSiempre } from '../data/paquetes';
import { complementoPorId } from '../data/complementos';
import { mxn, pct, site } from '../data/site';

const quiere = (id: string) => {
  const p = publicados.find((x) => x.id === id);
  if (!p) throw new Error(`Las páginas por tema necesitan el paquete "${id}" publicado (disponible: true en src/data/paquetes.ts). Actualiza esas páginas o vuelve a publicarlo.`);
  return p;
};

export const base = quiere('baby-baby');
export const pro = quiere('pro-baby');
export const edades = familias[base.familia].edades;
export { incluidoSiempre };

/** Precio de un complemento con precio fijo, ya formateado. */
export const precioDe = (id: string) => {
  const c = complementoPorId(id);
  if (!c || c.precio === undefined) throw new Error(`Complemento sin precio fijo: ${id}`);
  return mxn(c.precio);
};
/** Precio de una opción (tamaño o variante) de un complemento. */
export const precioOpcion = (id: string, opcion: string) => {
  const o = complementoPorId(id)?.opciones?.find((x) => x.id === opcion);
  if (!o) throw new Error(`Opción desconocida: ${id}/${opcion}`);
  return mxn(o.precio);
};

export const apartado = (precio: number) => mxn(Math.round((precio * site.bookingDepositPct) / 100));
export { mxn, pct, site };

/** "a, b y c": une una lista en español natural, con minúscula inicial. */
export const lista = (items: string[]) => {
  const x = items.map((i) => i.charAt(0).toLowerCase() + i.slice(1));
  return x.length > 1 ? `${x.slice(0, -1).join(', ')} y ${x[x.length - 1]}` : x[0];
};
