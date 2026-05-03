'use client';

import { Check, Clock, Package, Truck, CheckCircle2, XCircle } from 'lucide-react';
import { OrderStatus, ORDER_STATUS_LABELS, ORDER_STATUS_DESCRIPTIONS } from '@/lib/order-status';
import { cn } from '@/lib/utils';

interface OrderTimelineProps {
  currentStatus: OrderStatus;
  history: {
    new_status: OrderStatus;
    created_at: string;
  }[];
}

const STEPS: { status: OrderStatus; icon: any }[] = [
  { status: 'pending', icon: Clock },
  { status: 'paid', icon: Check },
  { status: 'processing', icon: Package },
  { status: 'shipped', icon: Truck },
  { status: 'delivered', icon: CheckCircle2 },
];

export function OrderTimeline({ currentStatus, history }: OrderTimelineProps) {
  if (currentStatus === 'cancelled') {
    return (
      <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-2xl p-6 flex items-center gap-4">
        <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center text-red-600 dark:text-red-400">
          <XCircle className="w-6 h-6" />
        </div>
        <div>
          <h4 className="text-red-900 dark:text-red-100 font-semibold">Pedido Cancelado</h4>
          <p className="text-red-700 dark:text-red-400 text-sm">
            Este pedido foi cancelado e não seguirá para as próximas etapas.
          </p>
        </div>
      </div>
    );
  }

  const getStatusDate = (status: OrderStatus) => {
    const entry = history.find((h) => h.new_status === status);
    return entry ? new Date(entry.created_at).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }) : null;
  };

  const currentStepIndex = STEPS.findIndex((s) => s.status === currentStatus);

  return (
    <div className="relative">
      <div className="flex flex-col gap-8">
        {STEPS.map((step, index) => {
          const isCompleted = index <= currentStepIndex;
          const isCurrent = step.status === currentStatus;
          const date = getStatusDate(step.status);
          const Icon = step.icon;

          return (
            <div key={step.status} className="flex gap-4 relative">
              {/* Linha conectora */}
              {index < STEPS.length - 1 && (
                <div 
                  className={cn(
                    "absolute left-6 top-12 bottom-[-2rem] w-0.5 transition-colors duration-500",
                    index < currentStepIndex ? "bg-zinc-900 dark:bg-zinc-100" : "bg-zinc-100 dark:bg-zinc-800"
                  )}
                />
              )}

              {/* Ícone do Step */}
              <div 
                className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300 z-10",
                  isCompleted 
                    ? "bg-zinc-900 dark:bg-zinc-100 border-zinc-900 dark:border-zinc-100 text-white dark:text-zinc-900 shadow-lg shadow-zinc-200 dark:shadow-none" 
                    : "bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 text-zinc-300 dark:text-zinc-700"
                )}
              >
                <Icon className={cn("w-5 h-5", isCurrent && "animate-pulse")} />
              </div>

              {/* Conteúdo do Step */}
              <div className="flex-1 pt-1">
                <div className="flex items-center justify-between mb-1">
                  <h4 className={cn(
                    "font-bold text-sm transition-colors duration-300",
                    isCompleted ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-400 dark:text-zinc-600"
                  )}>
                    {ORDER_STATUS_LABELS[step.status]}
                  </h4>
                  {date && (
                    <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-400 dark:text-zinc-600">
                      {date}
                    </span>
                  )}
                </div>
                <p className={cn(
                  "text-xs transition-colors duration-300",
                  isCompleted ? "text-zinc-500 dark:text-zinc-400" : "text-zinc-300 dark:text-zinc-700"
                )}>
                  {ORDER_STATUS_DESCRIPTIONS[step.status]}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
