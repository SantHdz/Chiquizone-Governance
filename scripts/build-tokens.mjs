// Genera los tokens del sitio y del design system desde tokens/*.json (fuente única de verdad).
// Uso: npm run tokens
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const FILES = ['1-primitivos', '2-semanticos', '3-componentes', '4-compat-web'];
const THEMES = ['claro', 'marino'];
const layers = FILES.map((f) => JSON.parse(readFileSync(new URL(`../tokens/${f}.json`, import.meta.url), 'utf8')));
const [prim, sem, comp, compat] = layers;

// Índice de todos los tokens: nombre → { capa, grupo, value, usage }
const all = new Map();
const errors = [];
for (const layer of layers) {
  for (const [grupo, tokens] of Object.entries(layer.grupos)) {
    for (const t of tokens) {
      if (all.has(t.name)) errors.push(`Nombre repetido: ${t.name}`);
      all.set(t.name, { ...t, capa: layer.capa, grupo });
    }
  }
}

const ref = (v) => (typeof v === 'string' && /^\{[^}]+\}$/.test(v) ? v.slice(1, -1) : null);
const values = (t) => (typeof t.value === 'object' ? Object.values(t.value) : [t.value]);

// Reglas de capas: semánticos → primitivos; componentes → semánticos (color) o primitivos de medida.
const MEDIDA = new Set(['space', 'radius', 'size', 'font', 'font-size', 'font-weight', 'motion', 'shadow']);
for (const t of all.values()) {
  for (const v of values(t)) {
    const r = ref(v);
    if (!r) continue;
    const target = all.get(r);
    if (!target) { errors.push(`${t.name} apunta a {${r}}, que no existe`); continue; }
    if (t.capa === 'primitivos' && target.capa !== 'primitivos') errors.push(`${t.name}: un primitivo no puede apuntar a ${r}`);
    if (t.capa === 'semanticos' && target.capa !== 'primitivos' && target.capa !== 'semanticos') errors.push(`${t.name}: un semántico solo apunta a primitivos`);
    if (t.capa === 'componentes' && target.capa === 'primitivos' && !MEDIDA.has(target.grupo)) errors.push(`${t.name}: un componente no usa colores primitivos (${r}); usa un semántico`);
    if (t.capa === 'componentes' && target.capa === 'componentes') errors.push(`${t.name}: un componente no apunta a otro componente`);
  }
}

// Resolver a valor final por tema
function resolve(name, theme, depth = 0) {
  const t = all.get(name);
  if (!t || depth > 16) throw new Error(`No se puede resolver ${name}`);
  const v = typeof t.value === 'object' ? (t.value[theme] ?? t.value[THEMES[0]]) : t.value;
  const r = ref(v);
  return r ? resolve(r, theme, depth + 1) : v;
}

// Contraste WCAG de pares fondo/texto de componentes
const hex = (h) => (h.startsWith('#') && h.length === 7 ? [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) : null);
const lum = (c) => c.map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4)).reduce((a, x, i) => a + x * [0.2126, 0.7152, 0.0722][i], 0);
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
const report = [];
for (const t of all.values()) {
  if (t.capa !== 'componentes' || !/-(bg)$/.test(t.name)) continue;
  const fg = t.name.replace(/-bg$/, '-fg');
  if (!all.has(fg)) continue;
  for (const th of THEMES) {
    const a = hex(resolve(t.name, th)), b = hex(resolve(fg, th));
    if (!a || !b) continue;
    const r = ratio(a, b);
    report.push(`${th.padEnd(6)} ${fg} sobre ${t.name}: ${r.toFixed(2)}:1${r < 4.5 ? '  ⚠ menor a 4.5' : ''}`);
  }
}

if (errors.length) { console.error('Errores en los tokens:\n- ' + errors.join('\n- ')); process.exit(1); }

// ---- 1. CSS del sitio ----
const css = (v) => { const r = ref(v); return r ? `var(--${r})` : v; };
const block = (layer, theme) => Object.entries(layer.grupos).flatMap(([g, tokens]) => {
  const lines = tokens
    .filter((t) => theme === THEMES[0] || (typeof t.value === 'object' && t.value[theme] !== t.value[THEMES[0]]))
    .map((t) => `  --${t.name}: ${css(typeof t.value === 'object' ? t.value[theme] : t.value)};`);
  return lines.length ? [`  /* ${g} */`, ...lines] : [];
});
const out = [
  '/*',
  ' * Chiquizone · Design tokens — GENERADO por scripts/build-tokens.mjs. No editar a mano.',
  ' * Fuente: tokens/1-primitivos → 2-semanticos → 3-componentes (+ 4-compat-web).',
  ' * Los componentes usan la capa 3; un cambio en la capa 1 o 2 se propaga solo.',
  ' */',
  ':root {',
  '  /* ===== 1 · Primitivos ===== */', ...block(prim, 'claro'),
  '}',
  '',
  '/* ===== 2 · Semánticos (por tema) ===== */',
  ':root, [data-theme="claro"] {', ...block(sem, 'claro'), '}',
  '[data-theme="marino"] {', ...block(sem, 'marino'), '}',
  '',
  '/* ===== 3 · Componentes =====',
  ' * Se declaran también en cada [data-theme] para que una sección con otro tema',
  ' * recalcule sus componentes. */',
  ':root, [data-theme] {', ...block(comp, 'claro'),
  '', '  /* ===== Compat (temporal) ===== */', ...block(compat, 'claro'),
  '}',
  '',
];
writeFileSync(new URL('../src/styles/tokens.css', import.meta.url), out.join('\n'));

// ---- 2. tokens.json para el design system (formato del artifact) ----
const isColor = (t) => { try { return /^#/.test(resolve(t.name, 'claro')); } catch { return false; } };
const dsColor = [];
for (const layer of [prim, sem, comp]) {
  for (const tokens of Object.values(layer.grupos)) {
    for (const t of tokens) {
      if (!isColor(t)) continue;
      const usage = `[${layer.capa}] ${t.usage || ''}`.trim();
      if (layer.capa === 'primitivos') dsColor.push({ name: t.name, value: t.value, usage });
      else dsColor.push({ name: t.name, value: Object.fromEntries(THEMES.map((th) => [th, typeof t.value === 'object' ? t.value[th] : t.value])), usage });
    }
  }
}
const lit = (layer, grupo) => layer.grupos[grupo].map((t) => ({ name: t.name, value: resolve(t.name, 'claro'), usage: t.usage || '' }));
const compOther = Object.values(comp.grupos).flat().filter((t) => !isColor(t))
  .map((t) => ({ name: t.name, value: resolve(t.name, 'claro'), usage: `[componentes] ${ref(t.value) ? `= ${t.value}` : ''} ${t.usage || ''}`.trim() }))
  .filter((t) => /^[A-Za-z0-9 #%(),./+_-]{1,200}$/.test(t.value)); // la página del DS no admite comillas (familias tipográficas)
const ds = {
  name: 'Chiquizone', version: 2,
  meta: { source: 'chiquizone-web/tokens (scripts/build-tokens.mjs)' },
  color: { themes: [{ id: 'claro', name: 'Claro' }, { id: 'marino', name: 'Noche (marino)' }], tokens: dsColor },
  type: { fonts: [], families: { display: resolve('font-display', 'claro'), body: resolve('font-body', 'claro') }, groups: sem['estilos-texto'] },
  spacing: { tokens: lit(prim, 'space') },
  radius: { tokens: lit(prim, 'radius') },
  shadow: { note: 'Sombras planas desplazadas, como un globo apoyado en el piso.', tokens: sem.grupos.shadow.map((t) => ({ name: t.name, value: Object.fromEntries(THEMES.map((th) => [th, resolve(t.name, th)])), usage: t.usage })) },
  size: { tokens: lit(prim, 'size') },
  layout: { tokens: sem.grupos.layout.map((t) => ({ name: t.name, value: resolve(t.name, 'claro'), usage: t.usage })) },
  componentes: { tokens: compOther },
};
mkdirSync(new URL('../tokens/build/', import.meta.url), { recursive: true });
writeFileSync(new URL('../tokens/build/design-system.tokens.json', import.meta.url), JSON.stringify(ds, null, 1));

console.log(`Tokens OK: ${all.size} tokens en ${FILES.length} capas.`);
console.log(report.join('\n'));
