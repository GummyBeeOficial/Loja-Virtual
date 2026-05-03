'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ChevronRight, Package, Calendar, CreditCard } from 'lucide-react';
import OrderStatusBadge from '@/components/orders/order-status-badge';
import { OrderStatus } from '@/lib/order-status';
import { cn } from '@/lib/utils';

interface OrdersListItemProps {
  order: {
    id: string;
    status: OrderStatus;
    total_amount: number;
    created_at: string;
    payment_method: string;
    order_items: {
      id: string;
      product_name_snapshot: string;
      product_image_snapshot: string;
      quantity: number;
    }[];
  };
}

export function OrdersListItem({ order }: OrdersListItemProps) {
  const formattedDate = new Date(order.created_at).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const formattedTotal = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(order.total_amount);

  const totalItems = order.order_items.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <Link
      href={`/account/orders/${order.id}`}
      className="group block bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 transition-all duration-200 hover:shadow-lg hover:shadow-zinc-200/50 dark:hover:shadow-none hover:border-zinc-300 dark:hover:border-zinc-700"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-500 dark:text-zinc-400 group-hover:bg-zinc-900 dark:group-hover:bg-zinc-100 group-hover:text-white dark:group-hover:text-zinc-900 transition-colors duration-200">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Pedido #{order.id.slice(0, 8).toUpperCase()}
              </span>
              <OrderStatusBadge status={order.status} />
            </div>
            <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formattedDate}
              </span>
              <span className="flex items-center gap-1">
                <CreditCard className="w-3 h-3" />
                {order.payment_method}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between md:justify-end gap-6">
          <div className="text-right">
            <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              {formattedTotal}
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              {totalItems} {totalItems === 1 ? 'item' : 'itens'}
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-zinc-300 dark:text-zinc-700 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors duration-200" />
        </div>
      </div>

      {/* Preview dos itens */}
      <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {order.order_items.map((item) => (
          <div
            key={item.id}
            className="relative flex-shrink-0 w-12 h-12 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 overflow-hidden"
          >
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
                <Package className="w-4 h-4 text-zinc-300" />
              </div>
            )}
          </div>
        ))}
      </div>
    </Link>
  );
}
