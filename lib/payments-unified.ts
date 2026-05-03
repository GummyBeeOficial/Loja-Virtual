import { supabase } from '@/lib/supabase';

/**
 * Helper unificado para buscar os métodos de pagamento.
 * Primeiro tenta buscar da nova tabela 'payment_methods'.
 * Caso não encontre dados ou ocorra erro (tabela não existente), 
 * faz o fallback para o sistema antigo na tabela 'settings'.
 */
export async function getPaymentMethods() {
  try {
    // 1. Tentar buscar da nova tabela dinâmica
    const { data: newMethods, error: newError } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('active', true)
      .order('sort_order', { ascending: true });

    // Se houver dados na nova tabela, convertemos para o formato esperado pelo checkout antigo
    if (!newError && newMethods && newMethods.length > 0) {
      const unifiedSettings: any = {};
      
      newMethods.forEach((method) => {
        unifiedSettings[method.code] = {
          active: method.active,
          instructions: method.instructions,
          label: method.label,
          type: method.type,
          icon_name: method.icon_name,
          ...(method.config || {})
        };
      });

      return unifiedSettings;
    }

    // Se a tabela não existir ou estiver vazia, prosseguimos para o fallback
  } catch (err) {
    console.warn('[PaymentsUnified] Erro ao buscar da nova tabela, tentando fallback para settings:', err);
  }

  // 2. Fallback: Ler do sistema antigo (settings.key = 'payment_methods')
  try {
    const { data: oldSettings, error: oldError } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'payment_methods')
      .single();

    if (!oldError && oldSettings && oldSettings.value) {
      return oldSettings.value;
    }
  } catch (err) {
    console.error('[PaymentsUnified] Erro crítico no fallback de pagamentos:', err);
  }

  // Retorno padrão vazio se tudo falhar
  return null;
}
