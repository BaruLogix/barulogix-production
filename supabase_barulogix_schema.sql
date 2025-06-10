-- Crear tabla de conductores
CREATE TABLE IF NOT EXISTS conductors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  zone VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla de paquetes
CREATE TABLE IF NOT EXISTS packages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tracking VARCHAR(255) NOT NULL UNIQUE,
  conductor_id UUID REFERENCES conductors(id) ON DELETE SET NULL,
  conductor_name VARCHAR(255), -- Para mantener historial si se elimina conductor
  type VARCHAR(50) NOT NULL CHECK (type IN ('Shein/Temu', 'Dropi')),
  status INTEGER DEFAULT 0 CHECK (status IN (0, 1, 2)), -- 0=no entregado, 1=entregado, 2=devuelto
  delivery_date DATE NOT NULL,
  value DECIMAL(10,2), -- Para paquetes Dropi
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_conductors_user_id ON conductors(user_id);
CREATE INDEX IF NOT EXISTS idx_conductors_zone ON conductors(zone);
CREATE INDEX IF NOT EXISTS idx_packages_user_id ON packages(user_id);
CREATE INDEX IF NOT EXISTS idx_packages_tracking ON packages(tracking);
CREATE INDEX IF NOT EXISTS idx_packages_conductor_id ON packages(conductor_id);
CREATE INDEX IF NOT EXISTS idx_packages_status ON packages(status);
CREATE INDEX IF NOT EXISTS idx_packages_delivery_date ON packages(delivery_date);
CREATE INDEX IF NOT EXISTS idx_packages_type ON packages(type);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para actualizar updated_at
DROP TRIGGER IF EXISTS update_conductors_updated_at ON conductors;
CREATE TRIGGER update_conductors_updated_at
    BEFORE UPDATE ON conductors
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_packages_updated_at ON packages;
CREATE TRIGGER update_packages_updated_at
    BEFORE UPDATE ON packages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Políticas de seguridad RLS (Row Level Security)
ALTER TABLE conductors ENABLE ROW LEVEL SECURITY;
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;

-- Política para conductors: usuarios solo pueden ver/editar sus propios conductores
DROP POLICY IF EXISTS "Users can view own conductors" ON conductors;
CREATE POLICY "Users can view own conductors" ON conductors
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own conductors" ON conductors;
CREATE POLICY "Users can insert own conductors" ON conductors
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own conductors" ON conductors;
CREATE POLICY "Users can update own conductors" ON conductors
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own conductors" ON conductors;
CREATE POLICY "Users can delete own conductors" ON conductors
    FOR DELETE USING (auth.uid() = user_id);

-- Política para packages: usuarios solo pueden ver/editar sus propios paquetes
DROP POLICY IF EXISTS "Users can view own packages" ON packages;
CREATE POLICY "Users can view own packages" ON packages
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own packages" ON packages;
CREATE POLICY "Users can insert own packages" ON packages
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own packages" ON packages;
CREATE POLICY "Users can update own packages" ON packages
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own packages" ON packages;
CREATE POLICY "Users can delete own packages" ON packages
    FOR DELETE USING (auth.uid() = user_id);

