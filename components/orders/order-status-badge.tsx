'use client';

import React from 'react';
import { OrderStatus, ORDER_STATUS_LABELS, ORDER_STATUS_STYLES } from '@/lib/order-status';
import { cn } from '@/lib/utils';

interface OrderStatusBadgeProps {
  status: OrderStatus;
  className?: string;
}

export default function OrderStatusBadge({ status, className }: OrderStatusBadgeProps) {
  const label = ORDER_STATUS_LABELS[status] || status;
  const style = ORDER_STATUS_STYLES[status] || 'bg-gray-100 text-gray-800 border-gray-200';

  return (
    <span className={cn(
      "px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border",
      style,
      className
    )}>
      {label}
    </span>
  );
}
