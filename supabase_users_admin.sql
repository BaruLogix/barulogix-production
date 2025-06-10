-- Agregar campos para gestión de usuarios
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS banned BOOLEAN DEFAULT FALSE;
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_users_banned ON auth.users(banned);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON auth.users(last_login);
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON auth.users(is_admin);

-- Comentarios para documentación
COMMENT ON COLUMN auth.users.banned IS 'Indica si el usuario está baneado';
COMMENT ON COLUMN auth.users.last_login IS 'Fecha y hora del último login';
COMMENT ON COLUMN auth.users.is_admin IS 'Indica si el usuario tiene permisos de administrador';

