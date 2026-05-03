'use client';

import { CreditCard, Wallet, Banknote } from 'lucide-react';

const PAYMENT_ICONS: Record<string, any> = {
  'cartão de crédito': CreditCard,
  'credit_card': CreditCard,
  'pix': Wallet,
  'boleto': Banknote,
};

interface OrderPaymentCardProps {
  method: string;
}

export function OrderPaymentCard({ method }: OrderPaymentCardProps) {
  const Icon = PAYMENT_ICONS[method.toLowerCase()] || CreditCard;

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-zinc-100 dark:bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-500 dark:text-zinc-400">
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">Método de Pagamento</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Como você pagou pelo pedido</p>
        </div>
      </div>

      <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4 border border-zinc-100 dark:border-zinc-800 flex items-center gap-3">
        <div className="w-8 h-8 bg-white dark:bg-zinc-900 rounded-lg flex items-center justify-center text-zinc-900 dark:text-zinc-100 shadow-sm">
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 capitalize">
          {method.replace('_', ' ')}
        </span>
      </div>
    </div>
  );
}
