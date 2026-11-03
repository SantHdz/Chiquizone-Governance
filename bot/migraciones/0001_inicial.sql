-- Base de datos del asistente (Cloudflare D1). Todas las consultas del Worker son fijas y parametrizadas.

CREATE TABLE IF NOT EXISTS clientes (
  telefono TEXT PRIMARY KEY,          -- wa_id firmado por Meta: la única identidad que se acepta
  nombre TEXT,
  acepta_promos INTEGER NOT NULL DEFAULT 0,
  creado TEXT NOT NULL,
  ultimo_mensaje TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS registros (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telefono TEXT NOT NULL REFERENCES clientes(telefono),
  pregunta TEXT NOT NULL,
  respuesta TEXT NOT NULL,
  herramientas TEXT NOT NULL,         -- JSON: nombres de herramientas usadas
  fuentes TEXT NOT NULL,              -- JSON: ids de fragmentos citados
  paso_a_sant INTEGER NOT NULL DEFAULT 0,
  bloqueado TEXT,                     -- motivo si la guardia frenó la respuesta
  latencia_ms INTEGER NOT NULL,
  tokens_entrada INTEGER NOT NULL DEFAULT 0,
  tokens_salida INTEGER NOT NULL DEFAULT 0,
  creado TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS registros_por_cliente ON registros(telefono, creado);

CREATE TABLE IF NOT EXISTS retroalimentacion (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  registro_id INTEGER NOT NULL REFERENCES registros(id),
  telefono TEXT NOT NULL,
  util INTEGER NOT NULL,              -- 1 me sirvió, 0 no me sirvió
  creado TEXT NOT NULL
);
