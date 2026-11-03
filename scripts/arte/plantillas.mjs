/*
 * Plantillas de arte de Chiquizone. Cada plantilla recibe una pieza ya validada, un tema y un formato de
 * identidad/estilo.json, y devuelve el HTML de una imagen. Todo lo que es marca (logo, letras, colores,
 * decorativos) sale de aquí; la IA solo aporta, si acaso, la foto o ilustración de fondo.
 */

const C = {
  frambuesa: '#B5456F', frambuesa300: '#D493AB', frambuesa600: '#97365A',
  marino: '#253D78', marino700: '#172851',
  sol: '#FFD235', sol200: '#FFEFB6', sol600: '#FDC400',
  salvia: '#A2C298', salvia200: '#D4E4CF', salvia700: '#6E9461',
};

/* Generador pseudoaleatorio con semilla: la misma pieza y variante siempre dan la misma imagen. */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const esc = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/* "La zona que *crece*" → la palabra entre asteriscos va en cursiva y en el color de acento. */
export const conCursiva = (s) => esc(s).replace(/\*([^*]+)\*/g, '<em>$1</em>');

const globos = (alto, hilo) => `
<svg class="globos" width="${Math.round(alto * 0.8)}" height="${alto}" viewBox="0 0 160 200" fill="none" aria-hidden="true">
  <path d="M52 112 C 50 140, 62 160, 60 196" stroke="${hilo}" stroke-width="2.5" stroke-linecap="round"/>
  <ellipse cx="52" cy="70" rx="38" ry="44" fill="${C.sol}"/>
  <path d="M44 38 c -10 6 -16 16 -17 28" stroke="${C.sol200}" stroke-width="6" stroke-linecap="round"/>
  <path d="M47 112 l 5 8 l 5 -8 z" fill="${C.sol600}"/>
  <path d="M112 118 C 118 144, 104 166, 110 196" stroke="${hilo}" stroke-width="2.5" stroke-linecap="round"/>
  <ellipse cx="112" cy="76" rx="36" ry="42" fill="${C.frambuesa}"/>
  <path d="M104 46 c -9 6 -15 15 -16 26" stroke="${C.frambuesa300}" stroke-width="6" stroke-linecap="round"/>
  <path d="M107 118 l 5 8 l 5 -8 z" fill="${C.frambuesa600}"/>
  <path d="M84 140 C 86 160, 80 176, 84 196" stroke="${hilo}" stroke-width="2.5" stroke-linecap="round"/>
  <ellipse cx="84" cy="112" rx="26" ry="30" fill="${C.salvia}"/>
  <path d="M78 90 c -6 4 -10 10 -11 18" stroke="${C.salvia200}" stroke-width="5" stroke-linecap="round"/>
  <path d="M80 140 l 4 7 l 4 -7 z" fill="${C.salvia700}"/>
</svg>`;

/* Banderines: siempre en el orden del logo; la variante solo mueve dónde empieza el ciclo. */
const banderines = (desfase, hilo) => {
  const orden = [C.frambuesa, C.sol, C.salvia, C.marino];
  const col = (i) => orden[(i + desfase) % 4];
  return `
<svg class="banderines" width="100%" height="64" viewBox="0 0 1080 64" preserveAspectRatio="xMidYMin slice" aria-hidden="true">
  <defs><pattern id="b" width="180" height="64" patternUnits="userSpaceOnUse">
    <path d="M0 9 Q 90 21 180 9" stroke="${hilo}" stroke-width="3" fill="none"/>
    <path d="M12 10 L 42 10 L 27 54 Z" fill="${col(0)}"/>
    <path d="M57 13 L 87 13 L 72 57 Z" fill="${col(1)}"/>
    <path d="M102 13 L 132 13 L 117 57 Z" fill="${col(2)}"/>
    <path d="M147 10 L 177 10 L 162 54 Z" fill="${col(3)}"/>
  </pattern></defs>
  <rect width="1080" height="64" fill="url(#b)"/>
</svg>`;
};

const chispas = (tam, color, espejo) => `
<svg class="chispas" width="${tam}" height="${tam}" viewBox="0 0 28 28" fill="none" aria-hidden="true" style="${espejo ? 'transform:scaleX(-1)' : ''}">
  <path d="M4 18 L 10 14" stroke="${color}" stroke-width="3.5" stroke-linecap="round"/>
  <path d="M8 8 L 12 12" stroke="${color}" stroke-width="3.5" stroke-linecap="round"/>
  <path d="M16 4 L 17 10" stroke="${color}" stroke-width="3.5" stroke-linecap="round"/>
</svg>`;

const check = (color, sobre) => `
<svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true"><circle cx="17" cy="17" r="17" fill="${color}"/>
<path d="M10 17.5 l 4.5 4.5 L 24 12.5" stroke="${sobre}" stroke-width="3.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

const whatsapp = (color) => `
<svg width="36" height="36" viewBox="0 0 256 256" aria-hidden="true"><path fill="${color}" d="M187.6 151.8l-32-16a8 8 0 0 0-8 .5l-14.7 9.8a40.6 40.6 0 0 1-16.9-16.9l9.8-14.7a8 8 0 0 0 .5-8l-16-32A8 8 0 0 0 103 80a40 40 0 0 0-40 40 88.1 88.1 0 0 0 88 88 40 40 0 0 0 40-40 8 8 0 0 0-3.4-6.2ZM151 192a72.1 72.1 0 0 1-72-72 24 24 0 0 1 19.3-23.5l11.5 23-9.8 14.6a8 8 0 0 0-.7 7.5 56.5 56.5 0 0 0 30.1 30.1 8 8 0 0 0 7.5-.7l14.6-9.8 23 11.5A24 24 0 0 1 151 192ZM128 24A104 104 0 0 0 36.2 176.9l-11.3 34A16 16 0 0 0 45.1 231l34-11.3A104 104 0 1 0 128 24Zm0 192a87.9 87.9 0 0 1-44.1-11.8 8 8 0 0 0-4-1.1 8.3 8.3 0 0 0-2.6.4L40 216l12.4-37.4a8 8 0 0 0-.6-6.6A88 88 0 1 1 128 216Z"/></svg>`;

function base({ formato, tema, fuentes, cuerpo, clase }) {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<link href="${fuentes}" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0; }
  html, body { width: ${formato.ancho}px; height: ${formato.alto}px; }
  body {
    background: ${tema.fondo}; color: ${tema.texto}; overflow: hidden; position: relative;
    font-family: Nunito, system-ui, sans-serif; -webkit-font-smoothing: antialiased;
  }
  h1, .precio { font-family: Fraunces, Georgia, serif; font-weight: 600; font-variation-settings: "SOFT" 50, "opsz" 144; letter-spacing: -0.02em; line-height: 1.02; }
  h1 em { font-style: italic; color: ${tema.acento}; font-weight: 500; }
  .eyebrow { font-weight: 800; text-transform: uppercase; letter-spacing: .14em; color: ${tema.acento}; font-size: 26px; display: flex; align-items: center; gap: 16px; }
  .eyebrow::before { content: ''; width: 40px; height: 5px; border-radius: 3px; background: currentColor; }
  .lede { color: ${tema.secundario}; line-height: 1.4; }
  .display { font-family: Fredoka, Nunito, sans-serif; font-weight: 600; }
  .cta {
    display: inline-flex; align-items: center; gap: 14px; padding: 22px 38px; border-radius: 999px;
    background: ${tema.acento}; color: ${tema.acento === C.sol ? C.marino700 : '#FFFFFF'};
    font-family: Fredoka, sans-serif; font-weight: 600; font-size: 32px; white-space: nowrap;
    box-shadow: 0 1px 2px #1728511f, 0 6px 14px -2px #17285133;
  }
  .logo { display: block; height: auto; }
  .globos { display: block; overflow: visible; }
  .chispas { display: inline-block; vertical-align: top; }
</style></head>
<body class="${clase}">${cuerpo}</body></html>`;
}

const ctaHtml = (pieza, tema) =>
  `<span class="cta">${whatsapp(tema.acento === C.sol ? C.marino700 : '#FFFFFF')}${esc(pieza.cta || 'Cotiza por WhatsApp')}</span>`;

/* Marco de foto en arco con el bloque de color detrás, como en el hero del sitio. */
function marcoFoto({ pieza, tema, r, ancho, alto, assets }) {
  const giro = (1 + r() * 1.5) * (r() < 0.5 ? -1 : 1);
  const src = pieza.foto ? assets.url(pieza.foto) : null;
  const interior = src
    ? `<img src="${src}" style="width:100%;height:100%;object-fit:cover;object-position:${pieza.foto_foco || '55% 60%'}">`
    : `<div style="width:100%;height:100%;background:${tema.superficie};display:grid;place-items:center">
         <img src="${assets.logo('isotipo-caritas')}" style="width:52%;opacity:.9"></div>`;
  const etiqueta = src && pieza.foto_real
    ? `<span class="display" style="position:absolute;right:28px;bottom:28px;padding:12px 24px;border-radius:999px;background:#FFFCF7;color:${C.frambuesa};font-size:26px;box-shadow:0 1px 2px #1728510f,0 14px 32px -14px #17285138">Montaje real</span>`
    : '';
  return `
<figure style="position:relative;width:${ancho}px;height:${alto}px;margin:0">
  <div style="position:absolute;inset:22px -22px -22px 22px;border-radius:${ancho * 0.7}px ${ancho * 0.7}px 64px 64px;background:${tema.bloque};transform:rotate(${-giro}deg)"></div>
  <div style="position:absolute;inset:0;border-radius:${ancho * 0.7}px ${ancho * 0.7}px 64px 64px;overflow:hidden;transform:rotate(${giro}deg);box-shadow:0 2px 4px #17285114,0 22px 44px -16px #17285147">${interior}</div>
  ${etiqueta}
</figure>`;
}

/* ---------- Plantilla "foto": el hero del sitio llevado a redes ---------- */
function foto(p) {
  const { pieza, tema, formato, nombreFormato, r, assets } = p;
  const izq = r() < 0.5;
  const hilo = tema.fondo === '#172851' ? '#B1B9CE' : C.marino;

  if (nombreFormato === 'cuadrado') {
    return `
<div style="position:absolute;inset:72px;display:grid;grid-template-columns:1fr 470px;gap:48px;align-items:center">
  <div style="display:grid;gap:30px;align-content:center">
    <img class="logo" src="${assets.logo(tema.logo)}" style="width:230px;margin-bottom:12px">
    ${pieza.eyebrow ? `<p class="eyebrow">${esc(pieza.eyebrow)}</p>` : ''}
    <h1 style="font-size:74px">${conCursiva(pieza.titulo)}</h1>
    ${pieza.texto ? `<p class="lede" style="font-size:30px">${esc(pieza.texto)}</p>` : ''}
    <div style="margin-top:10px">${ctaHtml(pieza, tema)}</div>
  </div>
  <div style="position:relative">${marcoFoto({ pieza, tema, r, ancho: 470, alto: 620, assets })}
    <div style="position:absolute;${izq ? 'left:-70px' : 'right:-60px'};bottom:40px">${globos(150, hilo)}</div></div>
</div>`;
  }

  const historia = nombreFormato === 'historia';
  const anchoFoto = historia ? 760 : 700;
  const altoFoto = historia ? 820 : 600;
  return `
<div style="position:absolute;inset:${historia ? '250px 90px 340px' : '80px 90px 80px'};display:flex;flex-direction:column;gap:${historia ? 34 : 26}px;align-items:${historia ? 'center' : 'flex-start'};text-align:${historia ? 'center' : 'left'}">
  ${historia ? `<img class="logo" src="${assets.logo(tema.logo)}" style="width:300px">` : ''}
  ${pieza.eyebrow ? `<p class="eyebrow">${esc(pieza.eyebrow)}</p>` : ''}
  <h1 style="font-size:${historia ? 92 : 88}px;max-width:${historia ? 15 : 13}ch">${conCursiva(pieza.titulo)}</h1>
  ${pieza.texto ? `<p class="lede" style="font-size:32px;max-width:30ch">${esc(pieza.texto)}</p>` : ''}
  <div style="flex:1;width:100%;display:flex;align-items:center;justify-content:${historia ? 'center' : izq ? 'flex-end' : 'flex-start'};position:relative">
    <div style="position:relative">${marcoFoto({ pieza, tema, r, ancho: anchoFoto, alto: altoFoto, assets })}
      <div style="position:absolute;${izq ? 'left:-80px' : 'right:-80px'};bottom:60px">${globos(historia ? 230 : 190, hilo)}</div></div>
  </div>
  <div style="display:flex;width:100%;align-items:center;justify-content:${historia ? 'center' : 'space-between'};gap:24px">
    ${historia ? '' : `<img class="logo" src="${assets.logo(tema.logo)}" style="width:210px">`}
    ${ctaHtml(pieza, tema)}
  </div>
</div>`;
}

/* ---------- Plantilla "frase": título grande, banderines y logo ---------- */
function frase(p) {
  const { pieza, tema, formato, nombreFormato, r, assets } = p;
  const historia = nombreFormato === 'historia';
  const cuadrado = nombreFormato === 'cuadrado';
  const izq = r() < 0.5;
  const hilo = tema.fondo === '#172851' ? '#B1B9CE' : C.marino;
  const tam = cuadrado ? 104 : historia ? 124 : 118;
  return `
${banderines(Math.floor(r() * 4), hilo).replace('class="banderines"', `class="banderines" style="position:absolute;left:0;top:${historia ? 180 : 0}px"`)}
<div style="position:absolute;${izq ? 'left:-30px' : 'right:-30px'};bottom:${historia ? 380 : 120}px;opacity:.95">${globos(historia ? 300 : 240, hilo)}</div>
<div style="position:absolute;inset:${historia ? '300px 90px 340px' : cuadrado ? '130px 96px 80px' : '150px 96px 90px'};display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:40px">
  ${pieza.eyebrow ? `<p class="eyebrow">${esc(pieza.eyebrow)}</p>` : ''}
  <div style="position:relative">
    <span style="position:absolute;${r() < 0.5 ? 'left:-56px;top:-40px' : 'right:-56px;top:-40px'}">${chispas(84, tema.acento, r() < 0.5)}</span>
    <h1 style="font-size:${tam}px;max-width:10ch">${conCursiva(pieza.titulo)}</h1>
  </div>
  ${pieza.texto ? `<p class="lede" style="font-size:${cuadrado ? 30 : 34}px;max-width:26ch">${esc(pieza.texto)}</p>` : ''}
  <div style="flex:1"></div>
  <img class="logo" src="${assets.logo(tema.logo)}" style="width:${cuadrado ? 220 : 260}px">
  ${pieza.cta ? ctaHtml(pieza, tema) : ''}
</div>`;
}

/* ---------- Plantilla "promo": tarjeta de paquete ---------- */
function promo(p) {
  const { pieza, tema, nombreFormato, r, assets } = p;
  const pk = pieza.paquete || {};
  const historia = nombreFormato === 'historia';
  const cuadrado = nombreFormato === 'cuadrado';
  const izq = r() < 0.5;
  const oscuro = tema.fondo === '#172851';
  const hilo = oscuro ? '#B1B9CE' : C.marino;
  const card = oscuro ? '#1D3164' : '#FFFCF7';
  const lista = (pk.incluye || []).slice(0, cuadrado ? 3 : 4).map((t) =>
    `<li style="display:flex;gap:16px;align-items:center">${check(oscuro ? C.sol : C.salvia, C.marino700)}<span>${esc(t)}</span></li>`).join('');
  return `
<div style="position:absolute;${izq ? 'left:-40px' : 'right:-40px'};top:${historia ? 300 : cuadrado ? 40 : 70}px">${globos(cuadrado ? 200 : 250, hilo)}</div>
<div style="position:absolute;inset:${historia ? '250px 80px 340px' : cuadrado ? '64px 80px' : '80px 80px'};display:flex;flex-direction:column;align-items:center;gap:${cuadrado ? 26 : 36}px;text-align:center">
  <img class="logo" src="${assets.logo(tema.logo)}" style="width:${cuadrado ? 190 : historia ? 300 : 250}px">
  ${pieza.titulo ? `<h1 style="font-size:${cuadrado ? 64 : historia ? 92 : 78}px;max-width:14ch">${conCursiva(pieza.titulo)}</h1>` : ''}
  <div style="flex:1;width:100%;display:flex;align-items:center;justify-content:center">
  <div style="zoom:${historia ? 1.22 : 1};width:${cuadrado ? 760 : 840}px;background:${card};border-radius:44px;padding:${cuadrado ? '40px 56px' : '56px 64px'};text-align:left;display:grid;gap:${cuadrado ? 18 : 26}px;
              box-shadow:0 2px 4px #17285114,0 22px 44px -16px #17285147;transform:rotate(${(r() - 0.5) * 1.6}deg)">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:20px">
      <span class="display" style="font-size:${cuadrado ? 62 : 74}px;color:${oscuro ? C.sol : C.frambuesa};line-height:1">${esc(pk.nombre || '')}</span>
      ${pk.edad ? `<span style="padding:10px 22px;border-radius:999px;background:${oscuro ? '#253D78' : '#EEF4EC'};font-weight:800;font-size:22px;letter-spacing:.08em;text-transform:uppercase;white-space:nowrap">${esc(pk.edad)}</span>` : ''}
    </div>
    ${lista ? `<ul style="list-style:none;padding:0;display:grid;gap:14px;font-size:${cuadrado ? 28 : 31}px;font-weight:600">${lista}</ul>` : ''}
    <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:20px;margin-top:8px">
      <div><div class="precio" style="font-size:${cuadrado ? 84 : 100}px">${esc(pk.precio || '')}</div>
           ${pk.detalle ? `<div class="lede" style="font-size:24px;margin-top:6px">${esc(pk.detalle)}</div>` : ''}</div>
    </div>
  </div></div>
  ${ctaHtml(pieza, tema)}
</div>`;
}

export const plantillas = { foto, frase, promo };

export function render(p) {
  const fn = plantillas[p.pieza.plantilla];
  return base({ ...p, cuerpo: fn(p), clase: `${p.pieza.plantilla} ${p.nombreFormato}` });
}
