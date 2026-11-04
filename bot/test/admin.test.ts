import { describe, expect, it } from 'vitest';
import { rutaAdmin } from '../src/admin';

const TOKEN = 'x'.repeat(32);
const env = {
  ADMIN_TOKEN: TOKEN,
  ANTHROPIC_API_KEY: 'k',
  CONVERSACIONES: {} as KVNamespace,
  DB: {} as D1Database,
  GOOGLE_SA_EMAIL: 'a@b',
  GOOGLE_SA_KEY: 'no es una llave',
  GOOGLE_CALENDAR_ID: 'c',
};
const pedir = (cuerpo: unknown, token = TOKEN) =>
  new Request('https://x/admin/calendario', {
    method: 'POST',
    headers: { authorization: `Bearer ${token}` },
    body: JSON.stringify(cuerpo),
  });

describe('/admin/calendario', () => {
  it('pide el token', async () => {
    expect((await rutaAdmin(pedir({}, 'y'.repeat(32)), env, '/admin/calendario')).status).toBe(403);
  });

  it('rechaza fechas mal escritas', async () => {
    expect((await rutaAdmin(pedir({ fecha: '4/11/2026' }), env, '/admin/calendario')).status).toBe(400);
  });

  it('si Google falla devuelve el error legible en vez de romperse', async () => {
    const r = await rutaAdmin(pedir({ fecha: '2026-12-12' }), env, '/admin/calendario');
    expect(r.status).toBe(502);
    expect(await r.json()).toMatchObject({ ok: false, fecha: '2026-12-12' });
  });
});
