import { describe, expect, it } from 'vitest';
import { firmaValida, leerEventos } from '../src/whatsapp';
import { ALCANCE, eventosADia, reclamos } from '../src/calendario';

describe('webhook de WhatsApp', () => {
  const cuerpo = JSON.stringify({ hola: 'mundo' });
  // HMAC-SHA256 de `cuerpo` con la llave "secreto", calculado aparte.
  const firma = 'sha256=530936b6b72fc187ed1c3a02001a72b798f16b64beeed96f4ed32d06ca56905a';

  it('acepta una firma correcta y rechaza las demás', async () => {
    expect(await firmaValida(cuerpo, firma, 'secreto')).toBe(true);
    expect(await firmaValida(cuerpo, firma, 'otro')).toBe(false);
    expect(await firmaValida(cuerpo, null, 'secreto')).toBe(false);
  });

  it('lee mensajes de texto, archivos y ecos de la app', () => {
    const eventos = leerEventos({
      entry: [
        {
          changes: [
            {
              field: 'messages',
              value: {
                contacts: [{ wa_id: '5214270000000', profile: { name: 'Ana' } }],
                messages: [
                  { id: 'a', from: '5214270000000', type: 'text', text: { body: 'Hola' } },
                  { id: 'b', from: '5214270000000', type: 'image' },
                ],
              },
            },
            { field: 'smb_message_echoes', value: { message_echoes: [{ to: '5214270000000' }] } },
          ],
        },
      ],
    });
    expect(eventos).toEqual([
      { tipo: 'mensaje', id: 'a', de: '5214270000000', nombre: 'Ana', texto: 'Hola' },
      { tipo: 'no-texto', id: 'b', de: '5214270000000' },
      { tipo: 'eco', para: '5214270000000' },
    ]);
  });
});

describe('calendario', () => {
  it('pide solo permiso de eventos, y actúa por hola@ solo si hay delegación', () => {
    const base = { GOOGLE_SA_EMAIL: 'asistente@x.iam.gserviceaccount.com', GOOGLE_SA_KEY: '', GOOGLE_CALENDAR_ID: 'c' };
    expect(reclamos(base, 0)).not.toHaveProperty('sub');
    expect(reclamos(base, 0).scope).toBe(ALCANCE);
    expect(reclamos({ ...base, GOOGLE_SUBJECT: 'hola@chiquizone.com' }, 0)).toMatchObject({ sub: 'hola@chiquizone.com' });
  });

  it('convierte eventos a minutos en hora de México e ignora los cancelados', () => {
    const dia = eventosADia('2026-11-14', [
      { start: { dateTime: '2026-11-14T10:00:00-06:00' }, end: { dateTime: '2026-11-14T15:00:00-06:00' } },
      { start: { dateTime: '2026-11-14T22:00:00Z' }, end: { dateTime: '2026-11-15T03:00:00Z' } },
      { status: 'cancelled', start: { dateTime: '2026-11-14T12:00:00-06:00' }, end: { dateTime: '2026-11-14T13:00:00-06:00' } },
    ]);
    expect(dia).toEqual({
      bloqueado: false,
      fiestas: [
        { inicio: 600, fin: 900 },
        { inicio: 960, fin: 1260 },
      ],
    });
  });

  it('un evento de día completo bloquea la fecha', () => {
    expect(eventosADia('2026-11-14', [{ start: { date: '2026-11-14' }, end: { date: '2026-11-15' } }]).bloqueado).toBe(true);
  });
});
