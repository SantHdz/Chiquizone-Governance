-- Interruptor del conocimiento: qué modo contestó y qué fragmentos encontró el buscador.
-- Sirve para comparar "completo" contra "busqueda" con conversaciones reales.
ALTER TABLE registros ADD COLUMN modo_conocimiento TEXT NOT NULL DEFAULT 'completo';
ALTER TABLE registros ADD COLUMN fuentes_encontradas TEXT;  -- JSON: ids que trajo la búsqueda (null en modo completo)
