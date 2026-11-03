# Identidad visual · arte automático

Aquí vive la parte que leen las máquinas del **Manual de identidad visual de Chiquizone**. El manual explica el porqué; estos archivos hacen que cada imagen nueva salga con el estilo sin depender de quién la haga.

| Archivo | Qué es |
|---|---|
| `estilo.json` | Reglas de marca: paleta y roles, temas permitidos, tipografía, formatos, reglas de texto y los bloques de estilo para IA. |
| `piezas-ejemplo.json` / `.csv` | Ejemplos de piezas listas para generar. El CSV tiene las mismas columnas que puede tener la Central de contenido. |
| `assets/logos/` | Logos oficiales en alta resolución (copia de `marca/logos`). |
| `../scripts/arte/generar.mjs` | Dibuja las piezas en PNG con las plantillas de marca y valida que no se salgan del manual. |
| `../scripts/arte/imagen-ia.mjs` | Pide la imagen a ChatGPT (API de OpenAI) cuando corres con `--ia`. |
| `../scripts/arte/prompt.mjs` | Arma el prompt de imagen con el estilo fijo; tú solo describes la escena. |

## Uso

```bash
npm i -D playwright && npx playwright install chromium   # una sola vez

npm run arte -- identidad/piezas-ejemplo.json            # PNG en arte/salida/
npm run arte -- piezas.csv --solo promo-baby             # una sola pieza
npm run prompt -- --escena "brincolín blanco y corral de colores en un jardín" --hueco arriba
```

## Imágenes con ChatGPT

Con `--ia`, cada pieza que trae `escena` y no trae `foto` recibe una imagen generada por la API de imágenes de OpenAI, con el prompt de marca. La IA solo hace la foto o ilustración; logo, textos y colores los pone la plantilla, y esas piezas nunca llevan "Montaje real".

1. Crea una clave en platform.openai.com/api-keys (se paga por imagen).
2. Copia `.env.example` como `.env` y pega la clave. `.env` no se sube al repo.
3. `npm run arte -- piezas.csv --ia`

Las imágenes quedan en `arte/fotos-ia/<id>.png` y se reutilizan en la siguiente corrida, así no se paga dos veces. Para pedir otra, borra ese archivo. Modelo y calidad se cambian con `OPENAI_IMAGE_MODEL` y `OPENAI_IMAGE_QUALITY` en `.env`.

## Cómo se hace una variante

Una pieza se multiplica por `temas × formatos × variantes`:

- **Temas:** `crema` (por defecto), `sol`, `salvia`, `frambuesa` (fondos en tinte suave) y `marino` (noche).
- **Formatos:** `post` 1080×1350, `cuadrado` 1080×1080, `historia` 1080×1920.
- **Variantes:** cambian solo lo que el manual deja mover (lado de los globos, giro de la foto, inicio de los banderines, chispas). La misma pieza y número de variante siempre dan la misma imagen.

## Lo que el generador rechaza

Temas o formatos que no existen, títulos sin exactamente una palabra en `*cursiva*`, títulos demasiado largos, emojis, `!!`, palabras en MAYÚSCULAS, promos sin nombre o precio, y la etiqueta "Montaje real" sobre una imagen generada con IA. Con `--forzar` dibuja de todos modos para ver el problema.
