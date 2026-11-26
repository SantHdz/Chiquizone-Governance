/*
 * /conectar: página para conectar el número de WhatsApp Business de Sant (427) a Chiquiz
 * con coexistencia (Embedded Signup, featureType whatsapp_business_app_onboarding).
 *
 * Sant sigue usando la app WhatsApp Business en su celular y la API recibe los mismos mensajes.
 * La página solo abre el flujo de Meta y muestra los identificadores que devuelve; no guarda
 * nada ni cambia tokens. Con esos datos se actualiza WA_PHONE_NUMBER_ID a mano.
 */

export interface EnvConectar {
  META_APP_ID?: string;
  META_CONFIG_ID?: string;
  GRAPH_VERSION: string;
}

const escapar = (s: string) => s.replace(/[^\w.-]/g, '');

export function paginaConectar(env: EnvConectar): string {
  const appId = escapar(env.META_APP_ID ?? '');
  const configId = escapar(env.META_CONFIG_ID ?? '');
  const version = escapar(env.GRAPH_VERSION || 'v23.0');
  const listo = Boolean(appId && configId);

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Conectar WhatsApp a Chiquiz</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 34rem; margin: 3rem auto; padding: 0 1.25rem; line-height: 1.5; color: #222; }
  h1 { font-size: 1.5rem; }
  button { font: inherit; font-weight: 600; background: #1877f2; color: #fff; border: 0; border-radius: .5rem; padding: .8rem 1.4rem; cursor: pointer; }
  button:disabled { background: #9bb8e0; cursor: default; }
  pre { background: #f4f4f4; padding: 1rem; border-radius: .5rem; white-space: pre-wrap; word-break: break-all; }
  .aviso { background: #fff4d6; padding: .8rem 1rem; border-radius: .5rem; }
</style>
</head>
<body>
<h1>Conectar tu WhatsApp Business a Chiquiz 🎈</h1>
<p>Vas a conectar el número que ya usas en la app WhatsApp Business. Sigues usando la app en tu celular como siempre; Chiquiz solo empieza a recibir los mismos mensajes.</p>
<ol>
  <li>Ten tu celular a la mano, con WhatsApp Business abierto y actualizado.</li>
  <li>Da clic en el botón, entra con tu Facebook y elige el portafolio <b>Chiquizone</b>.</li>
  <li>Cuando te lo pida, elige conectar tu app existente y escanea el código QR desde WhatsApp Business.</li>
</ol>
${listo ? '' : '<p class="aviso">Falta configurar el identificador de Meta (META_CONFIG_ID). Aún no se puede conectar.</p>'}
<p><button id="conectar" ${listo ? '' : 'disabled'}>Conectar WhatsApp Business</button></p>
<div id="resultado"></div>
<script>
  const resultado = document.getElementById('resultado');
  const datos = {};
  function mostrar(titulo) {
    resultado.innerHTML = '<h2></h2><p>Mándale a Claude una captura de esto (no contiene contraseñas):</p><pre></pre>';
    resultado.querySelector('h2').textContent = titulo;
    resultado.querySelector('pre').textContent = JSON.stringify(datos, null, 2);
  }
  window.addEventListener('message', (e) => {
    if (!/(^|\\.)facebook\\.com$/.test(new URL(e.origin).hostname)) return;
    let d;
    try { d = JSON.parse(e.data); } catch { return; }
    if (d.type !== 'WA_EMBEDDED_SIGNUP') return;
    datos.evento = d.event;
    if (d.data) {
      if (d.data.waba_id) datos.waba_id = d.data.waba_id;
      if (d.data.phone_number_id) datos.phone_number_id = d.data.phone_number_id;
      if (d.data.current_step) datos.paso = d.data.current_step;
      if (d.data.error_message) datos.error = d.data.error_message;
    }
    if (String(d.event).startsWith('FINISH')) mostrar('¡Listo, quedó conectado! 🎉');
    else if (d.event === 'CANCEL') mostrar('Se cerró antes de terminar');
    else if (d.event === 'ERROR') mostrar('Meta reportó un error');
  });
  window.fbAsyncInit = function () {
    FB.init({ appId: '${appId}', autoLogAppEvents: true, xfbml: false, version: '${version}' });
  };
  document.getElementById('conectar').addEventListener('click', () => {
    FB.login((r) => {
      datos.sesion = r.authResponse ? 'autorizada' : 'sin autorizar';
      if (!datos.evento) mostrar(r.authResponse ? 'Autorizado, esperando confirmación de Meta…' : 'No se completó');
    }, {
      config_id: '${configId}',
      response_type: 'code',
      override_default_response_type: true,
      extras: { setup: {}, featureType: 'whatsapp_business_app_onboarding', sessionInfoVersion: '3' },
    });
  });
</script>
<script async defer crossorigin="anonymous" src="https://connect.facebook.net/es_LA/sdk.js"></script>
</body>
</html>`;
}
