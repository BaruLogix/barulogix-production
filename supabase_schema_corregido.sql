-- Esquema de base de datos CORREGIDO para BaruLogix en Supabase
-- Este archivo contiene todas las tablas y configuraciones necesarias

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabla de perfiles de usuario (extiende auth.users de Supabase)
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    subscription TEXT NOT NULL DEFAULT 'basic' CHECK (subscription IN ('basic', 'premium', 'enterprise')),
    company TEXT,
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de conductores
CREATE TABLE IF NOT EXISTS public.conductors (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    vehicle_type TEXT NOT NULL,
    license_plate TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de entregas
CREATE TABLE IF NOT EXISTS public.deliveries (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    conductor_id UUID REFERENCES public.conductors(id) ON DELETE SET NULL,
    tracking_number TEXT NOT NULL,
    recipient TEXT NOT NULL,
    address TEXT NOT NULL,
    phone TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'in_transit', 'delivered', 'returned')),
    platform TEXT NOT NULL DEFAULT 'other' CHECK (platform IN ('shein', 'temu', 'dropi', 'other')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    delivered_at TIMESTAMP WITH TIME ZONE
);

-- Tabla de reportes (para estadísticas)
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    report_type TEXT NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_conductors_user_id ON public.conductors(user_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_user_id ON public.deliveries(user_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON public.deliveries(status);
CREATE INDEX IF NOT EXISTS idx_deliveries_tracking ON public.deliveries(tracking_number);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para actualizar updated_at (solo si no existen)
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER update_user_profiles_updated_at 
    BEFORE UPDATE ON public.user_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_conductors_updated_at ON public.conductors;
CREATE TRIGGER update_conductors_updated_at 
    BEFORE UPDATE ON public.conductors 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_deliveries_updated_at ON public.deliveries;
CREATE TRIGGER update_deliveries_updated_at 
    BEFORE UPDATE ON public.deliveries 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Habilitar Row Level Security
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conductors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can manage own conductors" ON public.conductors;
DROP POLICY IF EXISTS "Admins can view all conductors" ON public.conductors;
DROP POLICY IF EXISTS "Users can manage own deliveries" ON public.deliveries;
DROP POLICY IF EXISTS "Admins can view all deliveries" ON public.deliveries;
DROP POLICY IF EXISTS "Users can view own reports" ON public.reports;
DROP POLICY IF EXISTS "Admins can view all reports" ON public.reports;

-- Políticas de seguridad para user_profiles
CREATE POLICY "Users can view own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.user_profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Políticas para conductors
CREATE POLICY "Users can manage own conductors" ON public.conductors
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Admins can view all conductors" ON public.conductors
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Políticas para deliveries
CREATE POLICY "Users can manage own deliveries" ON public.deliveries
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Admins can view all deliveries" ON public.deliveries
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Políticas para reports
CREATE POLICY "Users can view own reports" ON public.reports
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can view all reports" ON public.reports
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Función para crear perfil automáticamente cuando se registra un usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, name)
    VALUES (
        NEW.id, 
        NEW.email, 
        COALESCE(NEW.raw_user_meta_data->>'name', 'Usuario')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Eliminar trigger existente si existe
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Crear trigger para crear perfil automáticamente
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Función para crear usuario administrador (se ejecuta manualmente)
CREATE OR REPLACE FUNCTION create_admin_user()
RETURNS TEXT AS $$
BEGIN
    -- Esta función debe ejecutarse después de que el usuario se registre manualmente
    -- a través de la interfaz de Supabase Auth
    
    UPDATE public.user_profiles 
    SET 
        role = 'admin', 
        subscription = 'enterprise',
        name = 'Administrador BaruLogix'
    WHERE email = 'barulogix.platform@gmail.com';
    
    IF FOUND THEN
        RETURN 'Usuario administrador actualizado correctamente';
    ELSE
        RETURN 'Usuario no encontrado. Debe registrarse primero con el email barulogix.platform@gmail.com';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mensaje informativo
SELECT 'Esquema creado exitosamente. Para crear el usuario administrador:' as mensaje
UNION ALL
SELECT '1. Registra el usuario barulogix.platform@gmail.com a través de la aplicación'
UNION ALL
SELECT '2. Ejecuta: SELECT create_admin_user();';

