# Benchmark: kits y servicios para fiestas infantiles

Resumen del *Reporte de referencia: benchmark global y arquitectura para sitios web de kits de fiesta infantil* (octubre de 2026) y de cómo se aplicó a Chiquizone.

## Los tres frenos del papá comprador

1. **Falta de tiempo** para coordinar a varios proveedores.
2. **Inseguridad estética:** que la fiesta no se vea bien en las fotos.
3. **Miedo logístico:** que algo no llegue o no funcione el día del evento.

## Los 15 referentes

| Grupo | Sitios |
|---|---|
| Boutiques de diseño editorial | Meri Meri, Momo Party, Bonjour Fête, Coterie Party, Harlow & Grey, Daydream Society, Oh Happy Day, Ellie and Piper |
| Fiesta en caja, personalización y SEO | Packed Party, The Party Darling, YourPartyBox, Annikids, Save the Deco, Party Pieces UK, Kara's Party Ideas y Mementi |

## Los cuatro pilares

| Pilar | Hallazgo | En Chiquizone |
|---|---|---|
| UX para papás | La conversión sube cuando el sitio elimina las "matemáticas" de planear | Arma tu zona en 3 preguntas; entrada por edad |
| UI | Las interfaces saturadas restan confianza; las premium usan lienzo crema y el color viene de la foto | Crema y blanco hueso, sombras suaves; tipografía de títulos en revisión |
| Rendimiento | Más del 75 % del descubrimiento es móvil; se abandona si la carga pasa de 2.5 s | Sitio estático, JS solo donde hace falta; meta LCP < 1.5 s |
| Contenido y SEO | La inspiración comprable y las guías capturan la búsqueda temprana | Guía semana a semana, preguntas frecuentes con datos estructurados |

## Los 10 features, adaptados

| # | Feature del benchmark | Versión Chiquizone | Estado |
|---|---|---|---|
| 1 | Arma tu kit en 3 pasos | Arma tu zona: edad, agua, cuidadoras | Hecho |
| 7 | Calculadora de fecha y garantía de entrega | ¿Tu fecha está libre? con fecha, municipio y niños | Hecho |
| 8 | Navegación por edad, color y presupuesto | La edad es la primera pregunta; familias por edad | Hecho |
| 3 | Radiografía "qué incluye" | Bloques Bento; foto cenital numerada en la fase 2 | Parcial |
| 10 | Hub editorial y checklist | Tu fiesta, semana a semana; guías locales en la fase 2 | Parcial |
| 5 | Guía de montaje | No aplica: Chiquizone monta. Se reemplaza por "Antes del evento" | Hecho |
| 9 | Reseñas con foto y datos útiles | Edad, invitados y municipio, con estrellas en Google | Fase 2 |
| 4 | Compra el look con hotspots | Galería de fiestas reales con "Quiero esta zona" | Fase 2 |
| 6 | Invitación digital para WhatsApp | Invitación con el arte de Chiquizone al reservar | Fase 2 |
| 2 | Personalizador en vivo | Nombre del festejado en el letrero de la zona | Después |

## SEO y rendimiento

- Datos estructurados: `LocalBusiness`, `Service` con un `Offer` por paquete y `FAQPage`. `AggregateRating` cuando haya reseñas reales.
- Core Web Vitals en móvil: LCP < 1.5 s, INP < 150 ms, CLS = 0.
- Open Graph en todas las páginas para que se vea bien al compartir por WhatsApp e Instagram.
