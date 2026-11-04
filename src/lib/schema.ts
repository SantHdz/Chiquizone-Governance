/*
 * Datos estructurados (schema.org, JSON-LD) del sitio. Todo sale de site.ts, paquetes.ts y complementos.ts:
 * un precio o un dato se cambia en su archivo y aquí se actualiza solo.
 *
 * Qué NO se escribe, a propósito: calificaciones, reseñas, horario, dirección exacta ni redes sociales
 * que no existan en los datos. Un dato inventado en schema.org es peor que no tenerlo.
 */
import { site, mxn } from '../data/site';
import { publicados, familias } from '../data/paquetes';
import { complementosPublicados, combosPublicados, trae } from '../data/complementos';
import { urlDe } from '../data/seo';

export const ids = {
  negocio: urlDe('/#negocio'),
  sitio: urlDe('/#sitio'),
};

const imagen = (ruta: string, w: number, h: number) => ({ '@type': 'ImageObject', url: urlDe(ruta), width: w, height: h });
const logo = imagen('/brand/chiquizone-vertical.png', 640, 437);
const foto = imagen('/fotos/og-montaje.jpg', 1200, 630);

const pais = { '@type': 'Country', name: 'México' };
const estado = { '@type': 'State', name: site.region, containedInPlace: pais };
const areaServida = site.areas.map((name) => ({ '@type': 'City', name, containedInPlace: estado }));

const servicio = (nombre: string, descripcion?: string) => ({
  '@type': 'Service',
  name: nombre,
  ...(descripcion ? { description: descripcion } : {}),
  serviceType: 'Renta de zonas de juego para fiestas infantiles',
  /* Las zonas de servicio viven en el negocio: repetirlas en cada oferta solo haría pesar la página. */
  provider: { '@id': ids.negocio },
});

const oferta = (nombre: string, precio: number, itemOffered: object, url?: string) => ({
  '@type': 'Offer',
  name: nombre,
  price: precio,
  priceCurrency: 'MXN',
  ...(url ? { url } : {}),
  itemOffered,
});

/** El catálogo con todos los precios publicados: paquetes, combos y complementos. */
function catalogo() {
  const items = [
    ...publicados.map((p) =>
      oferta(p.nombre, p.precio, servicio(p.nombre, `${p.pro ? `Todo lo de ${familias[p.familia].nombre}, más: ${(p.extras ?? []).join(', ')}.` : `Incluye: ${p.incluye.join(', ')}.`} ${site.serviceHours} horas de servicio, montaje y desmontaje incluidos.`), urlDe(`/#${p.id}`)),
    ),
    ...combosPublicados.map((k) => oferta(`${k.nombre} (${trae(k).toLowerCase()})`, k.precio, servicio(k.nombre), urlDe('/precios/'))),
    ...complementosPublicados.flatMap((c) =>
      c.opciones
        ? c.opciones.map((o) => oferta(o.nombre, o.precio, servicio(o.nombre), urlDe('/precios/')))
        : [oferta(c.nombre, c.precio!, servicio(c.nombre), urlDe('/precios/'))],
    ),
  ];
  return { '@type': 'OfferCatalog', name: 'Zonas de juego y complementos para fiestas infantiles', itemListElement: items };
}

export function negocio() {
  const todos = [...publicados.map((p) => p.precio), ...combosPublicados.map((k) => k.precio)];
  return {
    '@type': ['LocalBusiness', 'EntertainmentBusiness'],
    '@id': ids.negocio,
    name: site.name,
    description: site.description,
    url: site.url,
    logo,
    image: [foto, logo],
    email: site.email,
    telephone: `+52${site.phone}`,
    priceRange: `${mxn(Math.min(...todos))}–${mxn(Math.max(...todos))}`,
    currenciesAccepted: 'MXN',
    knowsLanguage: 'es-MX',
    areaServed: areaServida,
    address: { '@type': 'PostalAddress', addressLocality: site.areas[0], addressRegion: site.region, addressCountry: 'MX' },
    contactPoint: { '@type': 'ContactPoint', contactType: 'customer service', telephone: `+52${site.phone}`, email: site.email, availableLanguage: 'es', areaServed: 'MX' },
    ...(site.sameAs.length ? { sameAs: site.sameAs } : {}),
    hasOfferCatalog: catalogo(),
  };
}

export function sitio() {
  return {
    '@type': 'WebSite',
    '@id': ids.sitio,
    name: site.name,
    alternateName: [`${site.name} zonas de juego`, `${site.name} playground móvil`],
    url: site.url,
    inLanguage: 'es-MX',
    publisher: { '@id': ids.negocio },
  };
}

export interface Miga { nombre: string; ruta: string }

/** La página en sí, con su migas de pan si no es el inicio. */
export function pagina(opts: { ruta: string; titulo: string; descripcion: string; migas?: Miga[] }) {
  const url = urlDe(opts.ruta);
  const nodos: object[] = [
    {
      '@type': 'WebPage',
      '@id': `${url}#pagina`,
      url,
      name: opts.titulo,
      description: opts.descripcion,
      inLanguage: 'es-MX',
      isPartOf: { '@id': ids.sitio },
      about: { '@id': ids.negocio },
      primaryImageOfPage: foto,
      ...(opts.migas?.length ? { breadcrumb: { '@id': `${url}#migas` } } : {}),
    },
  ];
  if (opts.migas?.length) {
    nodos.push({
      '@type': 'BreadcrumbList',
      '@id': `${url}#migas`,
      itemListElement: opts.migas.map((m, i) => ({ '@type': 'ListItem', position: i + 1, name: m.nombre, item: urlDe(m.ruta) })),
    });
  }
  return nodos;
}
