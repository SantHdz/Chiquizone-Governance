#!/usr/bin/env python3
"""
Vectoriza el logo vertical de Chiquizone (PNG) y escribe src/components/LogoSprite.astro.

PROVISIONAL: cuando exista el SVG oficial exportado desde Affinity, se reemplaza el <symbol>
de LogoSprite.astro con ese archivo y este script deja de hacer falta.

Uso:
  python3 -m pip install vtracer pillow numpy
  python3 scripts/vectorizar-logo.py

Cómo funciona:
  1. Amplía el PNG 4 veces y asigna cada píxel a uno de los cuatro colores de marca
     (proyección sobre el segmento entre dos colores, para no inventar bordes de otro color).
  2. Traza esa imagen plana con vtracer (modo recorte, curvas).
  3. Quita lo transparente, vuelve a la escala original, une las piezas por color
     y deja aparte las cuatro chispas para animarlas.
"""
import os
import re
import sys
import tempfile
from pathlib import Path

if os.environ.get('VTRACER_PATH'):
    sys.path.insert(0, os.environ['VTRACER_PATH'])

import numpy as np
from PIL import Image
import vtracer

RAIZ = Path(__file__).resolve().parent.parent
ORIGEN = RAIZ / 'public/brand/chiquizone-vertical.png'
SALIDA = RAIZ / 'src/components/LogoSprite.astro'
ESCALA = 4

# clase -> color exacto de marca (marino-500, frambuesa-500, sol-500, salvia-500)
PALETA = {
    'lg-m': (0x25, 0x3D, 0x78),
    'lg-f': (0xB5, 0x45, 0x6F),
    'lg-s': (0xFF, 0xD2, 0x35),
    'lg-v': (0xA2, 0xC2, 0x98),
}
CLASES = list(PALETA)
CLAVE = (255, 0, 255)  # color de "transparente" para el trazo; se descarta después


def imagen_plana(destino: Path) -> tuple[int, int]:
    img = Image.open(ORIGEN).convert('RGBA')
    ancho, alto = img.size
    grande = img.resize((ancho * ESCALA, alto * ESCALA), Image.LANCZOS)
    arr = np.asarray(grande, dtype=np.float32)
    alfa, rgb = arr[..., 3], arr[..., :3]
    cols = np.array([PALETA[c] for c in CLASES], dtype=np.float32)
    etiqueta = np.zeros(alfa.shape, dtype=np.uint8)
    mejor = np.full(alfa.shape, np.inf, dtype=np.float32)
    for i in range(len(CLASES)):
        for j in range(i + 1, len(CLASES)):
            a = cols[i]
            d = cols[j] - a
            t = np.clip(((rgb - a) @ d) / float((d * d).sum()), 0, 1)
            res = ((rgb - (a + t[..., None] * d)) ** 2).sum(-1)
            m = res < mejor
            mejor[m] = res[m]
            etiqueta[m] = np.where(t[m] < 0.5, i, j)
    plana = np.zeros(alfa.shape + (3,), dtype=np.uint8)
    for i, c in enumerate(CLASES):
        plana[etiqueta == i] = PALETA[c]
    plana[alfa < 128] = CLAVE
    Image.fromarray(plana).save(destino)
    return ancho, alto


def piezas(svg: str):
    """Devuelve (clase, subtrazos, bbox) de cada pieza con color de marca, ya en la escala original."""
    hex_a_clase = {'#%02X%02X%02X' % rgb: c for c, rgb in PALETA.items()}
    for etiqueta in re.findall(r'<path\b[^>]*>', svg):
        d = re.search(r' d="([^"]*)"', etiqueta).group(1)
        color = re.search(r'fill="(#[0-9A-Fa-f]{6})"', etiqueta).group(1).upper()
        if color not in hex_a_clase:
            continue  # lo transparente
        tr = re.search(r'translate\(([-\d.]+),([-\d.]+)\)', etiqueta)
        tx, ty = (float(tr.group(1)), float(tr.group(2))) if tr else (0.0, 0.0)
        partes = re.findall(r'[MCLZ]|-?\d+(?:\.\d+)?', d)
        salida, nums, xs, ys = [], [], [], []
        for p in partes:
            if p in 'MCLZ':
                salida.append(p)
            else:
                nums.append(float(p))
                if len(nums) == 2:
                    x, y = (nums[0] + tx) / ESCALA, (nums[1] + ty) / ESCALA
                    xs.append(x)
                    ys.append(y)
                    salida.append(f'{x:.1f} {y:.1f}')
                    nums = []
        yield hex_a_clase[color], ' '.join(salida), (min(xs), min(ys), max(xs), max(ys))


def main():
    with tempfile.TemporaryDirectory() as tmp:
        plana, trazo = Path(tmp) / 'plana.png', Path(tmp) / 'trazo.svg'
        ancho, alto = imagen_plana(plana)
        vtracer.convert_image_to_svg_py(
            str(plana), str(trazo), colormode='color', hierarchical='cutout', mode='spline',
            filter_speckle=8, color_precision=8, layer_difference=4, corner_threshold=60,
            length_threshold=6.0, max_iterations=10, splice_threshold=45, path_precision=1,
        )
        svg = trazo.read_text()

    grandes = {c: [] for c in CLASES}
    chispas = []
    for clase, d, (x0, y0, x1, y1) in piezas(svg):
        # chispas: trazos pequeños fuera de las caritas, arriba a izquierda y derecha del logo
        es_chispa = (y1 < 100 and (x1 < 200 or x0 > 595)) and (x1 - x0) < 40 and (y1 - y0) < 40
        (chispas if es_chispa else grandes[clase]).append((clase, d, x0, y0))

    lineas = []
    for clase in CLASES:
        d = ' '.join(p[1] for p in grandes[clase])
        lineas.append(f'    <path class="{clase}" fill-rule="evenodd" d="{d}" />')
    chispas.sort(key=lambda c: (c[2] > 320, c[3]))  # izquierda de arriba abajo, luego derecha
    for i, (clase, d, _, _) in enumerate(chispas, 1):
        lineas.append(f'    <path class="{clase} chispa chispa-{i}" d="{d}" />')

    SALIDA.write_text(
        '---\n'
        '/*\n'
        ' * Logo de Chiquizone (versión vertical) como <symbol>. Se define una sola vez por página y se usa con\n'
        ' * <use href="#cz-logo"> en el inicio, la barra y el viaje del scroll. Los colores salen de las\n'
        ' * variables --logo-* (tokens), así el logo se adapta al tema marino.\n'
        ' * PROVISIONAL: vectorizado del PNG con scripts/vectorizar-logo.py hasta tener el SVG oficial.\n'
        ' */\n'
        '---\n'
        '<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">\n'
        f'  <symbol id="cz-logo" viewBox="0 0 {ancho} {alto}">\n'
        + '\n'.join(lineas) + '\n'
        '  </symbol>\n'
        '</svg>\n'
    )
    print(f'LogoSprite.astro escrito: {SALIDA.stat().st_size} bytes, {len(chispas)} chispas')


if __name__ == '__main__':
    main()
