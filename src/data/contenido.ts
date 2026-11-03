/*
 * Textos que usan varias páginas (inicio y páginas por tema). Viven aquí para que un requisito, un paso
 * o un dato no se diga distinto en dos lugares. Los números salen de site.ts y paquetes.ts.
 */
import { site, mxn, pct } from './site';
import { unico } from './paquetes';

export const requisitos = [
  { title: 'Zona techada o con sombra', text: 'El sol directo calienta el material y cansa a los niños.' },
  { title: 'Piso plano y libre', text: 'Sin piedras, hormigueros, desniveles ni lodo.' },
  { title: 'Contacto eléctrico cerca', text: 'A menos de diez metros del área de montaje.' },
  { title: 'Lejos de riesgos', text: 'Cocina, asador, alberca y paso de coches.' },
];

export const pasos = [
  { title: 'Nos escribes', text: 'Fecha, hora de inicio, dirección y edades de los niños.' },
  { title: 'Te cotizamos', text: unico ? 'Confirmamos que tu fecha esté libre.' : 'Confirmamos disponibilidad y el paquete ideal para tu fiesta.' },
  { title: `Apartas con el ${pct(site.bookingDepositPct)}`, text: 'Por transferencia. Se descuenta del total.' },
  { title: 'Firmamos contrato', text: `Con copia de INE y depósito de ${mxn(site.guaranteeDeposit)} en garantía.` },
  { title: 'Montamos y recogemos', text: 'Llegamos una hora antes. El depósito se devuelve al terminar.' },
];
