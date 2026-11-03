/*
 * Preguntas de prueba para comparar los modos "completo" y "busqueda" con las mismas preguntas.
 * Cada una dice qué fragmento debería responderla. Están escritas como escribiría una clienta.
 * Si cambia una sección de conocimiento/, la prueba de CI avisa que hay que actualizar aquí.
 */
export interface PreguntaDePrueba {
  pregunta: string;
  esperado: string;
}

export const preguntasDePrueba: PreguntaDePrueba[] = [
  { pregunta: '¿Cuánto tengo que dejar para apartar?', esperado: 'apartado#como-se-aparta-una-fecha' },
  { pregunta: '¿Hay que firmar algo o dejar identificación?', esperado: 'apartado#contrato-y-garantia' },
  { pregunta: '¿El resto lo puedo pagar con tarjeta?', esperado: 'apartado#formas-de-pago' },
  { pregunta: '¿Las chicas le pueden dar de comer a mi bebé?', esperado: 'seguridad#que-hacen-las-cuidadoras' },
  { pregunta: 'Mi sobrino tiene 6 años, ¿puede meterse?', esperado: 'seguridad#edades' },
  { pregunta: '¿Van hasta Tequis?', esperado: 'servicio#zonas-de-servicio' },
  { pregunta: '¿Qué tan grande tiene que ser el jardín?', esperado: 'servicio#espacio-necesario' },
  { pregunta: '¿A qué hora llegan a instalar?', esperado: 'servicio#duracion-montaje-y-desmontaje' },
  { pregunta: '¿Cómo limpian los juguetes?', esperado: 'servicio#limpieza' },
  { pregunta: '¿Con cuánto tiempo debo reservar?', esperado: 'servicio#planeacion-sugerida' },
];
