import { describe, expect, it } from 'vitest';
import { buscar, huella, idDeVector, modoDe, reindexar, MODELO_EMBEDDING, MODELO_RERANKER } from '../src/busqueda';
import { fragmentos } from '../src/conocimiento';
import { autorizado, resumir } from '../src/admin';
import { preguntasDePrueba } from '../src/preguntas';
import { SISTEMA, SISTEMA_BUSQUEDA } from '../src/asistente';

/** KV en memoria. */
function kv() {
  const datos = new Map<string, string>();
  return {
    datos,
    async get(k: string, tipo?: string) {
      const v = datos.get(k);
      return v === undefined ? null : tipo === 'json' ? JSON.parse(v) : v;
    },
    async put(k: string, v: string) {
      datos.set(k, v);
    },
  } as unknown as KVNamespace & { datos: Map<string, string> };
}

/** Vectorize en memoria: guarda lo que se sube y devuelve lo que se le pida. */
function vectorize(respuesta: string[] = []) {
  const guardados = new Map<string, { metadata?: Record<string, unknown> }>();
  const borrados: string[] = [];
  return {
    guardados,
    borrados,
    async upsert(v: { id: string; metadata?: Record<string, unknown> }[]) {
      for (const x of v) guardados.set(x.id, x);
      return { ids: v.map((x) => x.id), count: v.length };
    },
    async deleteByIds(ids: string[]) {
      borrados.push(...ids);
      return { ids, count: ids.length };
    },
    async query() {
      return { count: respuesta.length, matches: respuesta.map((id, i) => ({ id: `v${i}`, score: 1 - i / 10, metadata: { fragmento: id } })) };
    },
  } as unknown as VectorizeIndex & { guardados: Map<string, unknown>; borrados: string[] };
}

/** Workers AI de mentira: embeddings fijos y un reranker que invierte el orden. */
function ai({ falla = false } = {}) {
  const llamadas: { modelo: string; entrada: Record<string, unknown> }[] = [];
  return {
    llamadas,
    async run(modelo: string, entrada: Record<string, unknown>) {
      llamadas.push({ modelo, entrada });
      if (modelo === MODELO_EMBEDDING) return { data: (entrada.text as string[]).map(() => [0.1, 0.2]) };
      if (modelo === MODELO_RERANKER) {
        if (falla) throw new Error('caído');
        const n = (entrada.contexts as unknown[]).length;
        return { response: Array.from({ length: n }, (_, i) => ({ id: i, score: i })) };
      }
      throw new Error(`modelo inesperado ${modelo}`);
    },
  } as unknown as Ai & { llamadas: { modelo: string; entrada: Record<string, unknown> }[] };
}

describe('interruptor del conocimiento', () => {
  it('queda en "completo" salvo que se pida "busqueda" y existan los bindings', () => {
    const base = { CONVERSACIONES: kv() };
    expect(modoDe(base)).toBe('completo');
    expect(modoDe({ ...base, MODO_CONOCIMIENTO: 'busqueda' })).toBe('completo');
    expect(modoDe({ ...base, MODO_CONOCIMIENTO: 'busqueda', AI: ai(), VECTORIZE: vectorize() })).toBe('busqueda');
  });

  it('el prompt de búsqueda no lleva el conocimiento completo', () => {
    const muestra = fragmentos[0].texto;
    expect(SISTEMA).toContain(muestra);
    expect(SISTEMA_BUSQUEDA).not.toContain(muestra);
  });
});

describe('búsqueda', () => {
  const ids = ['servicio#limpieza', 'servicio#espacio-necesario', 'apartado#formas-de-pago'];

  it('reordena con el reranker y saca el texto del repositorio', async () => {
    const r = await buscar({ AI: ai(), VECTORIZE: vectorize(ids) }, '¿cómo limpian?', { finales: 2 });
    expect(r.map((f) => f.id)).toEqual(['apartado#formas-de-pago', 'servicio#espacio-necesario']);
    expect(r[0].texto).toBe(fragmentos.find((f) => f.id === 'apartado#formas-de-pago')!.texto);
  });

  it('ignora vectores de fragmentos que ya no existen', async () => {
    const r = await buscar({ AI: ai(), VECTORIZE: vectorize(['ya-no-existe#x', 'servicio#limpieza']) }, 'hola');
    expect(r.map((f) => f.id)).toEqual(['servicio#limpieza']);
  });

  it('si el reranker falla, usa el orden de Vectorize', async () => {
    const r = await buscar({ AI: ai({ falla: true }), VECTORIZE: vectorize(ids) }, 'hola', { finales: 2 });
    expect(r.map((f) => f.id)).toEqual(ids.slice(0, 2));
  });
});

describe('reindexado incremental', () => {
  it('sube todo la primera vez, nada si no cambió, y borra lo que se quitó', async () => {
    const env = { CONVERSACIONES: kv(), AI: ai(), VECTORIZE: vectorize(), MODO_CONOCIMIENTO: 'busqueda' };
    const primero = await reindexar(env);
    expect(primero).toMatchObject({ total: fragmentos.length, nuevos: fragmentos.length, borrados: 0 });

    const segundo = await reindexar(env);
    expect(segundo).toMatchObject({ nuevos: 0, cambiados: 0, iguales: fragmentos.length });

    const editado = fragmentos.slice(1).map((f, i) => (i === 0 ? { ...f, texto: `${f.texto} Nuevo.` } : f));
    const tercero = await reindexar(env, editado);
    expect(tercero).toMatchObject({ cambiados: 1, borrados: 1 });
    expect((env.VECTORIZE as unknown as { borrados: string[] }).borrados).toEqual([await idDeVector(fragmentos[0])]);
  });

  it('ids de vector caben en Vectorize y la huella cambia con el texto', async () => {
    for (const f of fragmentos) expect(new TextEncoder().encode(await idDeVector(f)).length).toBeLessThanOrEqual(64);
    expect(await huella(fragmentos[0])).not.toBe(await huella({ ...fragmentos[0], texto: 'otro' }));
  });
});

describe('comparación de modos', () => {
  it('cada pregunta de prueba apunta a un fragmento que existe', () => {
    const existentes = new Set(fragmentos.map((f) => f.id));
    for (const p of preguntasDePrueba) expect(existentes.has(p.esperado), p.esperado).toBe(true);
  });

  it('resume aciertos por modo', () => {
    const fila = { pregunta: 'x', esperado: 'a', citadas: [], pasoASant: false, tokensEntrada: 100, latenciaMs: 10, respuesta: '' };
    const r = resumir([
      { ...fila, modo: 'completo', cito: true },
      { ...fila, modo: 'busqueda', cito: false, encontro: true },
      { ...fila, modo: 'busqueda', cito: true, encontro: false },
    ]);
    expect(r.completo).toMatchObject({ preguntas: 1, citoLaFuenteCorrecta: '100 %' });
    expect(r.busqueda).toMatchObject({ preguntas: 2, citoLaFuenteCorrecta: '50 %', buscadorLaEncontro: '50 %' });
  });

  it('las rutas de administración piden un token largo y exacto', () => {
    const token = 'x'.repeat(32);
    expect(autorizado(`Bearer ${token}`, token)).toBe(true);
    expect(autorizado(`Bearer ${token}y`, token)).toBe(false);
    expect(autorizado(null, token)).toBe(false);
    expect(autorizado('Bearer corto', 'corto')).toBe(false);
  });
});
