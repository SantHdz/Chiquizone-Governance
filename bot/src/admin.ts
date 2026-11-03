/*
 * Rutas de administración, protegidas con ADMIN_TOKEN (secreto de Cloudflare).
 *
 * POST /admin/reindexar  reindexado incremental de conocimiento/ en Vectorize. Se corre después de cada deploy.
 * POST /admin/comparar   las mismas preguntas de prueba en modo "completo" y "busqueda". Gasta tokens.
 *
 * Ninguna ruta toca a clientas reales: comparar usa una agenda vacía y no avisa a Sant.
 */
import Anthropic from '@anthropic-ai/sdk';
import { responder } from './asistente';
import { buscar, reindexar, type EnvBusqueda } from './busqueda';
import { fuentesCitadas } from './conocimiento';
import { preguntasDePrueba } from './preguntas';

export interface EnvAdmin extends EnvBusqueda {
  ADMIN_TOKEN?: string;
  ANTHROPIC_API_KEY: string;
}

/** Comparación en tiempo constante para que el token no se adivine por latencia. */
export function autorizado(cabecera: string | null, token: string | undefined): boolean {
  if (!token || token.length < 24 || !cabecera) return false;
  const esperado = `Bearer ${token}`;
  if (esperado.length !== cabecera.length) return false;
  let diff = 0;
  for (let i = 0; i < esperado.length; i++) diff |= esperado.charCodeAt(i) ^ cabecera.charCodeAt(i);
  return diff === 0;
}

export interface FilaComparacion {
  pregunta: string;
  esperado: string;
  modo: 'completo' | 'busqueda';
  /** Solo en "busqueda": si el buscador trajo el fragmento esperado. */
  encontro?: boolean;
  /** Si la respuesta citó el fragmento esperado. */
  cito: boolean;
  citadas: string[];
  pasoASant: boolean;
  tokensEntrada: number;
  latenciaMs: number;
  respuesta: string;
}

export async function comparar(env: EnvAdmin, cliente = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })) {
  const sinEfectos = { leerDia: async () => ({ fiestas: [], bloqueado: false }), pasarASant: async () => {} };
  const conBusqueda = env.AI && env.VECTORIZE ? { AI: env.AI, VECTORIZE: env.VECTORIZE } : null;
  const filas: FilaComparacion[] = [];

  for (const { pregunta, esperado } of preguntasDePrueba) {
    for (const modo of conBusqueda ? (['completo', 'busqueda'] as const) : (['completo'] as const)) {
      const inicio = Date.now();
      const fuentes = modo === 'busqueda' && conBusqueda ? await buscar(conBusqueda, pregunta) : undefined;
      const r = await responder(cliente, [], pregunta, sinEfectos, { fuentes });
      const citadas = fuentesCitadas(r.respuesta).map((f) => f.id);
      filas.push({
        pregunta,
        esperado,
        modo,
        encontro: fuentes ? fuentes.some((f) => f.id === esperado) : undefined,
        cito: citadas.includes(esperado),
        citadas,
        pasoASant: r.pasoASant,
        tokensEntrada: r.tokensEntrada,
        latenciaMs: Date.now() - inicio,
        respuesta: r.respuesta,
      });
    }
  }
  return { resumen: resumir(filas), filas };
}

export function resumir(filas: FilaComparacion[]) {
  const porModo = (modo: FilaComparacion['modo']) => {
    const f = filas.filter((x) => x.modo === modo);
    if (!f.length) return null;
    const pct = (n: number) => Math.round((n / f.length) * 100);
    const conBusqueda = f.filter((x) => x.encontro !== undefined);
    return {
      preguntas: f.length,
      citoLaFuenteCorrecta: `${pct(f.filter((x) => x.cito).length)} %`,
      buscadorLaEncontro: conBusqueda.length ? `${pct(conBusqueda.filter((x) => x.encontro).length)} %` : undefined,
      pasoASant: f.filter((x) => x.pasoASant).length,
      tokensEntradaPromedio: Math.round(f.reduce((s, x) => s + x.tokensEntrada, 0) / f.length),
      latenciaPromedioMs: Math.round(f.reduce((s, x) => s + x.latenciaMs, 0) / f.length),
    };
  };
  return { completo: porModo('completo'), busqueda: porModo('busqueda') };
}

export async function rutaAdmin(req: Request, env: EnvAdmin, ruta: string): Promise<Response> {
  if (req.method !== 'POST') return new Response('Método no permitido', { status: 405 });
  if (!autorizado(req.headers.get('authorization'), env.ADMIN_TOKEN)) return new Response('Prohibido', { status: 403 });

  if (ruta === '/admin/reindexar') {
    if (!env.AI || !env.VECTORIZE) return new Response('Faltan los bindings AI y VECTORIZE en wrangler.toml', { status: 409 });
    return Response.json(await reindexar({ ...env, AI: env.AI, VECTORIZE: env.VECTORIZE, MODO_CONOCIMIENTO: env.MODO_CONOCIMIENTO ?? '' }));
  }
  if (ruta === '/admin/comparar') return Response.json(await comparar(env));
  return new Response('No existe', { status: 404 });
}
