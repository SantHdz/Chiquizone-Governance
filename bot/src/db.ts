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
  modo?: 'completo' | 'busqueda';
  /** Ids que trajo la búsqueda, solo en modo "busqueda". */
  encontradas?: string[];
}

export async function registrar(db: D1Database, r: Registro, ahora = new Date()): Promise<number> {
  const res = await db
    .prepare(
      `INSERT INTO registros (telefono, pregunta, respuesta, herramientas, fuentes, paso_a_sant, bloqueado,
         latencia_ms, tokens_entrada, tokens_salida, creado, modo_conocimiento, fuentes_encontradas)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)`,
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
      r.modo ?? 'completo',
      r.encontradas ? JSON.stringify(r.encontradas) : null,
    )
    .run();
  return Number(res.meta.last_row_id);
}

export type EstadoApartado = 'tentativo' | 'confirmado' | 'liberado';

export interface Apartado {
  telefono: string;
  eventoId: string;
  fecha: string;
  hora: string;
  paquete: string;
  precio: number;
  anticipo: number;
  vence: string;
}

export async function guardarApartado(db: D1Database, a: Apartado, ahora = new Date()): Promise<number> {
  const res = await db
    .prepare(
      `INSERT INTO apartados (telefono, evento_id, fecha, hora, paquete, precio, anticipo, estado, vence, creado)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'tentativo', ?8, ?9)`,
    )
    .bind(a.telefono, a.eventoId, a.fecha, a.hora, a.paquete, a.precio, a.anticipo, a.vence, ahora.toISOString())
    .run();
  return Number(res.meta.last_row_id);
}

/** Solo un apartado tentativo cambia de estado: uno confirmado o liberado ya no se mueve. */
export async function marcarApartado(
  db: D1Database,
  eventoId: string,
  estado: Exclude<EstadoApartado, 'tentativo'>,
): Promise<boolean> {
  const res = await db
    .prepare("UPDATE apartados SET estado = ?2 WHERE evento_id = ?1 AND estado = 'tentativo'")
    .bind(eventoId, estado)
    .run();
  return res.meta.changes > 0;
}

/** El apartado tentativo más reciente de una clienta, para confirmarlo cuando llegue el anticipo. */
export async function apartadoPendiente(db: D1Database, telefono: string): Promise<Apartado | null> {
  return db
    .prepare(
      `SELECT telefono, evento_id AS eventoId, fecha, hora, paquete, precio, anticipo, vence FROM apartados
       WHERE telefono = ?1 AND estado = 'tentativo' ORDER BY creado DESC LIMIT 1`,
    )
    .bind(telefono)
    .first<Apartado>();
}

/** Fiestas que la clienta ya pagó: de aquí salen "clienta frecuente" y la quinta compra, nunca del chat. */
export async function comprasConfirmadas(db: D1Database, telefono: string): Promise<number> {
  const r = await db
    .prepare("SELECT COUNT(*) AS n FROM apartados WHERE telefono = ?1 AND estado = 'confirmado'")
    .bind(telefono)
    .first<{ n: number }>();
  return Number(r?.n ?? 0);
}
