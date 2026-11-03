import { describe, expect, it } from 'vitest';
import { catalogo, cotizar, recomendar } from '../src/cotizar';
import { paquetes, publicados } from '../../src/data/paquetes';

describe('cotizar', () => {
  it('recomienda igual que Arma tu zona entre los paquetes publicados', () => {
    expect(recomendar({ edad: 'baby', agua: false, cuidadoras: false })?.id).toBe('baby-baby');
    expect(recomendar({ edad: 'baby', agua: false, cuidadoras: true })?.id).toBe('pro-baby');
  });

  it('no recomienda paquetes que todavía no se publican', () => {
    for (const p of paquetes.filter((x) => !x.disponible)) {
      expect(recomendar({ edad: p.familia, agua: p.splash, cuidadoras: p.pro })).toBeNull();
    }
  });

  it('calcula 50 % de anticipo, saldo y 500 MXN de garantía con el precio del sitio', () => {
    for (const p of publicados) {
      const c = cotizar(p);
      expect(c.precio).toBe(p.precio);
      expect(c.anticipo).toBe(Math.ceil(p.precio / 2));
      expect(c.anticipo + c.saldo).toBe(p.precio);
      expect(c.garantia).toBe(500);
    }
  });

  it('el catálogo del asistente trae solo los paquetes publicados', () => {
    const texto = catalogo();
    for (const p of publicados) expect(texto).toContain(`$${p.precio} MXN`);
    for (const p of paquetes.filter((x) => !x.disponible)) expect(texto).not.toContain(p.nombre + ' (');
  });
});
