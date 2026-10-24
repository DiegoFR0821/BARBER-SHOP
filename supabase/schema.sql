-- =============================================================================
-- ESQUEMA RELACIONAL POSTGRESQL / SUPABASE
-- Empresa: BARBER SHOP LIMA NORTE S.A.C.
-- RUC: 20611302151
-- Nombre Comercial: Barber Shop
-- Estándar: OWASP Mobile Top 10 & ISO/IEC 25010 (Seguridad y Fiabilidad)
-- =============================================================================

-- Habilitar extensión para generación de identificadores únicos UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- 1. TABLA: public.usuarios (Perfiles vinculados a auth.users)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.usuarios (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    correo TEXT NOT NULL UNIQUE,
    telefono TEXT DEFAULT '',
    rol TEXT NOT NULL DEFAULT 'cliente' CHECK (rol IN ('cliente', 'admin', 'barbero')),
    avatar_url TEXT DEFAULT 'https://ionicframework.com/docs/img/demos/avatar.svg',
    preferencias_corte JSONB DEFAULT '{
        "estilo": "Fade Medio",
        "tipo_cabello": "Lacio",
        "barba": "Perfilada",
        "frecuencia": "Quincenal",
        "notas": "Corte con navaja y toalla caliente"
    }'::jsonb,
    historial_notas TEXT DEFAULT 'Cliente registrado en Barber Shop Lima Norte.',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Comentarios explicativos de auditoría
COMMENT ON TABLE public.usuarios IS 'Perfiles de clientes y personal de Barber Shop vinculados a auth.users';
COMMENT ON COLUMN public.usuarios.preferencias_corte IS 'Preferencias de corte, degradado, estilo de barba y tipo de cabello';
COMMENT ON COLUMN public.usuarios.historial_notas IS 'Bitácora clínica/técnica de cortes previos para personalización del servicio';

-- =============================================================================
-- 2. TRIGGER: on_auth_user_created (Sincronización automática de perfil)
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
                "tipo_cabello": "Normal",
                "barba": "Perfilada",
                "frecuencia": "Quincenal",
                "notas": "Preferencia inicial registrada al crear cuenta"
            }'::jsonb
        ),
        COALESCE(NEW.raw_user_meta_data->>'historial_notas', 'Cliente dado de alta desde la app móvil.')
    )
    ON CONFLICT (id) DO UPDATE SET
        nombre = EXCLUDED.nombre,
        correo = EXCLUDED.correo,
        updated_at = timezone('utc'::text, now());
        
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- 2.1 TRIGGER: auto_confirm_user_email (Desactiva bloqueo por confirmación de Gmail)
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
    barbero_id UUID NOT NULL REFERENCES public.barberos(id) ON DELETE RESTRICT,
    servicio_id UUID NOT NULL REFERENCES public.servicios(id) ON DELETE RESTRICT,
    fecha DATE NOT NULL,
    hora VARCHAR(10) NOT NULL, -- Ej: '09:00 AM'
    estado VARCHAR(20) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'confirmada', 'completada', 'cancelada')),
    notas_corte TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 🔒 PREVENCIÓN DE CONCURRENCIA Y SOLAPAMIENTO DE CITAS:
-- Impide a nivel de motor de base de datos que 2 clientes agenden al mismo barbero
-- en la misma fecha y la misma hora si la cita no está 'cancelada'.
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
-- 8. FUNCIÓN RPC TRANSACCIONAL: procesar_compra_carrito
-- Descuenta stock de manera atómica con rollback automático ante concurrencia
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
    -- Validar formato del parámetro
    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'El carrito de compras está vacío.';
    END IF;

    -- Iteración para verificar stock disponible (bloqueo por fila FOR UPDATE)
    FOR item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(id UUID, cantidad INT)
    LOOP
        v_producto_id := item.id;
        v_cantidad := item.cantidad;

        IF v_cantidad <= 0 THEN
            RAISE EXCEPTION 'Cantidad no válida para el producto %', v_producto_id;
        END IF;

        -- Obtener producto bloqueando la fila para evitar carreras críticas (Race Condition)
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

        -- Descuento atómico del stock
        UPDATE public.productos
        SET stock = stock - v_cantidad
        WHERE id = v_producto_id;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Compra procesada exitosamente y stock actualizado.'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 9. SEGURIDAD: ROW LEVEL SECURITY (RLS) - OWASP Mobile
-- =============================================================================
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barberos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.citas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anuncios ENABLE ROW LEVEL SECURITY;

-- Políticas para USUARIOS:
-- 1. Los usuarios pueden ver su propio perfil, los admins pueden ver todos
CREATE POLICY "Lectura de perfiles de usuarios" 
ON public.usuarios FOR SELECT 
TO authenticated 
USING (auth.uid() = id OR (SELECT rol FROM public.usuarios WHERE id = auth.uid()) = 'admin');

-- 2. Los usuarios pueden actualizar su propio perfil, o un admin cualquiera
CREATE POLICY "Actualización de propio perfil" 
ON public.usuarios FOR UPDATE 
TO authenticated 
USING (auth.uid() = id OR (SELECT rol FROM public.usuarios WHERE id = auth.uid()) = 'admin')
WITH CHECK (auth.uid() = id OR (SELECT rol FROM public.usuarios WHERE id = auth.uid()) = 'admin');

-- 3. Inserción permitida a usuarios autenticados para su propio ID
CREATE POLICY "Inserción de propio perfil" 
ON public.usuarios FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = id OR (SELECT rol FROM public.usuarios WHERE id = auth.uid()) = 'admin');

-- 4. Eliminación exclusiva de administradores
CREATE POLICY "Eliminación de usuarios por admin" 
ON public.usuarios FOR DELETE 
TO authenticated 
USING ((SELECT rol FROM public.usuarios WHERE id = auth.uid()) = 'admin');

-- Políticas para CATÁLOGOS PÚBLICOS (Barberos, Servicios, Productos, Anuncios):
-- Lectura pública para cualquier usuario (anónimo o autenticado)
CREATE POLICY "Lectura pública de barberos" ON public.barberos FOR SELECT USING (true);
CREATE POLICY "Lectura pública de servicios" ON public.servicios FOR SELECT USING (true);
CREATE POLICY "Lectura pública de productos" ON public.productos FOR SELECT USING (true);
CREATE POLICY "Lectura pública de anuncios" ON public.anuncios FOR SELECT USING (true);

-- Modificación solo permitida a administradores
CREATE POLICY "Gestión de barberos por admin" ON public.barberos FOR ALL TO authenticated 
USING ((SELECT rol FROM public.usuarios WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Gestión de servicios por admin" ON public.servicios FOR ALL TO authenticated 
USING ((SELECT rol FROM public.usuarios WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Gestión de productos por admin" ON public.productos FOR ALL TO authenticated 
USING ((SELECT rol FROM public.usuarios WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Gestión de anuncios por admin" ON public.anuncios FOR ALL TO authenticated 
USING ((SELECT rol FROM public.usuarios WHERE id = auth.uid()) = 'admin');

-- Políticas para CITAS:
-- Clientes ven sus propias citas; administradores y barberos ven todas
CREATE POLICY "Ver citas propias o de staff" 
ON public.citas FOR SELECT 
TO authenticated 
USING (
    cliente_id = auth.uid() 
    OR (SELECT rol FROM public.usuarios WHERE id = auth.uid()) IN ('admin', 'barbero')
);

-- Clientes pueden registrar sus citas
CREATE POLICY "Crear citas propias" 
ON public.citas FOR INSERT 
TO authenticated 
WITH CHECK (
    cliente_id = auth.uid() 
    OR (SELECT rol FROM public.usuarios WHERE id = auth.uid()) = 'admin'
);

-- Actualizar citas (cancelar o confirmar)
CREATE POLICY "Modificar citas propias o staff" 
ON public.citas FOR UPDATE 
TO authenticated 
USING (
    cliente_id = auth.uid() 
    OR (SELECT rol FROM public.usuarios WHERE id = auth.uid()) IN ('admin', 'barbero')
);

-- =============================================================================
-- 10. DATOS SEMILLA (SEED DATA) - BARBER SHOP LIMA NORTE S.A.C.
-- =============================================================================

-- Inserción de Barberos
INSERT INTO public.barberos (nombre, especialidad, experiencia, foto_url, activo) VALUES
('Carlos "Blade" Mendoza', 'Master Barber / Fade & Degradados Navaja', '8 años de experiencia en barbería urbana y tradicional', 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=600&q=80', true),
('Mateo Quispe', 'Especialista en Barba, Toalla Caliente & Visagismo', '6 años perfeccionando técnicas de afeitado clásico', 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&w=600&q=80', true),
('Leonardo Valdivia', 'Estilista Masculino / Pompadour, Texturizados & Colorimetría', '5 años en cortes clásicos y tendencias modernas', 'https://images.unsplash.com/photo-1517832606589-7629c339590a?auto=format&fit=crop&w=600&q=80', true)
ON CONFLICT DO NOTHING;

-- Inserción de Servicios de Barbería
INSERT INTO public.servicios (nombre, categoria, precio, duracion_min, descripcion, imagen_url, activo) VALUES
('Corte Clásico Ejecutivo', 'Corte', 35.00, 35, 'Corte tijera o máquina a elección, lavado capilar purificante y peinado con cera mate.', 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=600&q=80', true),
('Degradado Skin Fade Urbano', 'Corte', 40.00, 45, 'Desvanecido a cero o navaja con definición de contornos, toalla fresca y tónico.', 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=600&q=80', true),
('Ritual de Barba Tradicional', 'Barba', 30.00, 30, 'Vapor de ozono, toallas calientes, perfilado milimétrico a navaja y bálsamo hidratante.', 'https://images.unsplash.com/photo-1512690459411-b9245aed614b?auto=format&fit=crop&w=600&q=80', true),
('Combo Master Barber (Corte + Barba)', 'Combo', 60.00, 60, 'El combo definitivo: Degradado Fade + Ritual de Barba completo con masaje facial relajante.', 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=600&q=80', true),
('Limpieza Facial Black Mask', 'Facial', 45.00, 30, 'Exfoliación profunda para hombre, mascarilla de carbón activado para puntos negros e hidratación.', 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=600&q=80', true)
ON CONFLICT DO NOTHING;

-- Inserción de Productos de Cuidado Personal Masculino
INSERT INTO public.productos (nombre, categoria, precio, stock, imagen_url, descripcion, activo) VALUES
('Cera Mate Fijación Fuerte (100g)', 'Fijación Capilar', 45.00, 35, 'Efecto mate natural sin brillo ni residuos. Ideal para peinados texturizados y pompadours.', 'https://images.unsplash.com/photo-1597854711516-17b5f8507851?auto=format&fit=crop&w=600&q=80', true),
('Aceite Premium para Crecimiento e Hidratación de Barba (30ml)', 'Cuidado de Barba', 40.00, 25, 'Formulado con aceite de argán, jojoba y aroma a cedro para suavizar y dar brillo saludable.', 'https://images.unsplash.com/photo-1621607512214-68297480165e?auto=format&fit=crop&w=600&q=80', true),
('Pomada Base Agua Brillo Medio (120g)', 'Fijación Capilar', 42.00, 20, 'Fijación flexible de larga duración. Se retira fácilmente con agua en un solo lavado.', 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=600&q=80', true),
('Shampoo Fortalecedor Anti-Caída & Menta (250ml)', 'Cuidado Capilar', 48.00, 15, 'Estimula el folículo piloso, controla el exceso de grasa y proporciona frescura mentolada.', 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?auto=format&fit=crop&w=600&q=80', true),
('Bálsamo After-Shave Calmante (100ml)', 'Cuidado de Barba', 35.00, 40, 'Alivia la irritación del afeitado, cierra poros y previene vellos encarnados con aloe vera.', 'https://images.unsplash.com/photo-1608248597359-524f2b963351?auto=format&fit=crop&w=600&q=80', true)
ON CONFLICT DO NOTHING;

-- Inserción de Anuncios Promocionales
INSERT INTO public.anuncios (titulo, descripcion, imagen_url, activo) VALUES
('¡Bienvenido a Barber Shop Lima Norte!', 'Obtén 20% de descuento en tu primer Combo Master Barber reservando desde nuestra App móvil.', 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=800&q=80', true),
('Miércoles de Barba & Amigos', 'Perfilado y toalla caliente por solo S/ 25.00 todos los miércoles de 2:00 PM a 6:00 PM.', 'https://images.unsplash.com/photo-1512690459411-b9245aed614b?auto=format&fit=crop&w=800&q=80', true)
ON CONFLICT DO NOTHING;
