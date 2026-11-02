/*
 * Viaje del logo. En el inicio, el logo grande se achica y se acomoda al centro de la barra mientras se hace
 * scroll. No es parallax: el logo sube con la página y, al llegar arriba, se queda y termina de acomodarse.
 *
 * Cómo funciona
 *  - [data-logo-slot]  hueco del logo en el inicio (mide lo que mide el logo grande).
 *  - [data-logo-dock]  el logo de la barra (su lugar final).
 *  - [data-logo-ghost] copia decorativa que viaja con `transform` (solo cuando hace falta).
 *  La clase en <html> dice cuál se ve: logo--hero (arriba), logo--fly (viajando), logo--dock (ya en la barra).
 *  Los cambios entre estados no se notan porque las tres piezas coinciden en posición y tamaño en cada extremo.
 *
 * Con prefers-reduced-motion no hay viaje: el logo de la barra aparece cuando el del inicio sale de pantalla.
 * Sin JavaScript se ven los dos logos, sin esconder nada.
 */
const raiz = document.documentElement;
const hueco = document.querySelector<HTMLElement>('[data-logo-slot]');
const destino = document.querySelector<HTMLElement>('[data-logo-dock]');
const fantasma = document.querySelector<HTMLElement>('[data-logo-ghost]');
const barra = destino?.closest('header') as HTMLElement | null;

type Estado = 'hero' | 'fly' | 'dock';
let estado: Estado | '' = '';
const poner = (e: Estado) => {
  if (e === estado) return;
  raiz.classList.remove('logo--hero', 'logo--fly', 'logo--dock');
  raiz.classList.add(`logo--${e}`);
  estado = e;
};
const limitar = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const suave = (t: number) => { const x = limitar(t, 0, 1); return x * x * (3 - 2 * x); };

if (hueco && destino && barra) {
  (window as Window & { czViaje?: boolean }).czViaje = true; // avisa al <head> que todo cargó
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !fantasma) quieto(hueco, barra);
  else conViaje(hueco, destino, barra, fantasma);
}

function quieto(hueco: HTMLElement, barra: HTMLElement) {
  const alto = barra.getBoundingClientRect().height;
  new IntersectionObserver(
    ([e]) => poner(!e.isIntersecting && e.boundingClientRect.bottom < alto + 1 ? 'dock' : 'hero'),
    { rootMargin: `-${alto}px 0px 0px 0px`, threshold: 0 },
  ).observe(hueco);
}

function conViaje(hueco: HTMLElement, destino: HTMLElement, barra: HTMLElement, fantasma: HTMLElement) {
  let m = medir();
  let p = limitar(scrollY / m.d, 0, 1); // avance visible (0 arriba, 1 en la barra), suavizado
  let raf = 0;

  function medir() {
    const h = hueco.getBoundingClientRect();
    const d = destino.getBoundingClientRect();
    const alto = barra.getBoundingClientRect().height;
    const y0 = h.top + scrollY;
    return {
      x0: h.left + scrollX, y0, w0: h.width, h0: h.height,
      x1: d.left, y1: d.top, k1: d.width / h.width,
      // distancia de scroll del viaje: hasta que el borde de abajo del logo llegaría a la barra
      d: limitar(y0 + h.height - alto, 160, 420),
    };
  }

  function ajustar() {
    m = medir();
    fantasma.style.width = `${m.w0}px`;
    fantasma.style.height = `${m.h0}px`;
  }

  function pintar() {
    raf = 0;
    const s = Math.max(0, scrollY);
    const meta = limitar(s / m.d, 0, 1);
    p += (meta - p) * 0.2; // sigue al scroll con un pequeño retraso, para que no se sienta a tirones
    if (Math.abs(meta - p) < 0.001) p = meta;
    else raf = requestAnimationFrame(pintar);

    if (p <= 0) return poner('hero');
    if (p >= 1) return poner('dock');
    const e = 0.5 - 0.5 * Math.cos(Math.PI * p); // entra y sale suave
    const k = 1 + (m.k1 - 1) * e;
    const x = m.x0 + (m.x1 - m.x0) * e;
    const y = Math.max(m.y1, m.y0 - s); // sube con la página hasta la barra y ahí se queda
    fantasma.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) scale(${k.toFixed(4)})`;
    raiz.style.setProperty('--nav-o', suave((p - 0.72) / 0.28).toFixed(3)); // los enlaces vuelven al final
    poner('fly');
  }

  const pedir = () => { if (!raf) raf = requestAnimationFrame(pintar); };
  const remedir = () => { ajustar(); pedir(); };

  ajustar();
  pintar();
  addEventListener('scroll', pedir, { passive: true });
  addEventListener('resize', remedir);
  addEventListener('load', remedir);
  document.fonts?.ready.then(remedir);
  new ResizeObserver(remedir).observe(hueco);
}
