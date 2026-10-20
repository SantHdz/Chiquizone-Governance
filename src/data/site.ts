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
  region: 'Querétaro',
  serviceHours: 5,
  spaceNeeded: '4 × 4 m',
  bookingDeposit: 500,
  guaranteeDeposit: 500,
};

export function whatsappLink(text = 'Hola Chiquizone, quiero cotizar una zona de juego.') {
  return `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(text)}`;
}

export const mxn = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })
    .format(n)
    .replace('MX', '');
