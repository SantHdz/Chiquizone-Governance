import { describe, expect, it } from 'vitest';
import { aHora, cabe, deHora, horariosLibres, revisar, type Dia } from '../src/agenda';

const libre: Dia = { fiestas: [], bloqueado: false };
const conDesayuno: Dia = { fiestas: [{ inicio: deHora('10:00'), fin: deHora('15:00') }], bloqueado: false };

describe('reglas de agenda', () => {
  it('un día vacío acepta una fiesta dentro del horario', () => {
    expect(cabe(deHora('10:00'), libre)).toBe(true);
  });

  it('la segunda fiesta empieza 8 horas después de la primera (ejemplo del documento)', () => {
    expect(cabe(deHora('17:30'), conDesayuno)).toBe(false);
    expect(cabe(deHora('18:00'), conDesayuno)).toBe(true);
  });

  it('también cuenta el colchón hacia atrás', () => {
    const conTarde: Dia = { fiestas: [{ inicio: deHora('18:00'), fin: deHora('23:00') }], bloqueado: false };
    expect(cabe(deHora('10:00'), conTarde)).toBe(true);
    expect(cabe(deHora('10:30'), conTarde)).toBe(false);
  });

  it('no acepta una tercera fiesta', () => {
    const lleno: Dia = {
      fiestas: [
        { inicio: deHora('09:00'), fin: deHora('14:00') },
        { inicio: deHora('17:00'), fin: deHora('22:00') },
      ],
      bloqueado: false,
    };
    expect(revisar(deHora('12:00'), lleno)).toEqual({ libre: false, motivo: 'dia-lleno', alternativas: [] });
  });

  it('un evento de día completo bloquea la fecha', () => {
    expect(revisar(deHora('12:00'), { fiestas: [], bloqueado: true }).motivo).toBe('dia-bloqueado');
  });

  it('respeta el horario más temprano y el más tarde', () => {
    expect(revisar(deHora('08:00'), libre).motivo).toBe('fuera-de-horario');
    expect(revisar(deHora('18:30'), libre).motivo).toBe('fuera-de-horario');
    expect(cabe(deHora('18:00'), libre)).toBe(true);
  });

  it('ofrece las 3 alternativas más cercanas cuando choca', () => {
    const r = revisar(deHora('16:00'), conDesayuno);
    expect(r.libre).toBe(false);
    expect(r.motivo).toBe('choca');
    expect(r.alternativas.map(aHora)).toEqual(['18:00']);
  });

  it('lista los horarios libres de un día con desayuno', () => {
    expect(horariosLibres(conDesayuno).map(aHora)).toEqual(['18:00']);
  });
});
