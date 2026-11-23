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

describe('fechas cercanas', () => {
  it('suma días cruzando meses y años', async () => {
    const { sumarDias } = await import('../src/agenda');
    expect(sumarDias('2026-12-31', 1)).toBe('2027-01-01');
    expect(sumarDias('2027-02-28', 1)).toBe('2027-03-01');
  });

  it('salta días llenos o bloqueados y devuelve las dos más cercanas', async () => {
    const { fechasCercanas } = await import('../src/agenda');
    const dias: Record<string, { fiestas: { inicio: number; fin: number }[]; bloqueado: boolean }> = {
      '2027-02-06': { fiestas: [], bloqueado: true },
      '2027-02-07': { fiestas: [{ inicio: 600, fin: 900 }, { inicio: 1080, fin: 1380 }], bloqueado: false },
    };
    const leidos: string[] = [];
    const leerDia = async (f: string) => {
      leidos.push(f);
      return dias[f] ?? { fiestas: [], bloqueado: false };
    };
    const r = await fechasCercanas(leerDia, '2027-02-06');
    expect(r.map((f) => f.fecha)).toEqual(['2027-02-08', '2027-02-09']);
    expect(r[0]).toMatchObject({ primerInicio: 9 * 60, ultimoInicio: 18 * 60 });
    expect(leidos).toHaveLength(4);
  });

  it('no busca más allá del límite de días', async () => {
    const { fechasCercanas } = await import('../src/agenda');
    const r = await fechasCercanas(async () => ({ fiestas: [], bloqueado: true }), '2027-02-01', 2, 10);
    expect(r).toEqual([]);
  });
});
