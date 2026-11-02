import { describe, expect, it } from 'vitest';
import { catalogo, cotizar, recomendar } from '../src/cotizar';
import { paquetes } from '../../src/data/paquetes';

describe('cotizar', () => {
  it('recomienda igual que Arma tu zona', () => {
    expect(recomendar({ edad: 'baby', agua: false, cuidadoras: false }).id).toBe('baby-baby');
    expect(recomendar({ edad: 'terreneitor', agua: true, cuidadoras: true }).id).toBe('terreneitor-splash-pro');
  });

  it('hay un paquete para cada combinación de respuestas', () => {
    for (const edad of ['baby', 'terreneitor'] as const)
      for (const agua of [false, true])
        for (const cuidadoras of [false, true]) expect(() => recomendar({ edad, agua, cuidadoras })).not.toThrow();
  });

  it('calcula 50 % de anticipo, saldo y 500 MXN de garantía', () => {
    const c = cotizar(recomendar({ edad: 'baby', agua: false, cuidadoras: false }));
    expect(c).toMatchObject({ precio: 1870, anticipo: 935, saldo: 935, garantia: 500 });
  });

  it('el catálogo del asistente trae todos los precios del sitio', () => {
    const texto = catalogo();
    for (const p of paquetes) expect(texto).toContain(`$${p.precio} MXN`);
  });
});
