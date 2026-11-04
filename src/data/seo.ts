/*
 * Páginas del sitio y lo que los buscadores leen de cada una: título, descripción y resumen.
 * Es la única lista: de aquí salen las metaetiquetas, el mapa del sitio (sitemap.xml), llms.txt,
 * las migas de pan, los enlaces del pie y los bloques "Sigue leyendo". Para sumar una página, agrégala aquí.
 *
 * Reglas para escribir título y descripción (la prueba `npm run seo` las revisa):
 * - Título: una frase que dice lo que la persona busca, con "Chiquizone" al final. Procura 60 caracteres o menos.
 * - Descripción: entre 70 y 160 caracteres, con un dato concreto (zona, precio, edad). Sin frases de relleno.
 * - Los precios salen de paquetes.ts: nunca se escriben a mano aquí.
 */
import { site, mxn } from './site';
import { publicados } from './paquetes';
import { complementosPublicados } from './complementos';

export interface Pagina {
  ruta: string;
  /** Lo que se lee en la pestaña y en el resultado de Google. */
  titulo: string;
  descripcion: string;
  /** Nombre corto: migas de pan, pie de página y llms.txt. */
  nombre: string;
  /** Una frase para las tarjetas "Sigue leyendo" y para llms.txt. */
  resumen: string;
  /** Archivo de `src/icons/` (sin .svg). */
  icono: string;
}

const precios = publicados.map((p) => `${p.nombre} ${mxn(p.precio)}`).join(' y ');
const complementoDesde = Math.min(...complementosPublicados.map((c) => c.precio ?? Math.min(...c.opciones!.map((o) => o.precio))));
const [zonaA, zonaB] = site.areas;

export const paginas = {
  inicio: {
    ruta: '/',
    titulo: `${site.name} | Zonas de juego y juegos infantiles para fiestas`,
    descripcion: `Playground móvil y zonas de juego para fiestas infantiles en ${zonaA} y ${zonaB}. Montamos, cuidamos y recogemos. Cotiza por WhatsApp.`,
    nombre: 'Inicio',
    resumen: 'Zonas de juego para fiestas infantiles: paquetes, cómo funciona y preguntas frecuentes.',
    icono: 'casa',
  },
  playground: {
    ruta: '/playground-movil/',
    titulo: `Playground móvil para fiestas infantiles | ${site.name}`,
    descripcion: `Qué es un playground móvil, qué trae y cuánto espacio necesita. Lo montamos en tu casa, jardín o salón en ${zonaA} y ${zonaB}.`,
    nombre: 'Playground móvil',
    resumen: 'Qué es un playground móvil, qué trae la zona, cuánto espacio pide y cómo se reserva.',
    icono: 'fiesta',
  },
  bebes: {
    ruta: '/juegos-para-bebes/',
    titulo: `Juegos para bebés y primer cumpleaños | ${site.name}`,
    descripcion: 'Zona de juego acolchada para niños de 4 meses a 3 años: tatami, corral, resbaladilla, alberca de pelotas y más. Ideal para primeros cumpleaños.',
    nombre: 'Juegos para bebés',
    resumen: 'La zona Baby baby, para niños de 4 meses a 3 años: qué piezas trae y cómo cuidamos la seguridad.',
    icono: 'bebe',
  },
  cuidadoras: {
    ruta: '/cuidadoras-para-fiestas-infantiles/',
    titulo: `Cuidadoras para fiestas infantiles | ${site.name}`,
    descripcion: 'Con Pro Baby, dos cuidadoras se quedan toda la fiesta en la zona de juego para que tú atiendas a tus invitados. Qué hacen y qué no.',
    nombre: 'Cuidadoras para fiestas',
    resumen: 'Qué hacen las cuidadoras del paquete Pro Baby, cuántas son y qué no hacen.',
    icono: 'cuidado',
  },
  precios: {
    ruta: '/precios/',
    titulo: `Precios de zonas de juego para fiestas | ${site.name}`,
    descripcion: `${precios}, con todo lo que incluye cada uno. Complementos desde ${mxn(complementoDesde)}. Apartas con el ${site.bookingDepositPct} % del total.`,
    nombre: 'Precios',
    resumen: 'Precio de cada paquete y de cada complemento, cómo se aparta y cuánto es la garantía.',
    icono: 'info',
  },
  sjr: {
    ruta: '/san-juan-del-rio/',
    titulo: `Renta de juegos infantiles en ${zonaA} | ${site.name}`,
    descripcion: `Zonas de juego para fiestas infantiles en ${zonaA}, con traslado incluido. Montamos una hora antes y recogemos al terminar.`,
    nombre: zonaA,
    resumen: `Servicio en ${zonaA}: traslado incluido, horario de montaje y cómo apartar tu fecha.`,
    icono: 'ubicacion',
  },
  tequis: {
    ruta: '/tequisquiapan/',
    titulo: `Zonas de juego para fiestas en ${zonaB} | ${site.name}`,
    descripcion: `Llevamos la zona de juego a tu fiesta en ${zonaB}. El traslado se cotiza según la dirección; escríbenos y te respondemos el mismo día.`,
    nombre: zonaB,
    resumen: `Servicio en ${zonaB}: cómo se cotiza el traslado y qué necesitamos del lugar.`,
    icono: 'traslado',
  },
} satisfies Record<string, Pagina>;

export type PaginaId = keyof typeof paginas;

export const todas = (Object.entries(paginas) as [PaginaId, Pagina][]).map(([id, p]) => ({ id, ...p }));
/** Todas menos el inicio: las que se enlazan desde el pie y desde "Sigue leyendo". */
export const temas = todas.filter((p) => p.id !== 'inicio');

/** Dirección completa de una ruta del sitio. */
export const urlDe = (ruta: string) => new URL(ruta, site.url).toString();
