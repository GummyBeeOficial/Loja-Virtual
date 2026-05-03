'use client';

import Image from 'next/image';
import { Package, ShoppingBag } from 'lucide-react';

interface OrderItemsListProps {
  items: {
    id: string;
    product_name_snapshot: string;
    product_image_snapshot: string;
    quantity: number;
    price_at_time: number;
    variant_label?: string;
    size_label?: string;
  }[];
}

export function OrderItemsList({ items }: OrderItemsListProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-zinc-100 dark:bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-500 dark:text-zinc-400">
          <ShoppingBag className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">Produtos no Pedido</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{items.length} {items.length === 1 ? 'item' : 'itens'}</p>
        </div>
      </div>

      <div className="space-y-6">
        {items.map((item) => (
          <div key={item.id} className="flex gap-4 items-center group">
            <div className="relative w-20 h-20 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-800 overflow-hidden flex-shrink-0 transition-transform duration-200 group-hover:scale-105">
              {item.product_image_snapshot ? (
                <Image
                  src={item.product_image_snapshot}
                  alt={item.product_name_snapshot}
                  fill
                  className="object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="w-8 h-8 text-zinc-200" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate mb-1">
                {item.product_name_snapshot}
              </h4>
              <div className="flex flex-wrap gap-2 mb-2">
                {item.variant_label && (
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 rounded-full">
                    {item.variant_label}
                  </span>
                )}
                {item.size_label && (
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 rounded-full">
                    {item.size_label}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                  {item.quantity}x {formatCurrency(item.price_at_time)}
                </div>
                <div className="text-sm font-black text-zinc-900 dark:text-zinc-100">
                  {formatCurrency(item.quantity * item.price_at_time)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
