-- Migration: Update place_order_atomic to support coupons and shipping
-- Date: 2026-04-15

CREATE OR REPLACE FUNCTION public.place_order_atomic(
    p_user_id UUID,
    p_total_amount DECIMAL,
    p_shipping_address TEXT,
    p_payment_method TEXT,
    p_items JSONB,
    p_shipping_type TEXT DEFAULT NULL,
    p_shipping_cost DECIMAL DEFAULT 0,
    p_coupon_code TEXT DEFAULT NULL,
    p_discount_amount DECIMAL DEFAULT 0
)
RETURNS UUID AS $$
DECLARE
    v_order_id UUID;
    v_item RECORD;
    v_current_stock INTEGER;
BEGIN
    -- 1. Validar auth.uid()
    IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
        RAISE EXCEPTION 'Não autorizado';
    END IF;

    -- 2. Validar carrinho não vazio
    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'O carrinho está vazio';
    END IF;

    -- 3. Criar pedido
    INSERT INTO public.orders (
        user_id,
        total_amount,
        status,
        shipping_address,
        payment_method,
        shipping_type,
        shipping_cost,
        coupon_code,
        discount_amount
    ) VALUES (
        p_user_id,
        p_total_amount,
        'pending',
        p_shipping_address,
        p_payment_method,
        p_shipping_type,
        p_shipping_cost,
        p_coupon_code,
        p_discount_amount
    ) RETURNING id INTO v_order_id;

    -- 4. Processar itens
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
        product_id UUID,
        product_variant_id UUID,
        product_size_id UUID,
        variant_label TEXT,
        size_label TEXT,
        quantity INTEGER,
        price DECIMAL,
        product_name_snapshot TEXT,
        product_image_snapshot TEXT
    )
    LOOP
        -- Validar quantity e price
        IF v_item.quantity IS NULL OR v_item.quantity <= 0 THEN
            RAISE EXCEPTION 'Quantidade inválida para o item %', v_item.product_name_snapshot;
        END IF;

        IF v_item.price IS NULL OR v_item.price < 0 THEN
            RAISE EXCEPTION 'Preço inválido para o item %', v_item.product_name_snapshot;
        END IF;

        -- Se houver controle de estoque (product_size_id presente)
        IF v_item.product_size_id IS NOT NULL THEN
            -- Resetar variável para garantir que não estamos usando valor da iteração anterior
            v_current_stock := NULL;

            -- Localizar estoque com LOCK
            SELECT stock INTO v_current_stock
            FROM public.product_sizes
            WHERE id = v_item.product_size_id
            FOR UPDATE;

            -- Validação CRÍTICA: O ID deve existir no banco
            IF v_current_stock IS NULL THEN
                RAISE EXCEPTION 'O identificador de estoque % para o item % é inválido ou não existe.', 
                    v_item.product_size_id, v_item.product_name_snapshot;
            END IF;

            -- Validar estoque suficiente
            IF v_current_stock < v_item.quantity THEN
                RAISE EXCEPTION 'Estoque insuficiente para o item %. Disponível: %, Solicitado: %', 
                    v_item.product_name_snapshot, v_current_stock, v_item.quantity;
            END IF;

            -- Reduzir estoque
            UPDATE public.product_sizes
            SET stock = stock - v_item.quantity
            WHERE id = v_item.product_size_id;

            IF NOT FOUND THEN
                RAISE EXCEPTION 'Falha ao atualizar estoque para product_size_id %', v_item.product_size_id;
            END IF;
        END IF;

        -- Inserir em order_items
        INSERT INTO public.order_items (
            order_id,
            product_id,
            quantity,
            price_at_time,
            product_variant_id,
            product_size_id,
            variant_label,
            size_label,
            product_name_snapshot,
            product_image_snapshot
        ) VALUES (
            v_order_id,
            v_item.product_id,
            v_item.quantity,
            v_item.price,
            v_item.product_variant_id,
            v_item.product_size_id,
            v_item.variant_label,
            v_item.size_label,
            v_item.product_name_snapshot,
            v_item.product_image_snapshot
        );
    END LOOP;

    RETURN v_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
