-- Crear tabla de paquetes
CREATE TABLE IF NOT EXISTS packages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tracking VARCHAR(255) UNIQUE NOT NULL,
  conductor_id UUID NOT NULL REFERENCES conductors(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('Shein/Temu', 'Dropi')),
  estado INTEGER NOT NULL DEFAULT 0 CHECK (estado IN (0, 1, 2)), -- 0=no entregado, 1=entregado, 2=devuelto
  fecha_entrega DATE NOT NULL,
  valor DECIMAL(10,2), -- Solo para paquetes Dropi
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_packages_tracking ON packages(tracking);
CREATE INDEX IF NOT EXISTS idx_packages_conductor_id ON packages(conductor_id);
CREATE INDEX IF NOT EXISTS idx_packages_tipo ON packages(tipo);
CREATE INDEX IF NOT EXISTS idx_packages_estado ON packages(estado);
CREATE INDEX IF NOT EXISTS idx_packages_fecha_entrega ON packages(fecha_entrega);
CREATE INDEX IF NOT EXISTS idx_packages_created_at ON packages(created_at);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_packages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER packages_updated_at_trigger
  BEFORE UPDATE ON packages
  FOR EACH ROW
  EXECUTE FUNCTION update_packages_updated_at();

-- Políticas RLS para packages
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;

-- Política para permitir todas las operaciones a usuarios autenticados
CREATE POLICY "packages_policy" ON packages
  FOR ALL USING (auth.role() = 'authenticated');

-- Política para permitir lectura a usuarios autenticados
CREATE POLICY "packages_select_policy" ON packages
  FOR SELECT USING (auth.role() = 'authenticated');

-- Política para permitir inserción a usuarios autenticados
CREATE POLICY "packages_insert_policy" ON packages
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Política para permitir actualización a usuarios autenticados
CREATE POLICY "packages_update_policy" ON packages
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Política para permitir eliminación a usuarios autenticados
CREATE POLICY "packages_delete_policy" ON packages
  FOR DELETE USING (auth.role() = 'authenticated');

-- Función para obtener estadísticas de paquetes
CREATE OR REPLACE FUNCTION get_package_stats()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_packages', COUNT(*),
    'no_entregados', COUNT(*) FILTER (WHERE estado = 0),
    'entregados', COUNT(*) FILTER (WHERE estado = 1),
    'devueltos', COUNT(*) FILTER (WHERE estado = 2),
    'shein_temu', COUNT(*) FILTER (WHERE tipo = 'Shein/Temu'),
    'dropi', COUNT(*) FILTER (WHERE tipo = 'Dropi'),
    'valor_total_dropi', COALESCE(SUM(valor) FILTER (WHERE tipo = 'Dropi'), 0),
    'valor_no_entregado_dropi', COALESCE(SUM(valor) FILTER (WHERE tipo = 'Dropi' AND estado = 0), 0)
  ) INTO result
  FROM packages;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

