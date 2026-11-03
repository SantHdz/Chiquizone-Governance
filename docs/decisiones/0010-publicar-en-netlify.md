# 0010 · Publicar el sitio en Netlify

- **Estado:** Propuesta (pendiente de la decisión de Sant)
- **Fecha:** 2026-11-03
- **Decide:** Sant

## Contexto

El sitio es estático (Astro, carpeta `dist` de cerca de 1 MB) y falta elegir dónde publicarlo antes de apuntar `chiquizone.com`. Pesaron cuatro cosas:

- **Es el sitio de un negocio.** Anuncia servicios y recibe cotizaciones, así que cuenta como uso comercial.
- **Sant revisa todo antes del lanzamiento.** Hace falta una dirección de prueba con el sitio real y una vista previa por cada PR.
- **El dominio está en Squarespace** y todavía no tiene correo propio.
- **Sant está empezando con la parte técnica.** Importan pocos pasos, poco que se pueda romper y costo cero al inicio.

## Opciones

Condiciones consultadas el 2026-11-03.

| Opción | Uso comercial en el plan gratis | Vista previa por PR | Dominio desde Squarespace | Si hay que pagar |
|---|---|---|---|---|
| **Netlify** | Sí, según su soporte (última confirmación: mayo de 2025) | Sí, no gasta créditos | 2 registros (A y CNAME) | Personal: 9 USD al mes |
| **Cloudflare Pages** | No se encontró restricción; sin confirmar con su soporte | Sí | Para usar el dominio sin www hay que mover el DNS a Cloudflare | No se encontró tope de visitas; el plan gratis permite 500 publicaciones al mes |
| **Vercel** | No: el plan Hobby es solo para uso personal no comercial | Sí | Similar a Netlify | Pro: 20 USD al mes por usuario |
| **GitHub Pages** | Zona gris: sus términos no permiten operar un negocio en línea ni sitios cuyo fin principal sea facilitar transacciones comerciales | No | Se activa a mano en los ajustes del repositorio | Gratis |

## Decisión

**Netlify, plan gratis.** Con estas reglas:

- La configuración vive en `netlify.toml`: `npm run build`, carpeta `dist`, Node 22, cabeceras de seguridad básicas y caché larga para `/_astro/*`.
- Mientras el sitio no se lance, todas las páginas llevan `X-Robots-Tag: noindex`. Se quita en el PR de lanzamiento.
- No se toca el DNS ni se lanza nada sin la aprobación de Sant. El orden está en [`docs/publicar.md`](../publicar.md).
- Dirección principal: `chiquizone.com` (sin www), con `www` que redirige. Coincide con la dirección canónica que ya declara el sitio. *(Propuesta; Sant la confirma.)*

## Consecuencias

- **Costo cero**, con un tope duro de 300 créditos al mes. Si se agotan, el sitio se pausa hasta pasar al plan Personal. Con el peso de hoy (unos 150 KB por visita) alcanza para decenas de miles de visitas al mes.
- **Cada merge a `main` publica** el sitio de producción y gasta 15 créditos. Las vistas previas de PR no gastan.
- **La confirmación de uso comercial es de antes de los planes por créditos.** Si Netlify cambia el plan gratis, se revisan sus términos y se pasa a Cloudflare Pages.
- **El sitio no depende de Netlify** salvo por `netlify.toml`. Cambiar de proveedor es cambiar dónde se publica.

## Fuentes (consultadas el 2026-11-03)

- Vercel: [Fair Use Guidelines](https://vercel.com/docs/limits/fair-use-guidelines#commercial-usage) y [plan Hobby](https://vercel.com/docs/plans/hobby).
- Netlify: [planes con créditos](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/), [cómo funcionan los créditos](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/how-credits-work/) y [respuesta del soporte sobre uso comercial](https://answers.netlify.com/t/can-we-use-netlify-free-plan-for-commercial-purposes/41545).
- GitHub Pages: [límites y usos no permitidos](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits).
- Cloudflare Pages: [límites](https://developers.cloudflare.com/pages/platform/limits/).
