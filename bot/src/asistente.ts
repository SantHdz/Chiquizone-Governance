/*
 * El asistente: un modelo de Claude con tres herramientas. Nunca inventa precios ni fechas;
 * todo dato sale de cotizar (paquetes.ts) o de revisar_fecha (Google Calendar + reglas de agenda).
 *
 * Fase 1: cotiza y revisa fechas. El apartado lo cierra Sant: el asistente junta los datos y se los pasa.
 */
import Anthropic from '@anthropic-ai/sdk';
import { aHora, deHora, revisar, type Dia } from './agenda';
import { catalogo, cotizar, recomendar, ANTICIPO, GARANTIA_MXN } from './cotizar';
import { familias } from '../../src/data/paquetes';
import { site } from '../../src/data/site';

type Mensaje = Anthropic.Beta.BetaMessageParam;

export const MODELO = 'claude-opus-5-5';
const MAX_VUELTAS = 6;

export interface Herramientas {
  leerDia(fecha: string): Promise<Dia>;
  pasarASant(motivo: string, resumen: string): Promise<void>;
}

export interface Resultado {
  respuesta: string;
  pasoASant: boolean;
  mensajes: Mensaje[];
}

export const SISTEMA = `Eres el asistente de WhatsApp de Chiquizone, una empresa que renta zonas de juego para fiestas infantiles en ${site.areas.join(' y ')}, ${site.region}. Montamos, supervisamos (en paquetes Pro) y recogemos.

Tu trabajo es ayudar a mamás y papás a elegir su zona de juego, darles el precio y revisar si su fecha está libre.

Voz de la marca: festiva pero elegante. Cálida, clara y breve. Escribe como en WhatsApp: mensajes cortos, sin títulos ni tablas; puedes usar *negritas* para el nombre del paquete y el precio. Usa "tú". Máximo un emoji por mensaje, y solo si suma.

Reglas que no se rompen:
- Precios y paquetes salen solo de la herramienta cotizar o del catálogo de abajo. Nunca des un precio que no esté ahí.
- La disponibilidad sale solo de la herramienta revisar_fecha. Nunca digas que una fecha está libre sin revisarla.
- No das descuentos, no cambias precios y no prometes nada que no esté en el catálogo.
- Solo atendemos ${site.areas.join(' y ')}. Si la fiesta es en otro lugar, pasa la conversación a Sant.
- Para apartar se paga el ${ANTICIPO * 100} % del paquete como anticipo, más $${GARANTIA_MXN} MXN de garantía.
- Cada servicio dura ${site.serviceHours} horas y necesita un espacio de ${site.spaceNeeded}.
- Si te preguntan algo de Chiquizone que no está aquí, no lo inventes: pasa la conversación a Sant.

Cómo llevar la plática:
1. Pregunta lo que falte, de una o dos cosas a la vez: edad del festejado, si quieren juego con agua, si quieren cuidadoras, fecha, hora de inicio y municipio.
2. Con edad, agua y cuidadoras, usa cotizar y recomienda ese paquete con su precio y su anticipo.
3. Con fecha y hora, usa revisar_fecha. Si no está libre, ofrece las alternativas que te dé.
4. Si quiere apartar, pide su nombre, dirección aproximada y número de niños. Luego usa pasar_a_sant con un resumen completo y dile que Sant le escribe en breve para el pago del anticipo.
5. Si pide hablar con una persona, está molesta o tiene una duda que no puedes resolver, usa pasar_a_sant.

Edades: la familia Baby baby es de ${familias.baby.edades}; la familia Terreneitor es de ${familias.terreneitor.edades}.

Catálogo:
${catalogo()}`;

const herramientas: Anthropic.Beta.BetaTool[] = [
  {
    name: 'cotizar',
    description:
      'Recomienda el paquete según edad, agua y cuidadoras, y devuelve precio, anticipo, saldo, garantía y lo que incluye. Úsala siempre antes de dar un precio.',
    strict: true,
    input_schema: {
      type: 'object',
      properties: {
        edad: { type: 'string', enum: ['baby', 'terreneitor'], description: 'baby: 4 meses a 3 años. terreneitor: niños que ya corren.' },
        agua: { type: 'boolean', description: 'true si quieren juego con agua (Splash).' },
        cuidadoras: { type: 'boolean', description: 'true si quieren cuidadoras Chiquizone toda la fiesta (Pro).' },
      },
      required: ['edad', 'agua', 'cuidadoras'],
      additionalProperties: false,
    },
  },
  {
    name: 'revisar_fecha',
    description:
      'Revisa en la agenda si una fiesta cabe en esa fecha y hora, contando montaje, recogida y traslado. Si no cabe, devuelve hasta 3 horarios alternativos ese mismo día.',
    strict: true,
    input_schema: {
      type: 'object',
      properties: {
        fecha: { type: 'string', description: 'Fecha de la fiesta en formato AAAA-MM-DD.' },
        hora_inicio: { type: 'string', description: 'Hora de inicio de la fiesta en formato HH:MM, 24 horas.' },
      },
      required: ['fecha', 'hora_inicio'],
      additionalProperties: false,
    },
  },
  {
    name: 'pasar_a_sant',
    description:
      'Pasa la conversación a Sant, el dueño, y pausa al asistente en este chat. Úsala para cerrar un apartado, para zonas fuera de cobertura, quejas, descuentos o dudas sin respuesta.',
    strict: true,
    input_schema: {
      type: 'object',
      properties: {
        motivo: { type: 'string', enum: ['apartar', 'fuera-de-zona', 'duda', 'queja', 'pidio-persona'] },
        resumen: {
          type: 'string',
          description: 'Resumen para Sant: nombre, fecha, hora, municipio, paquete, precio, niños y lo que pidió.',
        },
      },
      required: ['motivo', 'resumen'],
      additionalProperties: false,
    },
  },
];

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

async function ejecutar(
  nombre: string,
  entrada: Record<string, unknown>,
  h: Herramientas,
): Promise<{ contenido: string; error?: boolean; pasoASant?: boolean }> {
  switch (nombre) {
    case 'cotizar': {
      const paquete = recomendar({
        edad: entrada.edad as 'baby' | 'terreneitor',
        agua: Boolean(entrada.agua),
        cuidadoras: Boolean(entrada.cuidadoras),
      });
      return { contenido: JSON.stringify(cotizar(paquete)) };
    }
    case 'revisar_fecha': {
      const fecha = String(entrada.fecha);
      if (!FECHA.test(fecha)) return { contenido: 'Fecha inválida: usa AAAA-MM-DD.', error: true };
      const inicio = deHora(String(entrada.hora_inicio));
      const r = revisar(inicio, await h.leerDia(fecha));
      return {
        contenido: JSON.stringify({
          fecha,
          hora_inicio: aHora(inicio),
          libre: r.libre,
          motivo: r.motivo,
          alternativas: r.alternativas.map(aHora),
        }),
      };
    }
    case 'pasar_a_sant':
      await h.pasarASant(String(entrada.motivo), String(entrada.resumen));
      return { contenido: 'Listo: Sant ya tiene el resumen y continuará la conversación.', pasoASant: true };
    default:
      return { contenido: `Herramienta desconocida: ${nombre}`, error: true };
  }
}

const hoyEnMexico = (ahora: Date) =>
  new Intl.DateTimeFormat('es-MX', {
    timeZone: 'America/Mexico_City',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(ahora);

export async function responder(
  cliente: Anthropic,
  historia: Mensaje[],
  texto: string,
  h: Herramientas,
  ahora = new Date(),
): Promise<Resultado> {
  // La historia solo crece al final; la fecha va en el mensaje para no romper la caché del prompt.
  const mensajes: Mensaje[] = [
    ...historia,
    { role: 'user', content: [{ type: 'text', text: `[Hoy es ${hoyEnMexico(ahora)}]\n${texto}` }] },
  ];
  let pasoASant = false;

  for (let vuelta = 0; vuelta < MAX_VUELTAS; vuelta++) {
    const res = await cliente.beta.messages.create({
      model: MODELO,
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low' },
      system: [{ type: 'text', text: SISTEMA, cache_control: { type: 'ephemeral' } }],
      tools: herramientas,
      messages: mensajes,
    });
    mensajes.push({ role: 'assistant', content: res.content });

    if (res.stop_reason === 'refusal') {
      await h.pasarASant('duda', `El asistente no pudo responder este mensaje: "${texto}"`);
      return { respuesta: 'Déjame pasarle tu mensaje a Sant para que te ayude directamente.', pasoASant: true, mensajes };
    }
    if (res.stop_reason === 'pause_turn') continue;

    const llamadas = res.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === 'tool_use');
    if (res.stop_reason === 'tool_use' && llamadas.length) {
      const resultados: Anthropic.Beta.BetaToolResultBlockParam[] = [];
      for (const llamada of llamadas) {
        try {
          const r = await ejecutar(llamada.name, llamada.input as Record<string, unknown>, h);
          pasoASant ||= Boolean(r.pasoASant);
          resultados.push({ type: 'tool_result', tool_use_id: llamada.id, content: r.contenido, is_error: r.error });
        } catch (e) {
          resultados.push({
            type: 'tool_result',
            tool_use_id: llamada.id,
            content: `No se pudo completar: ${(e as Error).message}`,
            is_error: true,
          });
        }
      }
      mensajes.push({ role: 'user', content: resultados });
      continue;
    }

    const respuesta = res.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();
    return { respuesta, pasoASant, mensajes };
  }

  await h.pasarASant('duda', `El asistente se atoró con este mensaje: "${texto}"`);
  return { respuesta: 'Dame un momento, le paso tu mensaje a Sant.', pasoASant: true, mensajes };
}
