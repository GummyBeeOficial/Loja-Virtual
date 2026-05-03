-- Migration: Add tracking information to orders
-- Date: 2026-03-26

-- 1. Add tracking columns to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tracking_code TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tracking_url TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS carrier TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Create or Update update_order_status RPC
CREATE OR REPLACE FUNCTION public.update_order_status(
    p_order_id UUID,
    p_new_status TEXT
)
RETURNS VOID AS $$
DECLARE
    v_old_status TEXT;
BEGIN
    -- 1. Get current status
    SELECT status INTO v_old_status FROM public.orders WHERE id = p_order_id;

    -- 2. Update status and timestamps
    UPDATE public.orders
    SET 
        status = p_new_status,
        updated_at = NOW(),
        shipped_at = CASE 
            WHEN p_new_status = 'shipped' AND shipped_at IS NULL THEN NOW() 
            ELSE shipped_at 
        END,
        delivered_at = CASE 
            WHEN p_new_status = 'delivered' AND delivered_at IS NULL THEN NOW() 
            ELSE delivered_at 
        END
    WHERE id = p_order_id;

    -- 3. Log history
    INSERT INTO public.order_status_history (
        order_id,
        old_status,
        new_status,
        created_at
    ) VALUES (
        p_order_id,
        v_old_status,
        p_new_status,
        NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
