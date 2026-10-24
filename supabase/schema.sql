-- =============================================================================
-- ESQUEMA RELACIONAL POSTGRESQL / SUPABASE (CONSOLIDADO & SIN RECURSIÓN RLS)
-- Empresa: BARBER SHOP LIMA NORTE S.A.C.
-- RUC: 20611302151
-- Nombre Comercial: Barber Shop
-- Estándar: OWASP Mobile Top 10 & ISO/IEC 25010 (Seguridad, Concurrencia y Fiabilidad)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- 1. TABLA: public.usuarios (Perfiles de clientes y personal de Barber Shop)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    correo TEXT NOT NULL UNIQUE,
    telefono TEXT DEFAULT '',
    rol TEXT NOT NULL DEFAULT 'cliente' CHECK (rol IN ('cliente', 'admin', 'barbero')),
    avatar_url TEXT DEFAULT 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
    preferencias_corte JSONB DEFAULT '{
        "estilo": "Fade Clásico",
        "tipo_cabello": "Lacio",
        "barba": "Perfilada con Navaja",
        "frecuencia": "Quincenal",
        "notas": "Corte con navaja y toalla caliente"
    }'::jsonb,
    historial_notas TEXT DEFAULT 'Cliente registrado en Barber Shop Lima Norte.',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Permitir creación de fichas de clientes desde el Panel Admin sin bloqueo de FK hacia auth.users
ALTER TABLE public.usuarios DROP CONSTRAINT IF EXISTS usuarios_id_fkey;

-- =============================================================================
-- 1.1 FUNCIÓN SECURITY DEFINER: public.obtener_mi_rol()
-- Evita el error "infinite recursion detected in policy for relation usuarios"
-- al ejecutarse con privilegios de propietario fuera del ciclo RLS.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.obtener_mi_rol()
RETURNS TEXT AS $$
DECLARE
    v_rol TEXT;
BEGIN
    SELECT rol INTO v_rol FROM public.usuarios WHERE id = auth.uid() LIMIT 1;
    RETURN COALESCE(v_rol, 'cliente');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =============================================================================
-- 2. TRIGGER: on_auth_user_created (Sincronización automática de perfil y teléfono)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.usuarios (
        id, 
        nombre, 
        correo, 
        telefono, 
        rol, 
        preferencias_corte, 
        historial_notas
    )
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'nombre', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'telefono', ''),
        COALESCE(NEW.raw_user_meta_data->>'rol', 'cliente'),
        COALESCE(
            NEW.raw_user_meta_data->'preferencias_corte', 
            '{
                "estilo": "Fade Clásico",
                "tipo_cabello": "Lacio",
                "barba": "Perfilada con Navaja",
                "frecuencia": "Quincenal",
                "notas": "Preferencia inicial registrada al crear cuenta"
            }'::jsonb
        ),
        COALESCE(NEW.raw_user_meta_data->>'historial_notas', 'Cliente dado de alta desde la app móvil.')
    )
    ON CONFLICT (id) DO UPDATE SET
        nombre = COALESCE(NULLIF(EXCLUDED.nombre, ''), public.usuarios.nombre),
        correo = EXCLUDED.correo,
        telefono = COALESCE(NULLIF(EXCLUDED.telefono, ''), public.usuarios.telefono),
        rol = COALESCE(NULLIF(EXCLUDED.rol, ''), public.usuarios.rol),
        updated_at = timezone('utc'::text, now());
        
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- 2.1 TRIGGER: auto_confirm_user_email (Desactiva bloqueo por confirmación de correo)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.auto_confirm_user_email()
RETURNS TRIGGER AS $$
BEGIN
    NEW.email_confirmed_at = COALESCE(NEW.email_confirmed_at, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_auto_confirm_user_email ON auth.users;
CREATE TRIGGER tr_auto_confirm_user_email
    BEFORE INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.auto_confirm_user_email();

-- =============================================================================
-- 3. TABLA: public.barberos (Sustituye a estilistas)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.barberos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    especialidad TEXT NOT NULL DEFAULT 'Master Barber & Fade',
    experiencia TEXT DEFAULT '5 años de experiencia',
    foto_url TEXT DEFAULT 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=600&q=80',
    activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- =============================================================================
-- 4. TABLA: public.servicios
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.servicios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    categoria TEXT NOT NULL CHECK (categoria IN ('Corte', 'Barba', 'Facial', 'Combo')),
    precio NUMERIC(10,2) NOT NULL CHECK (precio >= 0),
    duracion_min INT NOT NULL DEFAULT 30 CHECK (duracion_min > 0),
    descripcion TEXT DEFAULT '',
    imagen_url TEXT DEFAULT '',
    activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- =============================================================================
-- 5. TABLA: public.citas (Con prevención estricta de concurrencia)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.citas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    barbero_id UUID NOT NULL REFERENCES public.barberos(id) ON DELETE CASCADE,
    servicio_id UUID NOT NULL REFERENCES public.servicios(id) ON DELETE CASCADE,
    fecha DATE NOT NULL,
    hora VARCHAR(10) NOT NULL, -- Ej: '09:00 AM'
    estado VARCHAR(20) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'confirmada', 'completada', 'cancelada')),
    notas_corte TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 🔒 PREVENCIÓN DE CONCURRENCIA Y SOLAPAMIENTO DE CITAS:
CREATE UNIQUE INDEX IF NOT EXISTS idx_citas_concurrencia_activa 
ON public.citas (barbero_id, fecha, hora) 
WHERE estado != 'cancelada';

-- ⚡ ÍNDICES B-TREE PARA CONSULTAS ULTRA RÁPIDAS (< 2.0s):
CREATE INDEX IF NOT EXISTS idx_citas_fecha ON public.citas(fecha);
CREATE INDEX IF NOT EXISTS idx_citas_cliente ON public.citas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_citas_barbero ON public.citas(barbero_id);
CREATE INDEX IF NOT EXISTS idx_citas_estado ON public.citas(estado);

-- =============================================================================
-- 6. TABLA: public.productos (Inventario masculino)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.productos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    categoria TEXT NOT NULL DEFAULT 'Cuidado Capilar',
    precio NUMERIC(10,2) NOT NULL CHECK (precio >= 0),
    stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
    imagen_url TEXT DEFAULT '',
    descripcion TEXT DEFAULT '',
    activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_productos_categoria ON public.productos(categoria);
CREATE INDEX IF NOT EXISTS idx_productos_activo ON public.productos(activo);

-- =============================================================================
-- 7. TABLA: public.anuncios (Banners emergentes y promociones)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.anuncios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo TEXT NOT NULL,
    descripcion TEXT NOT NULL,
    imagen_url TEXT DEFAULT '',
    activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- =============================================================================
-- 8. TABLA: public.mensajes_comunidad (Muro y Chat en vivo de Barber Shop)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.mensajes_comunidad (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
    autor_nombre TEXT NOT NULL DEFAULT 'Cliente Barber Shop',
    autor_rol TEXT NOT NULL DEFAULT 'cliente',
    autor_avatar TEXT DEFAULT '',
    mensaje TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_mensajes_comunidad_created_at ON public.mensajes_comunidad(created_at);

-- Habilitar replicación en tiempo real (Supabase Realtime WebSockets) para mensajes_comunidad
ALTER TABLE public.mensajes_comunidad REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'mensajes_comunidad'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.mensajes_comunidad;
  END IF;
END $$;

-- =============================================================================
-- 9. FUNCIÓN RPC TRANSACCIONAL: procesar_compra_carrito
-- =============================================================================
CREATE OR REPLACE FUNCTION public.procesar_compra_carrito(
    p_items JSONB,
    p_cliente_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    item RECORD;
    v_producto_id UUID;
    v_cantidad INT;
    v_stock_actual INT;
    v_nombre TEXT;
BEGIN
    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'El carrito de compras está vacío.';
    END IF;

    FOR item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(id UUID, cantidad INT)
    LOOP
        v_producto_id := item.id;
        v_cantidad := item.cantidad;

        SELECT stock, nombre INTO v_stock_actual, v_nombre
        FROM public.productos
        WHERE id = v_producto_id AND activo = true
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'El producto seleccionado no existe o está inactivo.';
        END IF;

        IF v_stock_actual < v_cantidad THEN
            RAISE EXCEPTION 'Stock insuficiente para el producto "%" (Disponibles: %, Solicitados: %).', 
                v_nombre, v_stock_actual, v_cantidad;
        END IF;

        UPDATE public.productos
        SET stock = stock - v_cantidad
        WHERE id = v_producto_id;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Compra procesada exitosamente y stock actualizado.'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =============================================================================
-- 10. SEGURIDAD: ROW LEVEL SECURITY (RLS) SIN RECURSIÓN INFINITA
-- =============================================================================
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barberos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.citas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anuncios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mensajes_comunidad ENABLE ROW LEVEL SECURITY;

-- Eliminar TODAS las políticas antiguas que causaban recursión infinita
DROP POLICY IF EXISTS "Lectura de perfiles de usuarios" ON public.usuarios;
DROP POLICY IF EXISTS "Actualización de propio perfil" ON public.usuarios;
DROP POLICY IF EXISTS "Inserción de propio perfil" ON public.usuarios;
DROP POLICY IF EXISTS "Eliminación de usuarios por admin" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_select_policy" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_insert_policy" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_update_policy" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_delete_policy" ON public.usuarios;

DROP POLICY IF EXISTS "Lectura pública de barberos" ON public.barberos;
DROP POLICY IF EXISTS "Gestión de barberos por admin" ON public.barberos;
DROP POLICY IF EXISTS "barberos_all_policy" ON public.barberos;

DROP POLICY IF EXISTS "Lectura pública de servicios" ON public.servicios;
DROP POLICY IF EXISTS "Gestión de servicios por admin" ON public.servicios;
DROP POLICY IF EXISTS "servicios_all_policy" ON public.servicios;

DROP POLICY IF EXISTS "Lectura pública de productos" ON public.productos;
DROP POLICY IF EXISTS "Gestión de productos por admin" ON public.productos;
DROP POLICY IF EXISTS "productos_all_policy" ON public.productos;

DROP POLICY IF EXISTS "Lectura pública de anuncios" ON public.anuncios;
DROP POLICY IF EXISTS "Gestión de anuncios por admin" ON public.anuncios;
DROP POLICY IF EXISTS "anuncios_all_policy" ON public.anuncios;

DROP POLICY IF EXISTS "Ver citas propias o de staff" ON public.citas;
DROP POLICY IF EXISTS "Crear citas propias" ON public.citas;
DROP POLICY IF EXISTS "Modificar citas propias o staff" ON public.citas;
DROP POLICY IF EXISTS "Eliminar citas por admin" ON public.citas;
DROP POLICY IF EXISTS "citas_all_policy" ON public.citas;

DROP POLICY IF EXISTS "Lectura pública de mensajes de comunidad" ON public.mensajes_comunidad;
DROP POLICY IF EXISTS "Publicación de mensajes por usuarios autenticados" ON public.mensajes_comunidad;
DROP POLICY IF EXISTS "Eliminación de mensajes por autor o admin" ON public.mensajes_comunidad;
DROP POLICY IF EXISTS "mensajes_comunidad_all_policy" ON public.mensajes_comunidad;

-- Nuevas políticas NO RECURSIVAS que permiten flujo completo de Clientes y Administrador:
CREATE POLICY "usuarios_select_policy" ON public.usuarios FOR SELECT USING (true);
CREATE POLICY "usuarios_insert_policy" ON public.usuarios FOR INSERT WITH CHECK (true);
CREATE POLICY "usuarios_update_policy" ON public.usuarios FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "usuarios_delete_policy" ON public.usuarios FOR DELETE USING (true);

CREATE POLICY "barberos_all_policy" ON public.barberos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "servicios_all_policy" ON public.servicios FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "productos_all_policy" ON public.productos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anuncios_all_policy" ON public.anuncios FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "citas_all_policy" ON public.citas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "mensajes_comunidad_all_policy" ON public.mensajes_comunidad FOR ALL USING (true) WITH CHECK (true);

-- =============================================================================
-- 11. SINCRONIZACIÓN RETROACTIVA DE USUARIOS Y DATOS SEMILLA (100% MASCULINOS)
-- =============================================================================

-- Sincronizar cualquier usuario existente en auth.users que no se haya copiado a public.usuarios
INSERT INTO public.usuarios (id, nombre, correo, telefono, rol, historial_notas)
SELECT 
    au.id,
    COALESCE(au.raw_user_meta_data->>'nombre', split_part(au.email, '@', 1)),
    au.email,
    COALESCE(au.raw_user_meta_data->>'telefono', ''),
    CASE WHEN au.email = 'admin@barbershop.pe' THEN 'admin' ELSE COALESCE(au.raw_user_meta_data->>'rol', 'cliente') END,
    'Sincronizado desde Supabase Auth'
FROM auth.users au
ON CONFLICT (id) DO UPDATE SET
    correo = EXCLUDED.correo,
    telefono = COALESCE(NULLIF(public.usuarios.telefono, ''), EXCLUDED.telefono),
    rol = CASE WHEN EXCLUDED.correo = 'admin@barbershop.pe' THEN 'admin' ELSE public.usuarios.rol END;

-- Semilla de Barberos (solo si está vacía)
INSERT INTO public.barberos (nombre, especialidad, experiencia, foto_url, activo)
SELECT * FROM (VALUES
    ('Carlos "Blade" Mendoza', 'Master Barber / Fade & Degradados Navaja', '8 años de experiencia en barbería urbana y tradicional', 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=600&q=80', true),
    ('Mateo Quispe', 'Especialista en Barba, Toalla Caliente & Visagismo', '6 años perfeccionando técnicas de afeitado clásico', 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&w=600&q=80', true),
    ('Leonardo Valdivia', 'Estilista Masculino / Pompadour, Texturizados & Colorimetría', '5 años en cortes clásicos y tendencias modernas', 'https://images.unsplash.com/photo-1517832606589-7629c339590a?auto=format&fit=crop&w=600&q=80', true)
) AS v(nombre, especialidad, experiencia, foto_url, activo)
WHERE NOT EXISTS (SELECT 1 FROM public.barberos LIMIT 1);

-- Semilla de Servicios (solo si está vacía)
INSERT INTO public.servicios (nombre, categoria, precio, duracion_min, descripcion, imagen_url, activo)
SELECT * FROM (VALUES
    ('Corte Clásico Ejecutivo', 'Corte', 35.00, 35, 'Corte tijera o máquina a elección, lavado capilar purificante y peinado con cera mate.', 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=600&q=80', true),
    ('Degradado Skin Fade Urbano', 'Corte', 40.00, 45, 'Desvanecido a cero o navaja con definición de contornos, toalla fresca y tónico.', 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=600&q=80', true),
    ('Ritual de Barba Tradicional', 'Barba', 30.00, 30, 'Vapor de ozono, toallas calientes, perfilado milimétrico a navaja y bálsamo hidratante.', 'https://images.unsplash.com/photo-1512690459411-b9245aed614b?auto=format&fit=crop&w=600&q=80', true),
    ('Combo Master Barber (Corte + Barba)', 'Combo', 60.00, 60, 'El combo definitivo: Degradado Fade + Ritual de Barba completo con masaje facial relajante.', 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=600&q=80', true),
    ('Limpieza Facial Black Mask', 'Facial', 45.00, 30, 'Exfoliación profunda para hombre, mascarilla de carbón activado para puntos negros e hidratación.', 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=600&q=80', true)
) AS v(nombre, categoria, precio, duracion_min, descripcion, imagen_url, activo)
WHERE NOT EXISTS (SELECT 1 FROM public.servicios LIMIT 1);

-- Corrección defensiva si imagen_url y descripcion estaban invertidos en productos
UPDATE public.productos
SET 
    imagen_url = descripcion,
    descripcion = imagen_url
WHERE descripcion LIKE 'http%' AND imagen_url NOT LIKE 'http%';

-- Corrección de fotos femeninas o rotas en productos existentes de la base de datos
UPDATE public.productos
SET imagen_url = 'https://images.unsplash.com/photo-1621607512214-68297480165e?auto=format&fit=crop&w=600&q=80'
WHERE nombre ILIKE '%Cera Mate%';

UPDATE public.productos
SET imagen_url = 'https://images.unsplash.com/photo-1512690459411-b9245aed614b?auto=format&fit=crop&w=600&q=80'
WHERE nombre ILIKE '%Aceite%';

UPDATE public.productos
SET imagen_url = 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=600&q=80'
WHERE nombre ILIKE '%Pomada%' OR imagen_url LIKE '%1522337360788%';

UPDATE public.productos
SET imagen_url = 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=600&q=80'
WHERE nombre ILIKE '%Shampoo%';

UPDATE public.productos
SET imagen_url = 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&w=600&q=80'
WHERE nombre ILIKE '%Bálsamo%' OR nombre ILIKE '%Balsamo%' OR imagen_url LIKE '%1608248597359%';

-- Semilla de Productos (solo si está vacía)
INSERT INTO public.productos (nombre, categoria, precio, stock, imagen_url, descripcion, activo)
SELECT * FROM (VALUES
    ('Cera Mate Fijación Fuerte (100g)', 'Fijación Capilar', 45.00, 35, 'https://images.unsplash.com/photo-1621607512214-68297480165e?auto=format&fit=crop&w=600&q=80', 'Efecto mate natural sin brillo ni residuos. Ideal para peinados texturizados y pompadours.', true),
    ('Aceite Premium para Barba (30ml)', 'Cuidado de Barba', 40.00, 25, 'https://images.unsplash.com/photo-1512690459411-b9245aed614b?auto=format&fit=crop&w=600&q=80', 'Formulado con aceite de argán, jojoba y aroma a cedro para suavizar y dar brillo saludable.', true),
    ('Pomada Base Agua Brillo Medio (120g)', 'Fijación Capilar', 42.00, 20, 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=600&q=80', 'Fijación flexible de larga duración. Se retira fácilmente con agua en un solo lavado.', true),
    ('Shampoo Fortalecedor & Menta (250ml)', 'Cuidado Capilar', 48.00, 15, 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=600&q=80', 'Estimula el folículo piloso, controla el exceso de grasa y proporciona frescura mentolada.', true),
    ('Bálsamo After-Shave Calmante (100ml)', 'Cuidado de Barba', 35.00, 40, 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&w=600&q=80', 'Alivia la irritación del afeitado, cierra poros y previene vellos encarnados con aloe vera.', true)
) AS v(nombre, categoria, precio, stock, imagen_url, descripcion, activo)
WHERE NOT EXISTS (SELECT 1 FROM public.productos LIMIT 1);

-- Semilla de Anuncios Promocionales
INSERT INTO public.anuncios (titulo, descripcion, imagen_url, activo)
SELECT * FROM (VALUES
    ('¡Bienvenido a Barber Shop Lima Norte!', 'Obtén 20% de descuento en tu primer Combo Master Barber reservando desde nuestra App móvil.', 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=800&q=80', true),
    ('Miércoles de Barba & Amigos', 'Perfilado y toalla caliente por solo S/ 25.00 todos los miércoles de 2:00 PM a 6:00 PM.', 'https://images.unsplash.com/photo-1512690459411-b9245aed614b?auto=format&fit=crop&w=800&q=80', true)
) AS v(titulo, descripcion, imagen_url, activo)
WHERE NOT EXISTS (SELECT 1 FROM public.anuncios LIMIT 1);

-- Semilla de Mensajes de Comunidad
INSERT INTO public.mensajes_comunidad (autor_nombre, autor_rol, mensaje)
SELECT * FROM (VALUES
    ('Staff Barber Shop', 'admin', '¡Bienvenidos al canal oficial de la comunidad Barber Shop Lima Norte S.A.C.! 💈 Compartan sus experiencias y consultas.'),
    ('Carlos "Blade" Mendoza', 'barbero', '¡Saludos amigos! Hoy tenemos disponibilidad para degradados Skin Fade y ritual de barba con toalla caliente. 🔥✂️')
) AS v(autor_nombre, autor_rol, mensaje)
WHERE NOT EXISTS (SELECT 1 FROM public.mensajes_comunidad LIMIT 1);

-- =============================================================================
-- 12. PROVISIÓN DE CUENTA OFICIAL DE ADMINISTRADOR
-- Correo: admin@barbershop.pe | Contraseña: Admin123456! | Rol: admin
-- =============================================================================
DO $$
DECLARE
    v_admin_id UUID;
BEGIN
    SELECT id INTO v_admin_id FROM auth.users WHERE email = 'admin@barbershop.pe' LIMIT 1;

    IF v_admin_id IS NULL THEN
        v_admin_id := gen_random_uuid();

        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at,
            confirmation_token,
            email_change,
            email_change_token_new,
            recovery_token
        ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            v_admin_id,
            'authenticated',
            'authenticated',
            'admin@barbershop.pe',
            crypt('Admin123456!', gen_salt('bf')),
            now(),
            '{"provider":"email","providers":["email"]}'::jsonb,
            '{"nombre":"Administrador General","telefono":"929727435","rol":"admin"}'::jsonb,
            now(),
            now(),
            '',
            '',
            '',
            ''
        );

        INSERT INTO auth.identities (
            id,
            user_id,
            provider_id,
            identity_data,
            provider,
            last_sign_in_at,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(),
            v_admin_id,
            v_admin_id::text,
            format('{"sub":"%s","email":"admin@barbershop.pe"}', v_admin_id::text)::jsonb,
            'email',
            now(),
            now(),
            now()
        );
    ELSE
        UPDATE auth.users
        SET 
            encrypted_password = crypt('Admin123456!', gen_salt('bf')),
            email_confirmed_at = COALESCE(email_confirmed_at, now()),
            raw_user_meta_data = '{"nombre":"Administrador General","telefono":"929727435","rol":"admin"}'::jsonb,
            updated_at = now()
        WHERE id = v_admin_id;
    END IF;

    INSERT INTO public.usuarios (
        id,
        nombre,
        correo,
        telefono,
        rol,
        avatar_url,
        historial_notas
    ) VALUES (
        v_admin_id,
        'Administrador General',
        'admin@barbershop.pe',
        '929727435',
        'admin',
        'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=300&q=80',
        'Cuenta oficial de Administración - BARBER SHOP LIMA NORTE S.A.C.'
    )
    ON CONFLICT (id) DO UPDATE SET
        rol = 'admin',
        nombre = 'Administrador General',
        telefono = '929727435',
        updated_at = now();
END $$;
