-- Migration: Add Coupons Table and Order Discount Columns
-- Date: 2026-04-15

-- 1. Criar tabela coupons
CREATE TABLE IF NOT EXISTS public.coupons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('percentage', 'fixed')),
    value DECIMAL(10,2) NOT NULL,
    min_purchase DECIMAL(10,2) DEFAULT 0,
    active BOOLEAN DEFAULT true,
    expires_at TIMESTAMPTZ,
    usage_limit INTEGER,
    used_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Alterar tabela orders para registrar o uso do cupom
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS coupon_code TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0;

-- 3. Habilitar RLS para a tabela coupons
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Política para leitura: Usuários precisam ler para validar o cupom no checkout
-- Filtramos apenas cupons ativos e dentro da validade por segurança básica
CREATE POLICY "Qualquer usuário autenticado pode ler cupons ativos"
ON public.coupons FOR SELECT
TO authenticated
USING (active = true AND (expires_at IS NULL OR expires_at > now()));

-- Política para gerenciamento: Apenas staff (admin, super_admin, estoque)
CREATE POLICY "Apenas staff pode gerenciar cupons"
ON public.coupons FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'estoque')
  )
);
