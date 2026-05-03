'use client';

import { Package, Calendar, CreditCard, DollarSign } from 'lucide-react';
import OrderStatusBadge from '@/components/orders/order-status-badge';
import { OrderStatus } from '@/lib/order-status';

interface OrderSummaryCardProps {
  order: {
    id: string;
    status: OrderStatus;
    total_amount: number;
    created_at: string;
    payment_method: string;
  };
}

export function OrderSummaryCard({ order }: OrderSummaryCardProps) {
  const formattedDate = new Date(order.created_at).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const formattedTotal = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(order.total_amount);

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-zinc-100 dark:bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-500 dark:text-zinc-400">
          <Package className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">Resumo do Pedido</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">#{order.id.toUpperCase()}</p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex justify-between items-center py-4 border-b border-zinc-50 dark:border-zinc-800/50">
          <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 text-xs uppercase font-bold">
            <Calendar className="w-3.5 h-3.5" />
            Data do Pedido
          </div>
          <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{formattedDate}</span>
        </div>

        <div className="flex justify-between items-center py-4 border-b border-zinc-50 dark:border-zinc-800/50">
          <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 text-xs uppercase font-bold">
            <CreditCard className="w-3.5 h-3.5" />
            Pagamento
          </div>
          <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{order.payment_method}</span>
        </div>

        <div className="flex justify-between items-center py-4 border-b border-zinc-50 dark:border-zinc-800/50">
          <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 text-xs uppercase font-bold">
            Status Atual
          </div>
          <OrderStatusBadge status={order.status} />
        </div>

        <div className="flex justify-between items-center pt-4">
          <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 text-sm uppercase font-black">
            Total
          </div>
          <span className="text-2xl font-black text-zinc-900 dark:text-zinc-100">{formattedTotal}</span>
        </div>
      </div>
    </div>
  );
}
