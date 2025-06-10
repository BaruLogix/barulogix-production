-- Esquema de base de datos para BaruLogix en Supabase
-- Este archivo contiene todas las tablas y configuraciones necesarias

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabla de usuarios (extiende auth.users de Supabase)
CREATE TABLE public.user_profiles (
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
CREATE TABLE public.conductors (
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
CREATE TABLE public.deliveries (
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
CREATE TABLE public.reports (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    report_type TEXT NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejorar rendimiento
CREATE INDEX idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX idx_user_profiles_role ON public.user_profiles(role);
CREATE INDEX idx_conductors_user_id ON public.conductors(user_id);
CREATE INDEX idx_deliveries_user_id ON public.deliveries(user_id);
CREATE INDEX idx_deliveries_status ON public.deliveries(status);
CREATE INDEX idx_deliveries_tracking ON public.deliveries(tracking_number);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para actualizar updated_at
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_conductors_updated_at BEFORE UPDATE ON public.conductors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_deliveries_updated_at BEFORE UPDATE ON public.deliveries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Políticas de seguridad (Row Level Security)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conductors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Política para user_profiles: usuarios pueden ver/editar su propio perfil, admins pueden ver todos
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

-- Política para conductors: usuarios pueden gestionar sus conductores
CREATE POLICY "Users can manage own conductors" ON public.conductors
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Admins can view all conductors" ON public.conductors
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Política para deliveries: usuarios pueden gestionar sus entregas
CREATE POLICY "Users can manage own deliveries" ON public.deliveries
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Admins can view all deliveries" ON public.deliveries
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Política para reports: usuarios pueden ver sus reportes
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
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', 'Usuario'));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para crear perfil automáticamente
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insertar usuario administrador inicial
INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_user_meta_data
) VALUES (
    uuid_generate_v4(),
    'barulogix.platform@gmail.com',
    crypt('BaruAdmin2025!', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"name": "Administrador BaruLogix"}'::jsonb
) ON CONFLICT (email) DO NOTHING;

-- Actualizar el perfil del admin para que tenga rol de administrador
UPDATE public.user_profiles 
SET role = 'admin', subscription = 'enterprise'
WHERE email = 'barulogix.platform@gmail.com';

