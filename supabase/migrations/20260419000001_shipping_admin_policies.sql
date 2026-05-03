-- Migration: Add Admin Policies for shipping_methods
-- Date: 2026-04-19
-- Desc: Permite que administradores gerenciem os métodos de envio.

-- 1. Política de Inserção
DROP POLICY IF EXISTS "Admins podem inserir métodos de envio" ON public.shipping_methods;
CREATE POLICY "Admins podem inserir métodos de envio" 
ON public.shipping_methods 
FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  )
);

-- 2. Política de Atualização
DROP POLICY IF EXISTS "Admins podem atualizar métodos de envio" ON public.shipping_methods;
CREATE POLICY "Admins podem atualizar métodos de envio" 
ON public.shipping_methods 
FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  )
);

-- 3. Política de Deleção
DROP POLICY IF EXISTS "Admins podem deletar métodos de envio" ON public.shipping_methods;
CREATE POLICY "Admins podem deletar métodos de envio" 
ON public.shipping_methods 
FOR DELETE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  )
);
