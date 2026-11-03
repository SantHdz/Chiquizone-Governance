/*
 * llms.txt: un resumen en texto plano del negocio para que un asistente de IA lo lea de un vistazo.
 * Se arma con los mismos datos que el sitio (precios, zonas, reglas), así nunca dice algo distinto.
 *
 * Ojo: llms.txt es una convención reciente y ningún buscador grande ha confirmado que la use para
 * posicionar. Cuesta poco y no hace daño, pero lo que más pesa para aparecer en una IA es el contenido
 * de las páginas, los datos estructurados y que el sitio esté indexado (docs/seo.md).
 */
import type { APIRoute } from 'astro';
import { site, mxn, pct } from '../data/site';
import { publicados, familias } from '../data/paquetes';
import { complementosPublicados, combosPublicados, trae } from '../data/complementos';
import { temas, urlDe } from '../data/seo';

const [sjr, tequis] = site.areas;

export const GET: APIRoute = () => {
  const paquetes = publicados.map((p) => {
    const extra = p.pro ? `; ${p.cuidadoras} cuidadoras toda la fiesta, ${(p.extras ?? []).filter((x) => !/cuidadoras/i.test(x)).join(' y ').toLowerCase()}` : '';
    return `- ${p.nombre}: ${mxn(p.precio)}. Para niños de ${familias[p.familia].edades}${extra}.`;
  });
  const precioDe = (c: (typeof complementosPublicados)[number]) => (c.opciones ? c.opciones.map((o) => `${o.etiqueta.toLowerCase()} ${mxn(o.precio)}`).join(', ') : mxn(c.precio!));
  /* "(solo en Baby baby)" cuando un complemento no se ofrece en todos los paquetes publicados. */
  const dondeSe = (ids: string[]) => {
    const n = publicados.filter((p) => ids.includes(p.id)).map((p) => p.nombre);
    return n.length === publicados.length ? '' : ` (solo en ${n.join(' y ')})`;
  };
  const complementos = complementosPublicados.map((c) => `- ${c.nombre}: ${precioDe(c)}${dondeSe(c.paquetes)}.`);
  const combos = combosPublicados.map((k) => `- ${k.nombre} (${trae(k).toLowerCase()}): ${mxn(k.precio)}${dondeSe(k.paquetes)}.`);

  const cuerpo = [
    `# ${site.name}`,
    '',
    `> Renta de zonas de juego (playground móvil) para fiestas infantiles en ${sjr} y ${tequis}, ${site.region}, México. Montamos la zona en tu casa, jardín o salón, la sanitizamos pieza por pieza y la recogemos al terminar.`,
    '',
    '## Datos básicos',
    `- Servicio: ${site.serviceHours} horas de juego. Llegamos una hora antes a montar y recogemos al terminar.`,
    `- Dónde: ${sjr} (traslado incluido) y ${tequis} (el traslado se cotiza según la dirección).`,
    `- Espacio necesario: ${site.spaceNeeded}, techado o con sombra, con piso plano y un contacto eléctrico a menos de diez metros.`,
    `- Cómo se aparta: anticipo del ${pct(site.bookingDepositPct)} del total por transferencia, contrato con copia de INE y depósito de ${mxn(site.guaranteeDeposit)} en garantía que se devuelve al terminar.`,
    `- Cómo cotizar: por WhatsApp al ${site.phoneDisplay} o en ${site.email}. Respondemos el mismo día. La disponibilidad de la fecha la confirma una persona.`,
    '- Moneda: pesos mexicanos (MXN).',
    '',
    '## Paquetes',
    ...paquetes,
    '',
    '## Complementos (se suman al paquete)',
    ...combos,
    ...complementos,
    '',
    '## Páginas',
    ...temas.map((p) => `- [${p.nombre}](${urlDe(p.ruta)}): ${p.resumen}`),
    `- [Inicio](${urlDe('/')}): ${site.tagline}, arma tu zona y cotiza.`,
    '',
  ].join('\n');
  return new Response(cuerpo, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
