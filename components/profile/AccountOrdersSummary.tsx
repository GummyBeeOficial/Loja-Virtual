'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Package, Loader2, ChevronRight, ShoppingBag, Calendar, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export function AccountOrdersSummary({ userId }: { userId: string }) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    async function fetchOrders() {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(3);

        if (error) throw error;
        setOrders(data || []);
      } catch (err) {
        console.error('Error fetching user orders:', err);
      } finally {
        setLoading(false);
      }
    }

    if (userId) {
      fetchOrders();
    }
  }, [userId, supabase]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-[#13daec]" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="py-12 text-center bg-zinc-50 dark:bg-zinc-800/30 rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800">
        <div className="w-16 h-16 bg-white dark:bg-zinc-800 rounded-full flex items-center justify-center text-zinc-200 dark:text-zinc-700 mx-auto mb-4 shadow-sm">
          <ShoppingBag size={32} />
        </div>
        <p className="text-zinc-900 dark:text-white text-lg font-black mb-1">Nenhum pedido ainda</p>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium mb-6">Suas compras aparecerão aqui assim que você realizar seu primeiro pedido.</p>
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-[#13daec] font-black text-xs uppercase tracking-widest hover:underline"
        >
          Começar a Comprar
          <ChevronRight size={14} />
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest">Últimos Pedidos</h3>
        <Link 
          href="/account/orders" 
          className="text-xs font-black text-[#13daec] uppercase tracking-widest hover:underline flex items-center gap-1"
        >
          Ver Todos
          <ChevronRight size={14} />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {orders.map((order) => (
          <Link 
            key={order.id}
            href={`/account/orders/${order.id}`}
            className="group flex items-center justify-between p-5 bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-2xl hover:border-[#13daec] transition-all hover:shadow-lg hover:shadow-[#13daec]/5"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-zinc-50 dark:bg-zinc-700 rounded-xl flex items-center justify-center text-zinc-400 group-hover:bg-[#13daec]/10 group-hover:text-[#13daec] transition-colors">
                <Package size={24} />
              </div>
              <div>
                <p className="text-sm font-black text-zinc-900 dark:text-white mb-1 uppercase tracking-tight">Pedido #{order.id.substring(0, 8)}</p>
                <div className="flex items-center gap-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                  <span className="flex items-center gap-1">
                    <Calendar size={12} />
                    {format(new Date(order.created_at), 'dd MMM yyyy', { locale: ptBR })}
                  </span>
                  <span className="w-1 h-1 bg-zinc-200 rounded-full"></span>
                  <span className={cn(
                    "px-2 py-0.5 rounded-md",
                    order.status === 'delivered' ? "bg-green-50 text-green-600" : 
                    order.status === 'cancelled' ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"
                  )}>
                    {order.status}
                  </span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-base font-black text-zinc-900 dark:text-white tracking-tighter">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.total_amount)}
              </p>
              <div className="flex items-center justify-end gap-1 text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                Detalhes
                <ChevronRight size={12} />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
