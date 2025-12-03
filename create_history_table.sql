-- Crear tabla admin_operations_history para registrar todas las operaciones administrativas
CREATE TABLE IF NOT EXISTS admin_operations_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  operation_type VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  affected_records INTEGER DEFAULT 0,
  can_undo BOOLEAN DEFAULT true,
  undone_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_admin_operations_history_user_id ON admin_operations_history(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_operations_history_created_at ON admin_operations_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_operations_history_operation_type ON admin_operations_history(operation_type);

-- Habilitar RLS (Row Level Security) si es necesario
ALTER TABLE admin_operations_history ENABLE ROW LEVEL SECURITY;

-- Crear política para que los usuarios solo vean sus propias operaciones
CREATE POLICY "Users can view their own history" ON admin_operations_history
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own history" ON admin_operations_history
  FOR INSERT
  WITH CHECK (user_id = auth.uid());
