import { describe, expect, it } from 'vitest';
import worker, { AVISO_IA } from '../src/index';

describe('aviso de privacidad', () => {
  it('se sirve en /privacidad como HTML', async () => {
    const r = await worker.fetch(new Request('https://x.test/privacidad'), {} as never, {} as never);
    expect(r.status).toBe(200);
    expect(r.headers.get('content-type')).toContain('text/html');
    const t = await r.text();
    expect(t).toContain('Aviso de privacidad');
    expect(t).toContain('contacto@chiquizone.com');
  });
});

describe('presentación', () => {
  it('Chiquiz se presenta y aclara que es inteligencia artificial', () => {
    expect(AVISO_IA).toMatch(/^¡Hola! Te atiende Chiquiz/);
    expect(AVISO_IA).toContain('asistente virtual');
  });
});
