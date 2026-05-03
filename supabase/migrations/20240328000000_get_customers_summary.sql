-- Migration: Create get_customers_summary RPC
-- Date: 2026-03-28

CREATE OR REPLACE FUNCTION public.get_customers_summary()
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  phone TEXT,
  cpf TEXT,
  city TEXT,
  state TEXT,
  created_at TIMESTAMPTZ,
  total_orders BIGINT,
  total_spent NUMERIC,
  last_order_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- 1. Verificação de Segurança (Apenas Staff autorizado)
  -- Usamos as funções helpers definidas em rbac_setup.sql
  IF NOT (
    public.is_admin() OR 
    public.get_my_role() IN ('financeiro', 'atendimento')
  ) THEN
    RAISE EXCEPTION 'Acesso negado: Permissões insuficientes para visualizar sumário de clientes.';
  END IF;

  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.full_name,
    p.phone,
    p.cpf,
    p.city,
    p.state,
    u.created_at, -- Obtido da tabela auth.users via join
    COUNT(o.id)::BIGINT as total_orders,
    COALESCE(SUM(o.total_amount), 0)::NUMERIC as total_spent,
    MAX(o.created_at) as last_order_at
  FROM 
    public.profiles p
  JOIN 
    auth.users u ON p.id = u.id
  LEFT JOIN 
    public.orders o ON p.id = o.user_id
  GROUP BY 
    p.id, p.email, p.full_name, p.phone, p.cpf, p.city, p.state, u.created_at;
END;
$$;

-- Garantir permissão de execução para usuários autenticados
GRANT EXECUTE ON FUNCTION public.get_customers_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_customers_summary() TO service_role;
