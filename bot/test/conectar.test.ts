import { describe, expect, it } from 'vitest';
import { paginaConectar } from '../src/conectar';

describe('/conectar', () => {
  it('pide coexistencia con la app WhatsApp Business', () => {
    const html = paginaConectar({ META_APP_ID: '3611455509020679', META_CONFIG_ID: '123', GRAPH_VERSION: 'v23.0' });
    expect(html).toContain("featureType: 'whatsapp_business_app_onboarding'");
    expect(html).toContain("config_id: '123'");
    expect(html).not.toContain('disabled>');
  });

  it('se queda desactivada sin configuración y no deja inyectar código', () => {
    const html = paginaConectar({ META_APP_ID: "1'; alert(1); '", META_CONFIG_ID: '', GRAPH_VERSION: '' });
    expect(html).toContain('Falta configurar');
    expect(html).not.toContain("alert(1); '");
  });
});
