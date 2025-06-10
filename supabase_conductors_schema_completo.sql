-- Recrear tabla conductors con esquema completo
DROP TABLE IF EXISTS conductors CASCADE;

CREATE TABLE conductors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre TEXT NOT NULL,
    zona TEXT NOT NULL,
    telefono TEXT,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para optimizar consultas
CREATE INDEX idx_conductors_nombre ON conductors(nombre);
CREATE INDEX idx_conductors_zona ON conductors(zona);
CREATE INDEX idx_conductors_activo ON conductors(activo);

-- Habilitar RLS (Row Level Security)
ALTER TABLE conductors ENABLE ROW LEVEL SECURITY;

-- Crear política para permitir acceso a todos los usuarios autenticados
CREATE POLICY "Permitir acceso completo a usuarios autenticados" ON conductors
    FOR ALL USING (auth.role() = 'authenticated');

-- Comentarios para documentación
COMMENT ON TABLE conductors IS 'Tabla de conductores para BaruLogix';
COMMENT ON COLUMN conductors.nombre IS 'Nombre completo del conductor';
COMMENT ON COLUMN conductors.zona IS 'Zona de trabajo del conductor';
COMMENT ON COLUMN conductors.telefono IS 'Número de teléfono del conductor';
COMMENT ON COLUMN conductors.activo IS 'Estado activo/inactivo del conductor';

