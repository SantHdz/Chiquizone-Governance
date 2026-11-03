# Cómo se publica el sitio

El sitio se publica en **Netlify** (plan gratis). La decisión y las opciones que se descartaron están en el [ADR 0010](decisiones/0010-publicar-en-netlify.md). Este documento explica cómo funciona y qué se hace el día del lanzamiento.

## Cómo funciona

- Netlify lee el repositorio de GitHub y usa [`netlify.toml`](../netlify.toml): corre `npm run build` y publica la carpeta `dist`, con Node 22.
- Cada pull request genera una **vista previa** con su propia dirección (`deploy-preview-<número>--<sitio>.netlify.app`). Sirve para revisar el cambio real antes de aceptarlo y no gasta créditos.
- Cada merge a `main` publica el **sitio de producción** en `<sitio>.netlify.app` y, una vez conectado, en `chiquizone.com`. Cada publicación de producción gasta 15 créditos.
- Mientras el sitio no se lance, `netlify.toml` incluye `X-Robots-Tag: noindex` para que Google no lo indexe.

## Primera vez (solo una vez)

1. Crear la cuenta en [netlify.com](https://www.netlify.com/) entrando con GitHub.
2. Agregar un proyecto nuevo (*Add new project*), elegir *Import an existing project*, después GitHub, autorizar y elegir `SantHdz/Chiquizone-Governance`.
3. Netlify lee `netlify.toml`. Confirmar que el comando es `npm run build` y la carpeta es `dist`, y publicar.
4. Abrir la dirección `.netlify.app` que muestra Netlify y revisar el sitio completo: celular y computadora, tema claro y oscuro.

Los nombres de los botones de Netlify pueden cambiar un poco. Si no encuentras uno, pide ayuda con una captura.

## Lanzamiento

Solo cuando Sant lo apruebe. En este orden:

- [ ] Sant revisó el sitio completo en la dirección de prueba.
- [ ] Los datos del negocio están confirmados (issues abiertos de capacidad, traslado y contacto).
- [ ] En Netlify: *Domain management* → *Add a domain* → `chiquizone.com`. Dirección principal: `chiquizone.com` (sin www); `www` redirige.
- [ ] En Squarespace (*Domains* → `chiquizone.com` → *DNS*): un registro **A** con host `@` y valor `75.2.60.5`, y un **CNAME** con host `www` que apunte a `<sitio>.netlify.app`. Si ya hay registros A o CNAME para `@` o `www` que apunten a Squarespace, se reemplazan. No se tocan los demás registros, por ejemplo los de correo. Netlify muestra los valores exactos; si difieren de estos, valen los de Netlify.
- [ ] Esperar a que cambien los DNS, de unas horas hasta 48 horas. Netlify activa el candado HTTPS por su cuenta.
- [ ] Probar `chiquizone.com` y `www.chiquizone.com`, el botón de WhatsApp y el formulario desde un celular.
- [ ] PR de lanzamiento: quitar el bloque `X-Robots-Tag` de `netlify.toml` y marcar como aceptado el ADR 0010.

## Créditos del plan gratis

El plan gratis trae 300 créditos al mes y es un límite duro. Esto gasta créditos según la documentación de Netlify (consultada el 2026-11-03):

| Qué gasta | Créditos |
|---|---|
| 1 GB descargado por los visitantes | 20 |
| 10 000 peticiones | 2 |
| 1 publicación del sitio de producción | 15 |
| Vistas previas de PR, publicaciones de ramas y publicaciones fallidas | 0 |

El 2026-11-03 la página principal servía unos 150 KB por visita desde Netlify; las tipografías vienen de Google. Con ese peso y 10 publicaciones al mes alcanza para unas 35 mil visitas al mes. Si las fotos e ilustraciones cuadruplican el peso, alcanza para unas 10 mil. Son cálculos aproximados.

Si los créditos se agotan, el sitio se pausa y los visitantes ven un aviso de "Site not available". Se resuelve pasando al plan Personal (9 USD al mes, 1 000 créditos) o cambiando de proveedor.

## Si algo sale mal

- **Una publicación rompió el sitio.** En Netlify, *Deploys* → elegir una publicación anterior que funcionaba → *Publish deploy*. Después se corrige por PR.
- **El dominio no carga.** Revisar en Squarespace que los registros A y CNAME estén guardados y esperar la propagación, hasta 48 horas.
- **El build falla.** Netlify muestra el registro de la publicación. El error suele ser el mismo que da `npm run build` en tu computadora.

## Cambiar de proveedor

El sitio es estático y no depende de Netlify. En cualquier proveedor basta con `npm run build`, la carpeta `dist` y Node 22. La alternativa de respaldo es Cloudflare Pages (ver el ADR 0010).
