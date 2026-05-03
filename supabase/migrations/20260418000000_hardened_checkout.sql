-- Migration: Hardened Checkout with Server-Side Coupon Validation
-- Date: 2026-04-18
-- Desc: Migra a lógica de validação e cálculo de descontos para o banco de dados.

CREATE OR REPLACE FUNCTION public.place_order_atomic(
    p_user_id UUID,
    p_total_amount DECIMAL, -- Total do frontend (será validado/ignorado em favor do cálculo real)
    p_shipping_address TEXT,
    p_payment_method TEXT,
    p_items JSONB,
    p_shipping_type TEXT DEFAULT NULL,
    p_shipping_cost DECIMAL DEFAULT 0,
    p_coupon_code TEXT DEFAULT NULL,
    p_discount_amount DECIMAL DEFAULT 0 -- Desconto do frontend (será recalculado)
)
RETURNS UUID AS $$
DECLARE
    v_order_id UUID;
    v_item RECORD;
    v_current_stock INTEGER;
    v_subtotal DECIMAL := 0;
    v_calculated_discount DECIMAL := 0;
    v_calculated_total DECIMAL := 0;
    v_coupon RECORD;
BEGIN
    -- 1. Validar autenticação
    IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
        RAISE EXCEPTION 'Não autorizado';
    END IF;

    -- 2. Validar se o carrinho não está vazio
    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'O carrinho está vazio';
    END IF;

    -- 3. Recalcular Subtotal Real (Source of Truth: Itens do Payload)
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(price DECIMAL, quantity INTEGER) LOOP
        -- Proteção contra valores nulos ou negativos
        IF v_item.price IS NULL OR v_item.price < 0 OR v_item.quantity IS NULL OR v_item.quantity <= 0 THEN
            RAISE EXCEPTION 'Dados de preço ou quantidade inválidos no carrinho.';
        END IF;
        v_subtotal := v_subtotal + (v_item.price * v_item.quantity);
    END LOOP;

    -- 4. Processamento Seguro de Cupom
    IF p_coupon_code IS NOT NULL AND trim(p_coupon_code) <> '' THEN
        -- SELECT FOR UPDATE garante que ninguém mude o used_count deste cupom até o fim desta transaction
        SELECT * INTO v_coupon
        FROM public.coupons
        WHERE lower(code) = lower(trim(p_coupon_code))
        FOR UPDATE;

        -- Validação de existência
        IF v_coupon IS NULL THEN
            RAISE EXCEPTION 'O cupom informado não é válido.';
        END IF;

        -- Validação de Status Ativo
        IF NOT v_coupon.active THEN
            RAISE EXCEPTION 'Este cupom foi desativado.';
        END IF;

        -- Validação de Data de Expiração
        IF v_coupon.expires_at IS NOT NULL AND v_coupon.expires_at < now() THEN
            RAISE EXCEPTION 'Este cupom expirou.';
        END IF;

        -- Validação de Compra Mínima
        IF v_subtotal < v_coupon.min_purchase THEN
            RAISE EXCEPTION 'O valor mínimo para este cupom é R$ %', v_coupon.min_purchase;
        END IF;

        -- Validação de Limite de Uso Geral (Anti-Concorrência)
        IF v_coupon.usage_limit IS NOT NULL AND v_coupon.used_count >= v_coupon.usage_limit THEN
            RAISE EXCEPTION 'Este cupom atingiu o limite máximo de utilizações.';
        END IF;

        -- Cálculo Seguro do Desconto
        IF v_coupon.type = 'percentage' THEN
            v_calculated_discount := (v_subtotal * v_coupon.value) / 100;
        ELSE
            v_calculated_discount := v_coupon.value;
        END IF;

        -- Garantir que o desconto não ultrapasse o subtotal (negativo)
        v_calculated_discount := LEAST(v_calculated_discount, v_subtotal);

        -- Incrementar o uso do cupom de forma atômica
        UPDATE public.coupons 
        SET used_count = used_count + 1 
        WHERE id = v_coupon.id;
    END IF;

    -- 5. Cálculo do Total Final
    v_calculated_total := GREATEST(0, (v_subtotal - v_calculated_discount) + p_shipping_cost);

    -- 6. Inserção do Pedido (Ignorando valores cegos do p_total_amount e p_discount_amount)
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
        v_calculated_total,
        'pending',
        p_shipping_address,
        p_payment_method,
        p_shipping_type,
        p_shipping_cost,
        CASE WHEN v_calculated_discount > 0 THEN lower(p_coupon_code) ELSE NULL END,
        v_calculated_discount
    ) RETURNING id INTO v_order_id;

    -- 7. Processar Itens e Validar Estoque (Source of Truth: product_sizes)
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
        -- Se houver controle de estoque
        IF v_item.product_size_id IS NOT NULL THEN
            -- Locar registro de estoque
            SELECT stock INTO v_current_stock
            FROM public.product_sizes
            WHERE id = v_item.product_size_id
            FOR UPDATE;

            IF v_current_stock IS NULL THEN
                RAISE EXCEPTION 'Referência de estoque inválida para o item %.', v_item.product_name_snapshot;
            END IF;

            IF v_current_stock < v_item.quantity THEN
                RAISE EXCEPTION 'Estoque insuficiente para %. Disponível: %, Necessário: %', 
                    v_item.product_name_snapshot, v_current_stock, v_item.quantity;
            END IF;

            -- Atualizar estoque
            UPDATE public.product_sizes
            SET stock = stock - v_item.quantity
            WHERE id = v_item.product_size_id;
        END IF;

        -- Salvar snapshots do item no pedido
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
