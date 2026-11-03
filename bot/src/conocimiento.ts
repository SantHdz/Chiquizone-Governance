/*
 * Capa de conocimiento. Hoy el material cabe completo en el prompt (modo "completo").
 * El modo "busqueda" (Vectorize + reranker) se enciende cuando el material crezca; ambos citan igual.
 */
import { fragmentos } from './conocimiento.generado';

export interface Fragmento {
  id: string;
  archivo: string;
  titulo: string;
  seccion: string;
  categoria: string;
  responsable: string;
  actualizado: string;
  texto: string;
}

export { fragmentos };

const mes = (fecha: string) =>
  new Intl.DateTimeFormat('es-MX', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${fecha}T12:00:00Z`));

/** Cómo se cita una fuente en WhatsApp: "Apartado, pagos y garantía, nov 2026". */
export const cita = (f: Fragmento) => `${f.titulo}, ${mes(f.actualizado)}`;

/** Bloque para el prompt: cada fragmento con su id, para que el modelo diga cuáles usó. */
export function bloqueDeFuentes(lista: Fragmento[] = fragmentos): string {
  return lista
    .map((f) => `<fuente id="${f.id}" titulo="${f.titulo}" seccion="${f.seccion}" actualizado="${f.actualizado}">\n${f.texto}\n</fuente>`)
    .join('\n');
}

/** Ids de fuente que el modelo marcó con [[id]] en su respuesta, solo si existen. */
export function fuentesCitadas(texto: string): Fragmento[] {
  const ids = new Set([...texto.matchAll(/\[\[([a-z0-9#-]+)\]\]/g)].map((m) => m[1]));
  return fragmentos.filter((f) => ids.has(f.id));
}

/** Quita las marcas [[id]] y agrega una línea de fuentes legible al final. */
export function conFuentes(texto: string): { texto: string; usadas: Fragmento[] } {
  const usadas = fuentesCitadas(texto);
  const limpio = texto.replace(/\s*\[\[[^\]]+\]\]/g, '').trim();
  if (!usadas.length) return { texto: limpio, usadas };
  const titulos = [...new Set(usadas.map(cita))];
  return { texto: `${limpio}\n\n_Fuente: ${titulos.join('; ')}_`, usadas };
}
