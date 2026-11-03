/*
 * Modo "busqueda" del conocimiento: embeddings multilingües, Vectorize y reranker.
 *
 * Apagado por defecto (decisión de Sant, 2026-11-03): se enciende con MODO_CONOCIMIENTO = "busqueda"
 * cuando el material pase de unas 50 páginas. Mientras tanto el modo "completo" manda todo en el prompt.
 *
 * El índice guarda solo vectores y el id del fragmento. El texto siempre sale de conocimiento.generado.ts,
 * así que un vector viejo nunca mete información que ya no está en el repositorio.
 */
import { fragmentos, type Fragmento } from './conocimiento';

/** Un solo modelo de embeddings para indexar y para buscar. Multilingüe, 1024 dimensiones. */
export const MODELO_EMBEDDING = '@cf/baai/bge-m3';
export const DIMENSIONES = 1024;
export const MODELO_RERANKER = '@cf/baai/bge-reranker-base';

export type Modo = 'completo' | 'busqueda';

export interface EnvBusqueda {
  MODO_CONOCIMIENTO?: string;
  AI?: Ai;
  VECTORIZE?: VectorizeIndex;
  CONVERSACIONES: KVNamespace;
}

export const modoDe = (env: EnvBusqueda): Modo =>
  env.MODO_CONOCIMIENTO === 'busqueda' && env.AI && env.VECTORIZE ? 'busqueda' : 'completo';

const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const sha256 = async (texto: string) => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto)));

/** Vectorize acepta ids de hasta 64 bytes; los ids de fragmento pueden ser más largos. */
export const idDeVector = async (f: Fragmento) => (await sha256(f.id)).slice(0, 32);

/** Cambia cuando cambia lo que se indexa: si la huella es igual, no se vuelve a calcular el embedding. */
export const huella = async (f: Fragmento) => (await sha256(`${f.titulo}\n${f.seccion}\n${f.actualizado}\n${f.texto}`)).slice(0, 16);

/** Lo que se convierte en vector: título y sección ayudan a encontrar fragmentos cortos. */
export const textoIndexable = (f: Fragmento) => `${f.titulo}. ${f.seccion}. ${f.texto}`;

async function embeddings(ai: Ai, textos: string[]): Promise<number[][]> {
  const r = (await ai.run(MODELO_EMBEDDING, { text: textos })) as { data?: number[][] };
  if (!r.data || r.data.length !== textos.length) throw new Error('El modelo de embeddings no devolvió vectores');
  return r.data;
}

export interface OpcionesBusqueda {
  /** Candidatos que trae Vectorize antes de reordenar. */
  candidatos?: number;
  /** Fragmentos que llegan al modelo. */
  finales?: number;
}

/**
 * Busca los fragmentos que responden la pregunta: Vectorize trae candidatos y el reranker los ordena.
 * Si el reranker falla, se queda el orden de Vectorize.
 */
export async function buscar(
  env: Required<Pick<EnvBusqueda, 'AI' | 'VECTORIZE'>>,
  pregunta: string,
  { candidatos = 20, finales = 5 }: OpcionesBusqueda = {},
): Promise<Fragmento[]> {
  const [vector] = await embeddings(env.AI, [pregunta]);
  const { matches } = await env.VECTORIZE.query(vector, { topK: candidatos, returnMetadata: 'all' });
  const porId = new Map(fragmentos.map((f) => [f.id, f]));
  const encontrados = [
    ...new Map(
      matches
        .map((m) => porId.get(String(m.metadata?.fragmento ?? '')))
        .filter((f): f is Fragmento => Boolean(f))
        .map((f) => [f.id, f]),
    ).values(),
  ];
  if (encontrados.length <= 1) return encontrados;

  try {
    // Los tipos de workers-types omiten `query`, que el modelo sí exige.
    const entrada = { query: pregunta, contexts: encontrados.map((f) => ({ text: textoIndexable(f) })), top_k: finales };
    const r = (await env.AI.run(MODELO_RERANKER, entrada as Ai_Cf_Baai_Bge_Reranker_Base_Input)) as {
      response?: { id?: number; score?: number }[];
    };
    const orden = (r.response ?? [])
      .filter((x) => typeof x.id === 'number' && encontrados[x.id])
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .map((x) => encontrados[x.id as number]);
    if (orden.length) return orden.slice(0, finales);
  } catch (e) {
    console.error('Reranker no disponible, uso el orden de Vectorize', e);
  }
  return encontrados.slice(0, finales);
}

export interface Reindexado {
  total: number;
  nuevos: number;
  cambiados: number;
  iguales: number;
  borrados: number;
}

const CLAVE_INDICE = 'indice:huellas';

/**
 * Reindexado incremental: solo calcula embeddings de lo nuevo o cambiado y borra lo que ya no existe.
 * El estado (id de vector → huella) vive en KV. Se llama desde POST /admin/reindexar después de cada deploy.
 */
export async function reindexar(env: Required<EnvBusqueda>, lista: Fragmento[] = fragmentos): Promise<Reindexado> {
  const previo = (await env.CONVERSACIONES.get<Record<string, string>>(CLAVE_INDICE, 'json')) ?? {};
  const actual: Record<string, string> = {};
  const pendientes: { id: string; f: Fragmento; huella: string }[] = [];
  let nuevos = 0;
  let cambiados = 0;

  for (const f of lista) {
    const id = await idDeVector(f);
    const h = await huella(f);
    actual[id] = h;
    if (previo[id] === h) continue;
    if (previo[id]) cambiados++;
    else nuevos++;
    pendientes.push({ id, f, huella: h });
  }

  for (let i = 0; i < pendientes.length; i += 50) {
    const lote = pendientes.slice(i, i + 50);
    const vectores = await embeddings(env.AI, lote.map((p) => textoIndexable(p.f)));
    await env.VECTORIZE.upsert(
      lote.map((p, j) => ({
        id: p.id,
        values: vectores[j],
        metadata: {
          fragmento: p.f.id,
          categoria: p.f.categoria,
          responsable: p.f.responsable,
          actualizado: p.f.actualizado,
          huella: p.huella,
        },
      })),
    );
  }

  const sobran = Object.keys(previo).filter((id) => !(id in actual));
  if (sobran.length) await env.VECTORIZE.deleteByIds(sobran);
  await env.CONVERSACIONES.put(CLAVE_INDICE, JSON.stringify(actual));

  return { total: lista.length, nuevos, cambiados, iguales: lista.length - nuevos - cambiados, borrados: sobran.length };
}
