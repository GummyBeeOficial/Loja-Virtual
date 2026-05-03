-- ===============================================================
-- 1. FUNÇÃO PARA PROCESSAR ESTOQUE DO PEDIDO (ATÔMICA)
-- ===============================================================
-- Esta função garante que o estoque seja verificado e reduzido em uma única transação,
-- prevenindo race conditions (dois usuários comprando o último item ao mesmo tempo).

CREATE OR REPLACE FUNCTION public.process_order_stock(items JSONB)
RETURNS VOID AS $$
DECLARE
    item RECORD;
    current_stock INTEGER;
BEGIN
    -- 1. Validação de disponibilidade (Primeiro passo para garantir atomicidade)
    -- Usamos jsonb_to_recordset para converter o JSON em uma tabela temporária
    FOR item IN SELECT * FROM jsonb_to_recordset(items) AS x(product_id UUID, variant_id UUID, size_id UUID, quantity INTEGER)
    LOOP
        -- Se o item não possui size_id, não há controle de estoque via product_sizes para ele nesta estrutura
        IF item.size_id IS NULL THEN
            CONTINUE;
        END IF;

        -- Buscar estoque atual com LOCK (FOR UPDATE) para evitar race conditions
        -- O lock garante que nenhuma outra transação altere este registro até que a nossa termine
        SELECT stock INTO current_stock
        FROM public.product_sizes
        WHERE id = item.size_id
        FOR UPDATE;

        -- Validação: Registro de estoque deve existir
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Registro de estoque não encontrado para o ID: %. Verifique se o tamanho foi selecionado corretamente.', item.size_id;
        END IF;

        -- Validação: Estoque suficiente (Não permite stock negativo)
        IF current_stock < item.quantity THEN
            RAISE EXCEPTION 'Estoque insuficiente. Disponível: %, Solicitado: %. Por favor, reduza a quantidade ou remova o item.', 
                current_stock, item.quantity;
        END IF;
    END LOOP;

    -- 2. Execução da baixa de estoque (Segundo passo, após todas as validações passarem)
    FOR item IN SELECT * FROM jsonb_to_recordset(items) AS x(product_id UUID, variant_id UUID, size_id UUID, quantity INTEGER)
    LOOP
        IF item.size_id IS NOT NULL THEN
            UPDATE public.product_sizes
            SET stock = stock - item.quantity
            WHERE id = item.size_id;
        END IF;
    END LOOP;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ===============================================================
-- 2. POLICIES RLS PARA ESTOQUE
-- ===============================================================
-- Garantir que o público possa ver o estoque (para mostrar no frontend)
-- mas apenas admins possam editar diretamente.

ALTER TABLE public.product_sizes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Product Sizes: public read" ON product_sizes;
CREATE POLICY "Product Sizes: public read" ON product_sizes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Product Sizes: admin manage" ON product_sizes;
CREATE POLICY "Product Sizes: admin manage" ON product_sizes 
FOR ALL TO authenticated 
USING (public.is_admin())
WITH CHECK (public.is_admin());
