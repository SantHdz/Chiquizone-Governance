-- Apartados tentativos (fase 2): la fecha queda separada 12 horas en Google Calendar mientras llega el anticipo.
-- El calendario manda; esta tabla es el registro para avisos y seguimiento. El cron de 30 minutos marca 'liberado'.
CREATE TABLE IF NOT EXISTS apartados (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telefono TEXT NOT NULL REFERENCES clientes(telefono),
  evento_id TEXT NOT NULL UNIQUE,     -- id del evento en Google Calendar
  fecha TEXT NOT NULL,                -- AAAA-MM-DD de la fiesta
  hora TEXT NOT NULL,                 -- HH:MM de inicio de la fiesta
  paquete TEXT NOT NULL,
  precio INTEGER NOT NULL,            -- MXN, de cotizar()
  anticipo INTEGER NOT NULL,          -- MXN, de cotizar()
  estado TEXT NOT NULL DEFAULT 'tentativo' CHECK (estado IN ('tentativo', 'confirmado', 'liberado')),
  vence TEXT NOT NULL,                -- ISO: creado + 12 horas
  creado TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS apartados_por_cliente ON apartados(telefono, estado);
