-- Garantir que a tabela profiles tenha todas as colunas necessárias para o endereço e dados pessoais
-- O uso de IF NOT EXISTS evita erros caso as colunas já existam.

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS cpf TEXT,
ADD COLUMN IF NOT EXISTS zip_code TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS address_number TEXT,
ADD COLUMN IF NOT EXISTS address_complement TEXT,
ADD COLUMN IF NOT EXISTS neighborhood TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT;

-- Comentário: As políticas de RLS para profiles geralmente já permitem que o usuário 
-- visualize e atualize seu próprio registro (id = auth.uid()).
-- Caso não existam, estas seriam as políticas recomendadas:

-- ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- CREATE POLICY "Usuários podem ver o próprio perfil" 
-- ON public.profiles FOR SELECT 
-- USING (auth.uid() = id);

-- CREATE POLICY "Usuários podem atualizar o próprio perfil" 
-- ON public.profiles FOR UPDATE 
-- USING (auth.uid() = id)
-- WITH CHECK (auth.uid() = id);
