export const site = {
  name: 'Chiquizone',
  tagline: 'Zonas de juego para fiestas',
  description:
    'Renta de zonas de juego para fiestas infantiles en San Juan del Río y Tequisquiapan. Montamos, supervisamos y recogemos.',
  url: 'https://chiquizone.com',
  email: 'chiquizone@icloud.com',
  phone: '4271503500',
  phoneDisplay: '427 150 3500',
  whatsapp: '524271503500',
  areas: ['San Juan del Río', 'Tequisquiapan'],
  /* Perfiles oficiales (Facebook, Instagram, TikTok, Perfil de Negocio de Google). Cuando Sant pase los enlaces
   * reales se agregan aquí y salen solos en los datos estructurados; sin enlaces no se inventa ninguno. */
  sameAs: [] as string[],
  region: 'Querétaro',
  serviceHours: 5,
  spaceNeeded: '4 × 4 m',
  /* Confirmado por Sant: anticipo del 50 % del total + $500 de garantía que se devuelve (issue #3). */
  bookingDepositPct: 50,
  guaranteeDeposit: 500,
};

export function whatsappLink(text = 'Hola Chiquizone, quiero cotizar una zona de juego.') {
  return `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(text)}`;
}

/* "50 %" con espacio duro: el número y el signo no se separan al cortar línea. */
export const pct = (n: number) => `${n}\u00a0%`;

export const mxn = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })
    .format(n)
    .replace('MX', '');
