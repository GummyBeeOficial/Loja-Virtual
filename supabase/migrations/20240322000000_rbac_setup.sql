-- ===============================================================
-- 1. ESTRUTURA DE CARGOS (ENUM)
-- ===============================================================
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM (
        'super_admin', 
        'admin', 
        'financeiro', 
        'estoque', 
        'atendimento', 
        'user'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ===============================================================
-- 2. TABELA DE PERFIS (PROFISSIONAL)
-- ===============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    role user_role DEFAULT 'user' NOT NULL,
    full_name TEXT,
    phone TEXT,
    address TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS na tabela de perfis
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ===============================================================
-- 3. AJUSTES NA TABELA ORDERS (PARA NÃO QUEBRAR O CHECKOUT)
-- ===============================================================

-- Adicionar colunas faltantes se não existirem
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_address TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_method TEXT;

-- Renomear customer_id para user_id se necessário (conforme solicitado pelo usuário)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'customer_id') THEN
        ALTER TABLE public.orders RENAME COLUMN customer_id TO user_id;
    END IF;
END $$;

-- Garantir que user_id referencia profiles(id)
-- Primeiro remove a FK antiga se existir (geralmente nomeada automaticamente ou manualmente)
DO $$
DECLARE
    fk_name TEXT;
BEGIN
    SELECT constraint_name INTO fk_name
    FROM information_schema.key_column_usage
    WHERE table_name = 'orders' AND column_name = 'user_id' AND constraint_name LIKE '%customer_id_fkey%';
    
    IF fk_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.orders DROP CONSTRAINT ' || fk_name;
    END IF;
END $$;

ALTER TABLE public.orders 
    ADD CONSTRAINT orders_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- ===============================================================
-- 4. AJUSTES NA TABELA ORDER_ITEMS
-- ===============================================================
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS size TEXT;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS color TEXT;

-- ===============================================================
-- 5. FUNÇÕES AUXILIARES DE SEGURANÇA (HELPERS)
-- ===============================================================

-- Função para pegar o cargo do usuário logado
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS user_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_role public.user_role;
BEGIN
    SELECT role INTO current_role FROM public.profiles WHERE id = auth.uid();
    RETURN current_role;
END;
$$;

-- Atalho para verificar se é Admin ou Super Admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
    );
END;
$$;

-- ===============================================================
-- 6. AUTOMAÇÃO: TRIGGER PARA NOVOS USUÁRIOS
-- ===============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, role, full_name)
    VALUES (
        new.id, 
        new.email, 
        'user'::public.user_role, 
        COALESCE(new.raw_user_meta_data->>'full_name', '')
    );
    RETURN new;
END;
$$;

-- Trigger que dispara ao criar usuário no Auth
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===============================================================
-- 7. BACKFILL: SINCRONIZAR USUÁRIOS EXISTENTES
-- ===============================================================
INSERT INTO public.profiles (id, email, role)
SELECT id, email, 'user'
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- ===============================================================
-- 8. PROMOÇÃO DO USUÁRIO PARA SUPER_ADMIN
-- ===============================================================
UPDATE public.profiles 
SET role = 'super_admin'
WHERE lower(email) = 'lucasmotasant@gmail.com';

-- ===============================================================
-- 9. REESCRITA DAS POLICIES RLS (PROFISSIONAL)
-- ===============================================================

-- --- TABELA: PROFILES ---
DROP POLICY IF EXISTS "Profiles: view own" ON profiles;
CREATE POLICY "Profiles: view own" ON profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Profiles: admin view all" ON profiles;
CREATE POLICY "Profiles: admin view all" ON profiles FOR SELECT USING (is_admin());

DROP POLICY IF EXISTS "Profiles: admin update roles" ON profiles;
CREATE POLICY "Profiles: admin update roles" ON profiles FOR UPDATE USING (is_admin());

-- --- TABELA: PRODUCTS ---
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Products" ON products;
CREATE POLICY "Public Read Products" ON products FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin/Estoque Insert Products" ON products;
CREATE POLICY "Admin/Estoque Insert Products" ON products FOR INSERT TO authenticated 
    WITH CHECK (is_admin() OR get_my_role() = 'estoque');

DROP POLICY IF EXISTS "Admin/Estoque Update Products" ON products;
CREATE POLICY "Admin/Estoque Update Products" ON products FOR UPDATE TO authenticated 
    USING (is_admin() OR get_my_role() = 'estoque');

DROP POLICY IF EXISTS "Admin/Estoque Delete Products" ON products;
CREATE POLICY "Admin/Estoque Delete Products" ON products FOR DELETE TO authenticated 
    USING (is_admin() OR get_my_role() = 'estoque');

-- --- TABELA: CATEGORIES ---
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Categories" ON categories;
CREATE POLICY "Public Read Categories" ON categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin/Estoque Insert Categories" ON categories;
CREATE POLICY "Admin/Estoque Insert Categories" ON categories FOR INSERT TO authenticated 
    WITH CHECK (is_admin() OR get_my_role() = 'estoque');

DROP POLICY IF EXISTS "Admin/Estoque Update Categories" ON categories;
CREATE POLICY "Admin/Estoque Update Categories" ON categories FOR UPDATE TO authenticated 
    USING (is_admin() OR get_my_role() = 'estoque');

DROP POLICY IF EXISTS "Admin/Estoque Delete Categories" ON categories;
CREATE POLICY "Admin/Estoque Delete Categories" ON categories FOR DELETE TO authenticated 
    USING (is_admin() OR get_my_role() = 'estoque');

-- --- TABELA: ORDERS ---
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Orders: view own or admin" ON orders;
CREATE POLICY "Orders: view own or admin" ON orders FOR SELECT TO authenticated
    USING (
        auth.uid() = user_id OR 
        is_admin() OR 
        get_my_role() IN ('financeiro', 'atendimento')
    );

DROP POLICY IF EXISTS "Orders: user insert own" ON orders;
CREATE POLICY "Orders: user insert own" ON orders FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Orders: admin update status" ON orders;
CREATE POLICY "Orders: admin update status" ON orders FOR UPDATE TO authenticated
    USING (is_admin() OR get_my_role() IN ('financeiro', 'atendimento'))
    WITH CHECK (is_admin() OR get_my_role() IN ('financeiro', 'atendimento'));

-- --- TABELA: ORDER_ITEMS ---
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Order Items: view own or admin" ON order_items;
CREATE POLICY "Order Items: view own or admin" ON order_items FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM orders 
            WHERE orders.id = order_items.order_id 
            AND (orders.user_id = auth.uid() OR is_admin() OR get_my_role() IN ('financeiro', 'atendimento'))
        )
    );

DROP POLICY IF EXISTS "Order Items: insert via order" ON order_items;
CREATE POLICY "Order Items: insert via order" ON order_items FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM orders 
            WHERE orders.id = order_items.order_id 
            AND orders.user_id = auth.uid()
        )
    );

-- --- TABELA: SETTINGS ---
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Settings" ON settings;
CREATE POLICY "Public Read Settings" ON settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin Manage Settings" ON settings;
CREATE POLICY "Admin Manage Settings" ON settings FOR ALL TO authenticated USING (is_admin());

-- --- TABELA: BANNERS ---
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Banners" ON banners;
CREATE POLICY "Public Read Banners" ON banners FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin Manage Banners" ON banners;
CREATE POLICY "Admin Manage Banners" ON banners FOR ALL TO authenticated USING (is_admin());
