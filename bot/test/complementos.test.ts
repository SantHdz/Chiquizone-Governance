import { describe, expect, it } from 'vitest';
import { calcular, combosPublicados, complementosPublicados } from '../../src/data/complementos';
import { catalogo, cotizarConComplementos, OPCIONES_COMPLEMENTO, seleccionDe } from '../src/cotizar';
import { montosOficiales, revisarMontos } from '../src/guardia';

describe('complementos en el asistente', () => {
  it('da el mismo total que "Arma tu zona"', () => {
    const lista = ['bocina', 'brincolin:grande', 'hora-extra:con-cuidadora'];
    const sitio = calcular('baby-baby', seleccionDe(lista));
    const bot = cotizarConComplementos('baby-baby', lista);
    expect(bot.total).toBe(sitio.total);
    expect(bot.complementos).toEqual(sitio.lineas);
    expect(bot.anticipo + bot.saldo).toBe(bot.total);
  });

  it('el combo no cobra dos veces lo que ya trae', () => {
    const r = cotizarConComplementos('baby-baby', ['combo:fiesta-completa', 'bocina']);
    expect(r.complementos.map((l) => l.id)).toEqual(['fiesta-completa']);
    expect(r.noAplican).toEqual(['bocina']);
  });

  it('no cobra lo que ese paquete no ofrece', () => {
    const r = cotizarConComplementos('pro-baby', ['burbujas']);
    expect(r.complementos).toEqual([]);
    expect(r.noAplican).toEqual(['burbujas']);
    expect(r.total).toBe(r.precioPaquete);
  });

  it('el descuento negociado aplica al paquete y el anticipo es sobre el total', () => {
    const r = cotizarConComplementos('baby-baby', ['bocina'], 1773);
    expect(r.total).toBe(1773 + 250);
    expect(r.anticipo).toBe(Math.ceil((1773 + 250) / 2));
  });

  it('el esquema lista cada complemento publicado y cada combo', () => {
    for (const c of complementosPublicados) {
      expect(OPCIONES_COMPLEMENTO.some((x) => x === c.id || x.startsWith(`${c.id}:`))).toBe(true);
    }
    for (const k of combosPublicados) expect(OPCIONES_COMPLEMENTO).toContain(`combo:${k.id}`);
  });

  it('la guardia acepta precios de complementos y combos, no inventados', () => {
    const permitidos = montosOficiales();
    expect(revisarMontos('La bocina cuesta $250 y el combo $750.', permitidos).ok).toBe(true);
    expect(revisarMontos('Te dejo la bocina en $199.', permitidos).ok).toBe(false);
  });

  it('el catálogo del prompt trae los complementos con su precio', () => {
    const t = catalogo();
    expect(t).toContain('Complementos opcionales');
    expect(t).toContain('$250');
  });
});
