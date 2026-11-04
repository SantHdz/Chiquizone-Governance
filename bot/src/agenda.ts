/*
 * Reglas de agenda de Chiquizone (decisión de Sant, 2026-11-02).
 *
 * - Máximo 2 fiestas por día (por ejemplo, desayuno y tarde).
 * - Cada fiesta dura 5 horas; el montaje es 1 hora antes.
 * - Al terminar: 1 hora para recoger y 1 hora de traslado antes del siguiente montaje.
 *   Por eso la segunda fiesta empieza al menos 8 horas después de la primera.
 *
 * Todo se maneja en minutos desde la medianoche, hora del centro de México.
 */

export interface Reglas {
  fiestaMin: number;
  montajeMin: number;
  recogerMin: number;
  trasladoMin: number;
  maxFiestasPorDia: number;
  /** Hora más temprana para empezar una fiesta. */
  primerInicio: number;
  /** Hora más tarde para terminar una fiesta. */
  ultimoFin: number;
  /** Cada cuánto se ofrecen horarios alternativos. */
  pasoMin: number;
}

// TODO: confirmar con Sant el horario más temprano y el más tarde.
export const REGLAS: Reglas = {
  fiestaMin: 5 * 60,
  montajeMin: 60,
  recogerMin: 60,
  trasladoMin: 60,
  maxFiestasPorDia: 2,
  primerInicio: 9 * 60,
  ultimoFin: 23 * 60,
  pasoMin: 30,
};

export interface Fiesta {
  inicio: number;
  fin: number;
}

export interface Dia {
  fiestas: Fiesta[];
  /** Un evento de día completo en el calendario bloquea la fecha. */
  bloqueado: boolean;
}

export type Motivo = 'libre' | 'dia-lleno' | 'dia-bloqueado' | 'fuera-de-horario' | 'choca';

export interface Revision {
  libre: boolean;
  motivo: Motivo;
  /** Hasta 3 horarios de inicio que sí caben, del más cercano al más lejano. */
  alternativas: number[];
}

/** ¿Se puede atender `nueva` sin chocar con `otra`, contando montaje, recogida y traslado? */
function compatibles(nueva: Fiesta, otra: Fiesta, r: Reglas): boolean {
  const colchon = r.recogerMin + r.trasladoMin + r.montajeMin;
  return nueva.inicio >= otra.fin + colchon || otra.inicio >= nueva.fin + colchon;
}

function motivoPara(inicio: number, dia: Dia, r: Reglas): Motivo {
  if (dia.bloqueado) return 'dia-bloqueado';
  if (dia.fiestas.length >= r.maxFiestasPorDia) return 'dia-lleno';
  const nueva = { inicio, fin: inicio + r.fiestaMin };
  if (nueva.inicio < r.primerInicio || nueva.fin > r.ultimoFin) return 'fuera-de-horario';
  if (!dia.fiestas.every((f) => compatibles(nueva, f, r))) return 'choca';
  return 'libre';
}

export function cabe(inicio: number, dia: Dia, r: Reglas = REGLAS): boolean {
  return motivoPara(inicio, dia, r) === 'libre';
}

/** Todos los horarios de inicio que caben ese día, cada `pasoMin`. */
export function horariosLibres(dia: Dia, r: Reglas = REGLAS): number[] {
  const libres: number[] = [];
  for (let t = r.primerInicio; t + r.fiestaMin <= r.ultimoFin; t += r.pasoMin) {
    if (cabe(t, dia, r)) libres.push(t);
  }
  return libres;
}

export function revisar(inicio: number, dia: Dia, r: Reglas = REGLAS): Revision {
  const motivo = motivoPara(inicio, dia, r);
  if (motivo === 'libre') return { libre: true, motivo, alternativas: [] };
  const alternativas = horariosLibres(dia, r)
    .sort((a, b) => Math.abs(a - inicio) - Math.abs(b - inicio) || a - b)
    .slice(0, 3);
  return { libre: false, motivo, alternativas };
}

export const aHora = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

export function deHora(hhmm: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) throw new Error(`Hora inválida: ${hhmm}`);
  return Number(m[1]) * 60 + Number(m[2]);
}
