/*
 * Lado del servidor de negociar y apartar_fecha. El modelo solo pide; aquí se lee el estado,
 * se decide con las reglas de Sant y se guarda. El teléfono sale del webhook firmado, nunca del chat.
 */
import { apartarTentativo, datosDeHerramienta, venceLegible, HORAS_APARTADO } from './apartado';
import type { EnvCalendario } from './calendario';
import { cotizarConComplementos, GARANTIA_MXN } from './cotizar';
import { comprasConfirmadas, guardarApartado } from './db';
import { evaluar, guardarNegociacion, leerNegociacion, leerSolicitud, paraElModelo, tratoVigente } from './negociacion';

export interface EnvAcciones extends EnvCalendario {
  CONVERSACIONES: KVNamespace;
  DB: D1Database;
}

/** Hoy en México como AAAA-MM-DD. */
export const hoyISO = (ahora: Date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit' }).format(ahora);

export async function negociar(
  env: EnvAcciones,
  telefono: string,
  entrada: Record<string, unknown>,
  ahora = new Date(),
): Promise<string> {
  const solicitud = leerSolicitud(entrada);
  const [estado, comprasPrevias] = await Promise.all([
    leerNegociacion(env.CONVERSACIONES, telefono),
    comprasConfirmadas(env.DB, telefono),
  ]);
  const e = evaluar(solicitud, { fecha: String(entrada.fecha ?? ''), hoy: hoyISO(ahora), comprasPrevias }, estado);
  await guardarNegociacion(env.CONVERSACIONES, telefono, e.siguienteEstado);
  return paraElModelo(e);
}

/**
 * Aparta con el precio vigente de la conversación (lista, o lo que concedió negociar) y deja el registro en D1.
 * `avisar` le manda el resumen a Sant sin pausar al asistente, para que cobre el anticipo.
 */
export async function apartar(
  env: EnvAcciones,
  telefono: string,
  entrada: Record<string, unknown>,
  avisar: (resumen: string) => Promise<void>,
  ahora = new Date(),
): Promise<string> {
  const base = datosDeHerramienta(entrada, telefono);
  const trato = tratoVigente(await leerNegociacion(env.CONVERSACIONES, telefono), base.precio);
  // El descuento negociado aplica al paquete; los complementos se suman a precio de lista y el anticipo es sobre el total.
  const lista = Array.isArray(entrada.complementos) ? entrada.complementos.map(String) : [];
  const cuenta = cotizarConComplementos(String(entrada.paquete), lista, trato.precio);
  const d = {
    ...base,
    precio: cuenta.total,
    anticipo: cuenta.anticipo,
    ...(trato.ajustes ? { ajustes: trato.ajustes } : {}),
    ...(cuenta.complementos.length ? { complementos: cuenta.complementos.map((l) => `${l.nombre} $${l.precio}`).join(', ') } : {}),
  };

  const r = await apartarTentativo(env, d, ahora);
  if (!r.ok) return JSON.stringify({ apartado: false, motivo: r.motivo, alternativas: r.alternativas });

  await guardarApartado(
    env.DB,
    { telefono, eventoId: r.eventoId, fecha: d.fecha, hora: d.hora, paquete: d.paquete, precio: d.precio, anticipo: d.anticipo, vence: r.vence },
    ahora,
  );
  const vence = venceLegible(r.vence);
  await avisar(
    `Apartado tentativo ${HORAS_APARTADO} h: ${d.nombre}, ${d.fecha} ${d.hora}, ${d.municipio}, ${d.paquete}, ${d.ninos} niños. ` +
      `Precio $${d.precio}, anticipo $${d.anticipo}${d.ajustes ? ` (${d.ajustes})` : ''}. Vence ${vence}. Mándale los datos de pago.`,
  );
  return JSON.stringify({
    apartado: true,
    fecha: d.fecha,
    hora_inicio: d.hora,
    paquete: d.paquete,
    precio: d.precio,
    anticipo: d.anticipo,
    garantia: GARANTIA_MXN,
    ...(d.ajustes ? { ajustes: d.ajustes } : {}),
    ...(cuenta.complementos.length ? { complementos: cuenta.complementos } : {}),
    vence,
  });
}
