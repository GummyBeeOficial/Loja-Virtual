-- Migration: Full Hardened Checkout (Price & Shipping Source of Truth) - FIXED
-- Date: 2026-04-19
-- Desc: Centraliza a fonte de preço e frete no banco de dados, ignorando inputs inseguros do frontend.

-- 1. Criar tabela de Métodos de Envio (Fonte de Verdade para Frete)
CREATE TABLE IF NOT EXISTS public.shipping_methods (
    id TEXT PRIMARY KEY, -- standard, express, pickup
    label TEXT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    eta TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Popular com dados atuais do frontend
INSERT INTO public.shipping_methods (id, label, price, eta) VALUES 
('standard', 'Entrega Padrão', 0.00, '5 a 7 dias úteis'),
('express', 'Entrega Expressa', 15.00, '1 a 2 dias úteis'),
('pickup', 'Retirada', 0.00, 'Disponível em até 24h')
ON CONFLICT (id) DO UPDATE SET price = EXCLUDED.price, label = EXCLUDED.label, eta = EXCLUDED.eta;

-- 3. Habilitar RLS para shipping_methods
ALTER TABLE public.shipping_methods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Púlico pode ver métodos de envio" ON public.shipping_methods;
CREATE POLICY "Púlico pode ver métodos de envio" ON public.shipping_methods FOR SELECT USING (true);

-- 4. Redefinir a Função Atômica de Pedido
CREATE OR REPLACE FUNCTION public.place_order_atomic(
    p_user_id UUID,
    p_total_amount DECIMAL, -- Ignorado (calculado no backend para segurança)
    p_shipping_address TEXT,
    p_payment_method TEXT,
    p_items JSONB,
    p_shipping_type TEXT DEFAULT NULL, -- Código do frete (ex: standard, express)
    p_shipping_cost DECIMAL DEFAULT 0, -- Ignorado
    p_coupon_code TEXT DEFAULT NULL,
    p_discount_amount DECIMAL DEFAULT 0, -- Ignorado
    p_zip_code TEXT DEFAULT NULL -- Novo parâmetro para cálculo dinâmico de frete
)
RETURNS UUID AS $$
DECLARE
    v_order_id UUID;
    v_item RECORD;
    v_db_product RECORD;
    v_unit_price DECIMAL;
    v_current_stock INTEGER;
    v_subtotal DECIMAL := 0;
    v_shipping_cost DECIMAL := 0;
    v_calculated_discount DECIMAL := 0;
    v_calculated_total DECIMAL := 0;
    v_coupon RECORD;
    -- Variáveis para Frete por CEP
    v_clean_zip TEXT;
    v_rule_price DECIMAL;
    v_shipping_method_id UUID; -- Presumindo UUID conforme estrutura REAL do banco
BEGIN
    -- 1. Validar autenticação
    IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
        RAISE EXCEPTION 'Não autorizado';
    END IF;

    -- 2. Validar se o carrinho não está vazio
    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'O carrinho está vazio';
    END IF;

    -- 3. Calcular Frete Real (Source of Truth: shipping_methods + shipping_rules)
    IF p_shipping_type IS NOT NULL THEN
        -- Buscar o método pelo CODE (Identificador usado no frontend)
        -- Buscamos o ID e o preço base (para fallback)
        SELECT id, price INTO v_shipping_method_id, v_shipping_cost 
        FROM public.shipping_methods 
        WHERE code = p_shipping_type AND active = true;

        -- Se não encontrar por 'code', tenta por 'id' para compatibilidade legada
        IF NOT FOUND THEN
            SELECT id, price INTO v_shipping_method_id, v_shipping_cost 
            FROM public.shipping_methods 
            WHERE id = p_shipping_type AND active = true;
            
            IF NOT FOUND THEN
                RAISE EXCEPTION 'Método de envio % inválido ou inativo.', p_shipping_type;
            END IF;
        END IF;

        -- Se houver CEP informado, procurar por regra específica de CEP
        IF p_zip_code IS NOT NULL AND p_zip_code <> '' THEN
            -- Normalizar CEP (remover hífens, espaços, etc)
            v_clean_zip := regexp_replace(p_zip_code, '\D', '', 'g');
            
            -- Validar formato do CEP normalizado
            IF length(v_clean_zip) = 8 THEN
                -- Procurar regra ativa que englobe o CEP
                SELECT price INTO v_rule_price
                FROM public.shipping_rules
                WHERE shipping_method_id = (SELECT id FROM public.shipping_methods WHERE (code = p_shipping_type OR id = p_shipping_type) LIMIT 1)
                  AND active = true
                  AND min_zip <= v_clean_zip
                  AND max_zip >= v_clean_zip
                ORDER BY priority DESC
                LIMIT 1;

                -- Se encontrou uma regra válida, substitui o custo fixo do método
                IF FOUND THEN
                    v_shipping_cost := v_rule_price;
                END IF;
            END IF;
        END IF;
    END IF;

    -- 4. Recalcular Subtotal Real (Source of Truth: Tabela products)
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id UUID, quantity INTEGER) LOOP
        SELECT price, is_sale, sale_price INTO v_db_product 
        FROM public.products 
        WHERE id = v_item.product_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Produto com ID % não encontrado.', v_item.product_id;
        END IF;

        IF v_item.quantity <= 0 THEN
            RAISE EXCEPTION 'Quantidade inválida para o item %', v_item.product_id;
        END IF;

        -- Usar preço promocional se ativo
        v_subtotal := v_subtotal + (COALESCE(CASE WHEN v_db_product.is_sale THEN v_db_product.sale_price ELSE v_db_product.price END, v_db_product.price) * v_item.quantity);
    END LOOP;

    -- 5. Processamento Seguro de Cupom
    IF p_coupon_code IS NOT NULL AND trim(p_coupon_code) <> '' THEN
        SELECT * INTO v_coupon
        FROM public.coupons
        WHERE lower(code) = lower(trim(p_coupon_code))
        FOR UPDATE;

        IF v_coupon IS NULL THEN
            RAISE EXCEPTION 'O cupom informado não é válido.';
        END IF;

        IF NOT v_coupon.active THEN
            RAISE EXCEPTION 'Este cupom foi desativado.';
        END IF;

        IF v_coupon.expires_at IS NOT NULL AND v_coupon.expires_at < now() THEN
            RAISE EXCEPTION 'Este cupom expirou.';
        END IF;

        IF v_subtotal < v_coupon.min_purchase THEN
            RAISE EXCEPTION 'O valor mínimo para este cupom é R$ %', v_coupon.min_purchase;
        END IF;

        IF v_coupon.usage_limit IS NOT NULL AND v_coupon.used_count >= v_coupon.usage_limit THEN
            RAISE EXCEPTION 'Este cupom atingiu o limite máximo de utilizações.';
        END IF;

        IF v_coupon.type = 'percentage' THEN
            v_calculated_discount := (v_subtotal * v_coupon.value) / 100;
        ELSE
            v_calculated_discount := v_coupon.value;
        END IF;

        v_calculated_discount := LEAST(v_calculated_discount, v_subtotal);

        UPDATE public.coupons 
        SET used_count = used_count + 1 
        WHERE id = v_coupon.id;
    END IF;

    -- 6. Cálculo do Total Final
    v_calculated_total := GREATEST(0, (v_subtotal - v_calculated_discount) + v_shipping_cost);

    -- 7. Inserção do Pedido
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
        v_shipping_cost,
        CASE WHEN v_calculated_discount > 0 THEN lower(p_coupon_code) ELSE NULL END,
        v_calculated_discount
    ) RETURNING id INTO v_order_id;

    -- 8. Processar Itens e Validar Estoque
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
        product_id UUID,
        product_variant_id UUID,
        product_size_id UUID,
        variant_label TEXT,
        size_label TEXT,
        quantity INTEGER,
        product_name_snapshot TEXT,
        product_image_snapshot TEXT
    )
    LOOP
        -- Buscar preço real do DB no momento do item (Snapshot seguro)
        SELECT COALESCE(CASE WHEN is_sale THEN sale_price ELSE price END, price) INTO v_unit_price
        FROM public.products WHERE id = v_item.product_id;

        -- Se houver controle de estoque
        IF v_item.product_size_id IS NOT NULL THEN
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
            v_unit_price, 
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
