/*
 * Acceso a D1. Solo consultas fijas con parámetros: ningún texto del modelo o de la clienta se concatena en SQL.
 */
export interface Cliente {
  telefono: string;
  nombre: string | null;
  esNueva: boolean;
}

export async function identificar(db: D1Database, telefono: string, nombre?: string, ahora = new Date()): Promise<Cliente> {
  const fecha = ahora.toISOString();
  const previo = await db.prepare('SELECT nombre FROM clientes WHERE telefono = ?1').bind(telefono).first<{ nombre: string | null }>();
  if (!previo) {
    await db
      .prepare('INSERT INTO clientes (telefono, nombre, creado, ultimo_mensaje) VALUES (?1, ?2, ?3, ?3)')
      .bind(telefono, nombre ?? null, fecha)
      .run();
    return { telefono, nombre: nombre ?? null, esNueva: true };
  }
  await db.prepare('UPDATE clientes SET ultimo_mensaje = ?2 WHERE telefono = ?1').bind(telefono, fecha).run();
  return { telefono, nombre: previo.nombre, esNueva: false };
}

export interface Registro {
  telefono: string;
  pregunta: string;
  respuesta: string;
  herramientas: string[];
  fuentes: string[];
  pasoASant: boolean;
  bloqueado?: string;
  latenciaMs: number;
  tokensEntrada: number;
  tokensSalida: number;
}

export async function registrar(db: D1Database, r: Registro, ahora = new Date()): Promise<number> {
  const res = await db
    .prepare(
      `INSERT INTO registros (telefono, pregunta, respuesta, herramientas, fuentes, paso_a_sant, bloqueado,
         latencia_ms, tokens_entrada, tokens_salida, creado)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)`,
    )
    .bind(
      r.telefono,
      r.pregunta,
      r.respuesta,
      JSON.stringify(r.herramientas),
      JSON.stringify(r.fuentes),
      r.pasoASant ? 1 : 0,
      r.bloqueado ?? null,
      r.latenciaMs,
      r.tokensEntrada,
      r.tokensSalida,
      ahora.toISOString(),
    )
    .run();
  return Number(res.meta.last_row_id);
}
