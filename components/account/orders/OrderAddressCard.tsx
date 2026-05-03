'use client';

import { MapPin } from 'lucide-react';

interface OrderAddressCardProps {
  address: string;
}

export function OrderAddressCard({ address }: OrderAddressCardProps) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-zinc-100 dark:bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-500 dark:text-zinc-400">
          <MapPin className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">Endereço de Entrega</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Onde seu pedido será entregue</p>
        </div>
      </div>

      <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4 border border-zinc-100 dark:border-zinc-800">
        <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed font-medium">
          {address}
        </p>
      </div>
    </div>
  );
}
