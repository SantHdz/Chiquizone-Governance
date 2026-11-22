/*
 * Aviso de privacidad del asistente de WhatsApp. Meta pide una URL pública de política de
 * privacidad para publicar la app; la sirve el mismo Worker en /privacidad.
 */
const CORREO = 'contacto@chiquizone.com';
const ACTUALIZADO = '21 de noviembre de 2026';

export const PRIVACIDAD_HTML = `<!doctype html>
<html lang="es-MX">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Aviso de privacidad · Chiquizone</title>
<style>
  body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; line-height: 1.6; color: #222; background: #fff; max-width: 720px; margin: 0 auto; padding: 24px 16px 48px; }
  h1 { font-size: 1.6rem; margin-bottom: 0.25rem; }
  h2 { font-size: 1.15rem; margin-top: 2rem; }
  p.fecha { color: #666; margin-top: 0; }
  a { color: #1a5fb4; }
</style>
</head>
<body>
<h1>Aviso de privacidad</h1>
<p class="fecha">Asistente de WhatsApp de Chiquizone · Actualizado el ${ACTUALIZADO}</p>

<h2>Quién es responsable de tus datos</h2>
<p>Chiquizone, servicio de renta de zonas de juego para fiestas infantiles en San Juan del Río y Tequisquiapan, Querétaro, México, es responsable de los datos personales que compartes al escribirnos por WhatsApp. Para cualquier tema de privacidad escríbenos a <a href="mailto:${CORREO}">${CORREO}</a>.</p>

<h2>Qué datos usamos</h2>
<p>Tu número de WhatsApp y tu nombre de perfil; los mensajes que nos envías; y los datos de tu evento que tú nos compartes: nombre, fecha, hora, municipio, número de niños y paquete de interés.</p>

<h2>Para qué los usamos</h2>
<p>Para contestarte, darte precios, revisar si tu fecha está disponible, apartar tu fecha y darle seguimiento a tu reservación. No vendemos tus datos ni los usamos para publicidad de terceros.</p>

<h2>Quién nos ayuda a procesarlos</h2>
<p>Nuestra asistente virtual, Chiquiz, funciona con inteligencia artificial. Para operar usamos estos proveedores, que tratan los datos solo para prestarnos su servicio: Meta (WhatsApp Business), Anthropic (el modelo de inteligencia artificial que redacta las respuestas), Google (calendario de reservaciones) y Cloudflare (servidor y almacenamiento). Una persona de Chiquizone puede revisar la conversación para atenderte mejor.</p>

<h2>Cuánto tiempo los guardamos</h2>
<p>Guardamos la conversación y los datos de tu reservación mientras sean necesarios para atenderte y, después, el tiempo que exijan las obligaciones fiscales y legales aplicables.</p>

<h2>Tus derechos</h2>
<p>Puedes pedir acceder a tus datos, corregirlos, cancelarlos u oponerte a su uso, así como revocar tu consentimiento, conforme a la legislación mexicana de protección de datos personales. Escríbenos a <a href="mailto:${CORREO}">${CORREO}</a> y te respondemos en un máximo de 20 días hábiles.</p>

<h2>Cambios a este aviso</h2>
<p>Si cambiamos este aviso, publicaremos la nueva versión en esta misma dirección con su fecha de actualización.</p>
</body>
</html>`;
