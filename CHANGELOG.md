# Cambios

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/). Versiones con [SemVer](https://semver.org/lang/es/).

## [Sin publicar]

### Agregado
- README como caso de estudio, registro de decisiones (`docs/decisiones/`) y resumen del benchmark.
- CI en GitHub Actions: tokens válidos y al día, y build en cada pull request.
- Plantillas de issues (bug, mejora, decisión de diseño) y CODEOWNERS.
- Licencia: todos los derechos reservados.
- Rediseño de la página: hero con la foto real del montaje, globos, banderines y chispas del logo en SVG, entradas al hacer scroll y menú móvil.
- Foto del montaje en WebP (640 y 1000 px) e imagen para redes (`public/fotos/`).
- Skill ui-ux-pro-max para guiar decisiones de UX y movimiento (PR #16).

### Cambiado
- Títulos en Fraunces con una palabra en cursiva; Fredoka queda para impacto puntual (ADR 0006, aceptada).
- Secciones con ceja, título y entradilla; "Cómo funciona" junto a los requisitos del espacio; Splash dentro de Paquetes.
- Tema oscuro (marino) automático según el sistema.

## [0.1.0] · 2026-10-30

### Agregado
- Sitio en Astro con los 8 paquetes reales y cotizador por WhatsApp.
- Tokens en tres capas con validación de contraste AA.
- Componentes revisados: Botón, Etiqueta, Tarjeta de paquete, Campo, Pasos y Loader.
- 29 íconos Phosphor Bold y plan de motion.
- Fase 1 del benchmark: Arma tu zona, ¿Tu fecha está libre?, Lo que llega a tu fiesta, Tu fiesta semana a semana y Preguntas frecuentes.
- Datos estructurados de negocio local, servicio y preguntas frecuentes.

### Cambiado
- Superficies en blanco hueso `#FFFCF7` en lugar de blanco puro.
