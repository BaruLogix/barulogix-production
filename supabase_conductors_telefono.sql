-- Agregar campo teléfono a la tabla conductors
ALTER TABLE conductors ADD COLUMN telefono VARCHAR(20);

-- Actualizar índices para incluir el nuevo campo
CREATE INDEX IF NOT EXISTS idx_conductors_telefono ON conductors(telefono);

-- Comentarios para documentación
COMMENT ON COLUMN conductors.telefono IS 'Número de teléfono del conductor para contacto';

