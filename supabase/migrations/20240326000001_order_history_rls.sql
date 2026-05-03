-- Migration: Ensure order_status_history exists and add RLS
-- Date: 2026-03-26

-- 1. Create order_status_history table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.order_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    old_status TEXT,
    new_status TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

-- 3. Create Policies
DROP POLICY IF EXISTS "Order History: view own or admin" ON order_status_history;
CREATE POLICY "Order History: view own or admin" ON order_status_history FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM orders 
            WHERE orders.id = order_status_history.order_id 
            AND (orders.user_id = auth.uid() OR is_admin() OR get_my_role() IN ('financeiro', 'atendimento'))
        )
    );
