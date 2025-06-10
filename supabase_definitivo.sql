-- BaruLogix - Esquema DEFINITIVO para Supabase
-- Copia y pega TODO este código en el SQL Editor

-- Habilitar extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabla de perfiles de usuario
CREATE TABLE public.user_profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    is_active BOOLEAN NOT NULL DEFAULT true,
    subscription TEXT NOT NULL DEFAULT 'basic',
    company TEXT,
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT valid_role CHECK (role IN ('admin', 'user')),
    CONSTRAINT valid_subscription CHECK (subscription IN ('basic', 'premium', 'enterprise'))
);

-- 2. Tabla de conductores
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

-- 3. Tabla de entregas
CREATE TABLE public.deliveries (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    conductor_id UUID REFERENCES public.conductors(id) ON DELETE SET NULL,
    tracking_number TEXT NOT NULL,
    recipient TEXT NOT NULL,
    address TEXT NOT NULL,
    phone TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    platform TEXT NOT NULL DEFAULT 'other',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    delivered_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT valid_status CHECK (status IN ('pending', 'assigned', 'in_transit', 'delivered', 'returned')),
    CONSTRAINT valid_platform CHECK (platform IN ('shein', 'temu', 'dropi', 'other'))
);

-- 4. Tabla de reportes
CREATE TABLE public.reports (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    report_type TEXT NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Índices
CREATE INDEX idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX idx_user_profiles_role ON public.user_profiles(role);
CREATE INDEX idx_conductors_user_id ON public.conductors(user_id);
CREATE INDEX idx_deliveries_user_id ON public.deliveries(user_id);
CREATE INDEX idx_deliveries_status ON public.deliveries(status);
CREATE INDEX idx_deliveries_tracking ON public.deliveries(tracking_number);

-- 6. Función para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 7. Triggers
CREATE TRIGGER update_user_profiles_updated_at 
    BEFORE UPDATE ON public.user_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conductors_updated_at 
    BEFORE UPDATE ON public.conductors 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deliveries_updated_at 
    BEFORE UPDATE ON public.deliveries 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 8. Habilitar RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conductors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- 9. Políticas user_profiles
CREATE POLICY "Users can view own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can manage all profiles" ON public.user_profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 10. Políticas conductors
CREATE POLICY "Users can manage own conductors" ON public.conductors
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all conductors" ON public.conductors
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 11. Políticas deliveries
CREATE POLICY "Users can manage own deliveries" ON public.deliveries
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all deliveries" ON public.deliveries
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 12. Políticas reports
CREATE POLICY "Users can view own reports" ON public.reports
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can view all reports" ON public.reports
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 13. Función para crear perfil automáticamente
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

-- 14. Trigger para nuevos usuarios
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 15. Función CORREGIDA para hacer admin
CREATE OR REPLACE FUNCTION make_user_admin(user_email TEXT)
RETURNS TEXT AS $$
DECLARE
    rows_affected INTEGER;
BEGIN
    UPDATE public.user_profiles 
    SET 
        role = 'admin', 
        subscription = 'enterprise',
        name = 'Administrador BaruLogix'
    WHERE email = user_email;
    
    GET DIAGNOSTICS rows_affected = ROW_COUNT;
    
    IF rows_affected > 0 THEN
        RETURN 'Usuario ' || user_email || ' convertido en administrador exitosamente';
    ELSE
        RETURN 'Usuario ' || user_email || ' no encontrado. Debe registrarse primero.';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 16. Confirmación
SELECT 'Esquema de BaruLogix creado exitosamente!' as resultado;

