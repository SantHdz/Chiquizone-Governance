/* Límite de uso por número: frena abusos y gasto. */
export const MAX_POR_HORA = 30;

export async function dentroDelLimite(kv: KVNamespace, telefono: string, ahora = Date.now()): Promise<boolean> {
  const clave = `rl:${telefono}:${Math.floor(ahora / 3_600_000)}`;
  const usados = Number((await kv.get(clave)) ?? 0);
  if (usados >= MAX_POR_HORA) return false;
  await kv.put(clave, String(usados + 1), { expirationTtl: 3700 });
  return true;
}
