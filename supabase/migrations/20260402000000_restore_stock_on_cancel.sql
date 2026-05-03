-- Migration: Update update_order_status to restore stock on cancellation
-- Date: 2026-04-02

CREATE OR REPLACE FUNCTION public.update_order_status(
    p_order_id UUID,
    p_new_status TEXT
)
RETURNS VOID AS $$
DECLARE
    v_old_status TEXT;
    v_item RECORD;
BEGIN
    -- 1. Obter status atual
    SELECT status INTO v_old_status FROM public.orders WHERE id = p_order_id;

    -- 2. Se o novo status for 'cancelled' e o anterior não era 'cancelled', devolve o estoque
    IF p_new_status = 'cancelled' AND (v_old_status IS NULL OR v_old_status <> 'cancelled') THEN
        -- Restaurar estoque para cada item do pedido
        FOR v_item IN 
            SELECT product_size_id, quantity 
            FROM public.order_items 
            WHERE order_id = p_order_id 
            AND product_size_id IS NOT NULL
        LOOP
            UPDATE public.product_sizes
            SET stock = stock + v_item.quantity
            WHERE id = v_item.product_size_id;
        END LOOP;
    END IF;

    -- 3. Atualizar status e timestamps
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

    -- 4. Registrar no histórico
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
