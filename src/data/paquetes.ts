/*
 * Paquetes reales de Chiquizone (fuente: hoja "Precios y paquetes").
 * Para cambiar un precio o un juego, edita solo este archivo.
 *
 * Al lanzar se contratan Baby baby y Pro Baby (decisión de Sant, issue #5). Un paquete se ve en el sitio y lo recomienda el
 * asistente únicamente si tiene `disponible: true`; cuando llegue otro kit, cámbialo aquí y el sitio
 * vuelve a mostrar sus preguntas, secciones y precios sin tocar nada más.
 */

export type Familia = 'baby' | 'terreneitor';

export interface Paquete {
  id: string;
  nombre: string;
  familia: Familia;
  splash: boolean;
  pro: boolean;
  /** Se puede contratar hoy. Lo que no existe todavía no se muestra ni se recomienda. */
  disponible: boolean;
  precio: number;
  incluye: string[];
  /** Lo que suma la versión Pro sobre la base. */
  extras?: string[];
  cuidadoras?: number;
}

export const familias: Record<Familia, { nombre: string; edades: string; resumen: string }> = {
  baby: {
    nombre: 'Baby baby',
    edades: '4 meses a 3 años',
    resumen: 'Suave, acolchado y a su altura, para los que gatean y dan sus primeros pasos.',
  },
  terreneitor: {
    nombre: 'Terreneitor',
    // TODO: confirmar rango de edad con Sant
    edades: '3 a 8 años',
    resumen: 'Para los que ya corren, brincan y quieren retos: bicis, bolos y montaña rusa.',
  },
};

const babyBase = [
  'Brincolín baby',
  'Resbaladilla',
  'Mecedoras',
  'Baby gym',
  'Alberca de pelotas',
  'Juguetes para bebé',
  'Tatami acolchado',
  'Corral perimetral',
];

const terreneitorBase = [
  'Brincolín Swap',
  'Alberca con 1,000 pelotas',
  'Montaña rusa',
  '4 bicis de equilibrio',
  'Bolos',
  'Tatami acolchado',
  'Corral perimetral',
];

const babySplashBase = [
  'Brincolín baby',
  'Resbaladilla',
  'Mecedoras',
  'Alberca de pelotas (sin agua)',
  'Juguetes para bebé',
  'Tatami acolchado',
  'Mesa de agua',
  'Tapete fuente',
  'Alberca con agua y patitos',
];

const terreneitorSplashBase = [
  'Brincolín Splash & Swap',
  'Alberca con 1,000 pelotas',
  'Montaña rusa',
  '4 bicis de equilibrio',
  'Bolos',
  'Tatami acolchado',
];

export const paquetes: Paquete[] = [
  {
    id: 'baby-baby', nombre: 'Baby baby', familia: 'baby', splash: false, pro: false, disponible: true,
    // Subió de $1,870 a $1,970 (aprobado por Sant, 3 nov 2026).
    precio: 1970, incluye: babyBase,
  },
  {
    id: 'pro-baby', nombre: 'Pro Baby', familia: 'baby', splash: false, pro: true, disponible: true,
    // Subió de $3,200 a $3,750 con 2 cuidadoras (decidido por Sant, 3 nov 2026).
    precio: 3750, incluye: babyBase, cuidadoras: 2,
    extras: ['2 cuidadoras', 'Montaña rusa', 'Máquina de burbujas'],
  },
  {
    id: 'terreneitor', nombre: 'Terreneitor', familia: 'terreneitor', splash: false, pro: false, disponible: false,
    precio: 1970, incluye: terreneitorBase,
  },
  {
    id: 'terreneitor-pro', nombre: 'Terreneitor Pro', familia: 'terreneitor', splash: false, pro: true, disponible: false,
    precio: 3700, incluye: terreneitorBase, cuidadoras: 3,
    extras: ['3 cuidadoras', 'Montaña rusa extra', '2 Velociraptors (cuatrimotos eléctricas de 6 V)', 'Máquina de burbujas'],
  },
  {
    id: 'baby-baby-splash', nombre: 'Baby baby Splash', familia: 'baby', splash: true, pro: false, disponible: false,
    precio: 2370, incluye: babySplashBase,
  },
  {
    id: 'pro-baby-splash', nombre: 'Pro Baby Splash', familia: 'baby', splash: true, pro: true, disponible: false,
    precio: 3770, incluye: babySplashBase, cuidadoras: 2,
    extras: ['2 cuidadoras', 'Montaña rusa', 'Máquina de burbujas', 'Peces luminosos en la alberca de agua'],
  },
  {
    id: 'terreneitor-splash', nombre: 'Terreneitor Splash', familia: 'terreneitor', splash: true, pro: false, disponible: false,
    precio: 2670, incluye: terreneitorSplashBase,
  },
  {
    id: 'terreneitor-splash-pro', nombre: 'Terreneitor Splash Pro', familia: 'terreneitor', splash: true, pro: true, disponible: false,
    precio: 4300, incluye: terreneitorSplashBase, cuidadoras: 3,
    extras: ['3 cuidadoras', 'Montaña rusa extra', '2 Velociraptors (cuatrimotos eléctricas de 6 V)', 'Máquina de burbujas', 'Doble tobogán de agua'],
  },
];

/** Lo que se muestra y se recomienda hoy. */
export const publicados = paquetes.filter((p) => p.disponible);
if (publicados.length === 0) {
  throw new Error('Ningún paquete está disponible: activa al menos uno con `disponible: true` en src/data/paquetes.ts.');
}

export const precioDesde = Math.min(...publicados.map((p) => p.precio));

const distintos = (f: (p: Paquete) => unknown) => new Set(publicados.map(f)).size > 1;

/** Qué puede elegir realmente el cliente entre los paquetes publicados (cada una es una pregunta de "Arma tu zona"). */
export const opciones = {
  edad: distintos((p) => p.familia),
  agua: distintos((p) => p.splash),
  pro: distintos((p) => p.pro),
};
export const preguntasActivas = Object.values(opciones).filter(Boolean).length;
export const hayPro = publicados.some((p) => p.pro);
export const haySplash = publicados.some((p) => p.splash);
export const familiasPublicadas = (['baby', 'terreneitor'] as const).filter((f) => publicados.some((p) => p.familia === f));
/** Con un solo paquete no hay nada que elegir: el sitio se vuelve más sencillo. */
export const unico = publicados.length === 1;

/** Lo que va en todos los paquetes. */
export const incluidoSiempre = [
  'Montaje una hora antes de la fiesta',
  'Desmontaje al terminar',
  'Sanitización pieza por pieza',
  'Traslado dentro de San Juan del Río',
];
