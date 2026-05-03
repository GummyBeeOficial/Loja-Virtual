'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import ProductImage from '@/components/ProductImage';
import { 
  ShoppingBag, 
  Loader2, 
  AlertCircle, 
  ChevronRight, 
  Package, 
  Calendar, 
  CreditCard,
  ArrowLeft
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import OrderStatusBadge from '@/components/orders/order-status-badge';
import { OrderStatus } from '@/lib/order-status';

interface Order {
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
}

export default function MyOrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const fetchOrders = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('orders')
        .select(`
          id,
          status,
          total_amount,
          created_at,
          payment_method,
          order_items (
            id,
            product_name_snapshot,
            product_image_snapshot,
            quantity
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setOrders(data as any || []);
    } catch (err: any) {
      console.error('Erro ao buscar pedidos:', err);
      setError(err.message || 'Não foi possível carregar seus pedidos.');
    } finally {
      setLoading(false);
    }
  }, [user, supabase]);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login?redirect=/account/orders');
      } else {
        fetchOrders();
      }
    }
  }, [user, authLoading, fetchOrders, router]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
        <Navbar />
        <div className="flex-grow flex flex-col items-center justify-center p-20">
          <Loader2 className="w-10 h-10 animate-spin text-[#13daec] mb-4" />
          <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Carregando seus pedidos...</p>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
      <Navbar />
      
      <main className="flex-grow max-w-5xl mx-auto w-full px-6 pt-32 pb-20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-12">
          <div className="flex items-center gap-4">
            <Link 
              href="/profile"
              className="p-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-500 hover:text-gray-900 dark:hover:text-white transition-all shadow-sm"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter flex items-center gap-3">
                Meus Pedidos
                <div className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded-md text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  {orders.length} {orders.length === 1 ? 'Pedido' : 'Pedidos'}
                </div>
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest mt-1">
                Acompanhe o status e histórico de suas compras
              </p>
            </div>
          </div>
        </div>

        {error ? (
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-12 text-center border border-gray-100 dark:border-gray-800 shadow-sm">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4 opacity-20" />
            <p className="text-gray-900 dark:text-white font-bold mb-2">Ops! Algo deu errado</p>
            <p className="text-gray-500 text-sm mb-6">{error}</p>
            <button 
              onClick={() => fetchOrders()}
              className="px-6 py-3 bg-[#13daec] text-white rounded-xl font-bold uppercase tracking-widest text-[10px] hover:opacity-90 transition-all"
            >
              Tentar Novamente
            </button>
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-16 text-center border border-gray-100 dark:border-gray-800 shadow-sm">
            <div className="w-20 h-20 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center text-gray-300 dark:text-gray-700 mx-auto mb-6">
              <ShoppingBag size={40} />
            </div>
            <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter mb-2">Você ainda não tem pedidos</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium max-w-xs mx-auto mb-8 leading-relaxed">
              Que tal dar uma olhada em nossas novidades e encontrar algo especial para você?
            </p>
            <Link 
              href="/"
              className="inline-block px-10 py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full font-bold uppercase tracking-widest text-xs hover:opacity-90 transition-all shadow-xl shadow-gray-200 dark:shadow-none"
            >
              Começar a Comprar
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <Link
                key={order.id}
                href={`/account/orders/${order.id}`}
                className="group block bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 transition-all duration-300 hover:shadow-xl hover:shadow-gray-200/50 dark:hover:shadow-none hover:border-[#13daec] relative overflow-hidden"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-gray-50 dark:bg-gray-800 rounded-2xl flex items-center justify-center text-gray-400 group-hover:bg-[#13daec]/10 group-hover:text-[#13daec] transition-colors duration-300">
                      <Package size={28} />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1.5">
                        <span className="text-lg font-black text-gray-900 dark:text-white tracking-tighter">
                          Pedido #{order.id.slice(0, 8).toUpperCase()}
                        </span>
                        <OrderStatusBadge status={order.status} className="text-[10px] py-0.5 px-2" />
                      </div>
                      <div className="flex items-center gap-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(order.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                        <span className="w-1 h-1 bg-gray-200 rounded-full"></span>
                        <span className="flex items-center gap-1.5">
                          <CreditCard className="w-3.5 h-3.5" />
                          {order.payment_method === 'credit_card' ? 'Cartão' : order.payment_method?.toUpperCase() || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-8 pt-4 md:pt-0 border-t md:border-t-0 border-gray-50 dark:border-gray-800">
                    <div className="text-right">
                      <p className="text-xl font-black text-gray-900 dark:text-white tracking-tighter">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.total_amount)}
                      </p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                        {order.order_items.reduce((acc, item) => acc + item.quantity, 0)} {order.order_items.reduce((acc, item) => acc + item.quantity, 0) === 1 ? 'item' : 'itens'}
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-300 group-hover:bg-[#13daec] group-hover:text-white transition-all duration-300">
                      <ChevronRight size={20} />
                    </div>
                  </div>
                </div>

                {/* Preview dos itens (Imagens) */}
                <div className="mt-6 pt-6 border-t border-gray-50 dark:border-gray-800 flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                  {order.order_items.map((item) => (
                    <div
                      key={item.id}
                      className="relative flex-shrink-0 w-12 h-12 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-800 overflow-hidden"
                    >
                      {item.product_image_snapshot && (
                        <ProductImage
                          src={item.product_image_snapshot}
                          alt={item.product_name_snapshot}
                          fill
                          className="object-cover"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
