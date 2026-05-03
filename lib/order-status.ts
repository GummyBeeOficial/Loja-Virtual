export type OrderStatus = 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pendente',
  paid: 'Pago',
  processing: 'Processando',
  shipped: 'Enviado',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
};

export const ORDER_STATUS_STYLES: Record<OrderStatus, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
  paid: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800',
  processing: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
  shipped: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-800',
  delivered: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
  cancelled: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
};

export const ORDER_STATUS_DESCRIPTIONS: Record<OrderStatus, string> = {
  pending: 'Aguardando confirmação ou pagamento',
  paid: 'Pagamento confirmado com sucesso',
  processing: 'Pedido em fase de preparação',
  shipped: 'Pedido despachado para entrega',
  delivered: 'Pedido finalizado com sucesso',
  cancelled: 'Pedido encerrado ou cancelado',
};

export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['paid', 'cancelled'],
  paid: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};

/**
 * Retorna uma mensagem de erro amigável para falhas na transição de status
 */
export function getFriendlyOrderStatusError(
  error: any, 
  currentStatus: OrderStatus, 
  newStatus: OrderStatus
): string {
  // 1. Validar transição no frontend (redundância de segurança)
  const validTransitions = ORDER_STATUS_TRANSITIONS[currentStatus] || [];
  if (!validTransitions.includes(newStatus)) {
    if (currentStatus === 'delivered') {
      return 'Não é possível alterar um pedido que já foi entregue.';
    }
    if (currentStatus === 'cancelled') {
      return 'Não é possível alterar um pedido cancelado.';
    }
    return 'A transição de status solicitada não é permitida.';
  }

  // 2. Tratar erros vindos do Supabase/Postgres
  const message = error?.message || '';
  const details = error?.details || '';
  const hint = error?.hint || '';
  const code = error?.code || '';

  // Erros de violação de regra de negócio (geralmente via RAISE EXCEPTION no Postgres)
  if (code === 'P0001' || message.includes('transição') || message.includes('transition')) {
    return message || 'A transição de status solicitada não é permitida.';
  }

  // Erros de permissão (RLS)
  if (code === '42501' || message.includes('permission') || message.includes('permissão')) {
    return 'Você não tem permissão para alterar o status deste pedido.';
  }

  // Fallback genérico mas profissional
  return 'Não foi possível atualizar o status do pedido. Tente novamente.';
}
