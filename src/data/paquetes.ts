/*
 * Paquetes reales de Chiquizone (fuente: hoja "Precios y paquetes").
 * Para cambiar un precio o un juego, edita solo este archivo.
 */

export type Familia = 'baby' | 'terreneitor';

export interface Paquete {
  id: string;
  nombre: string;
  familia: Familia;
  splash: boolean;
  pro: boolean;
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
    id: 'baby-baby', nombre: 'Baby baby', familia: 'baby', splash: false, pro: false,
    precio: 1870, incluye: babyBase,
  },
  {
    id: 'pro-baby', nombre: 'Pro Baby', familia: 'baby', splash: false, pro: true,
    precio: 3200, incluye: babyBase, cuidadoras: 2,
    extras: ['2 cuidadoras', 'Montaña rusa', 'Máquina de burbujas'],
  },
  {
    id: 'terreneitor', nombre: 'Terreneitor', familia: 'terreneitor', splash: false, pro: false,
    precio: 1970, incluye: terreneitorBase,
  },
  {
    id: 'terreneitor-pro', nombre: 'Terreneitor Pro', familia: 'terreneitor', splash: false, pro: true,
    precio: 3700, incluye: terreneitorBase, cuidadoras: 3,
    extras: ['3 cuidadoras', 'Montaña rusa extra', '2 Velociraptors (cuatrimotos eléctricas de 6 V)', 'Máquina de burbujas'],
  },
  {
    id: 'baby-baby-splash', nombre: 'Baby baby Splash', familia: 'baby', splash: true, pro: false,
    precio: 2370, incluye: babySplashBase,
  },
  {
    id: 'pro-baby-splash', nombre: 'Pro Baby Splash', familia: 'baby', splash: true, pro: true,
    precio: 3770, incluye: babySplashBase, cuidadoras: 2,
    extras: ['2 cuidadoras', 'Montaña rusa', 'Máquina de burbujas', 'Peces luminosos en la alberca de agua'],
  },
  {
    id: 'terreneitor-splash', nombre: 'Terreneitor Splash', familia: 'terreneitor', splash: true, pro: false,
    precio: 2670, incluye: terreneitorSplashBase,
  },
  {
    id: 'terreneitor-splash-pro', nombre: 'Terreneitor Splash Pro', familia: 'terreneitor', splash: true, pro: true,
    precio: 4300, incluye: terreneitorSplashBase, cuidadoras: 3,
    extras: ['3 cuidadoras', 'Montaña rusa extra', '2 Velociraptors (cuatrimotos eléctricas de 6 V)', 'Máquina de burbujas', 'Doble tobogán de agua'],
  },
];

export const precioDesde = Math.min(...paquetes.map((p) => p.precio));

/** Lo que va en todos los paquetes. */
export const incluidoSiempre = [
  'Montaje una hora antes de la fiesta',
  'Desmontaje al terminar',
  'Sanitización pieza por pieza',
  'Traslado dentro de San Juan del Río',
];
