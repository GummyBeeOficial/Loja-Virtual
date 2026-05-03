'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { 
  ArrowLeft, 
  Loader2, 
  AlertCircle, 
  Calendar, 
  MapPin, 
  CreditCard, 
  Package,
  Clock,
  CheckCircle2,
  Truck,
  Box,
  CreditCard as PaymentIcon,
  XCircle,
  ShoppingBag,
  ExternalLink,
  Copy,
  Check
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import OrderStatusBadge from '@/components/orders/order-status-badge';
import ProductImage from '@/components/ProductImage';
import { OrderStatus, ORDER_STATUS_LABELS, ORDER_STATUS_DESCRIPTIONS } from '@/lib/order-status';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const PROGRESS_STEPS: OrderStatus[] = ['pending', 'paid', 'processing', 'shipped', 'delivered'];

const STEP_ICONS: Record<OrderStatus, any> = {
  pending: Clock,
  paid: PaymentIcon,
  processing: Box,
  shipped: Truck,
  delivered: CheckCircle2,
  cancelled: XCircle,
};

export default function OrderDetailsPage() {
  const supabase = createClient();
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Estados para Solicitação de Cancelamento
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('Desisti da compra');
  const [cancelDetails, setCancelDetails] = useState('');
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const fetchOrderDetails = React.useCallback(async () => {
    if (!user || !id) return;
    
    setLoading(true);
    setError(null);
    try {
      const { data, error: orderError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            id,
            quantity,
            price_at_time,
            product_id,
            products (name, image_url),
            variant_label,
            size_label,
            product_name_snapshot,
            product_image_snapshot
          )
        `)
        .eq('id', id)
        .eq('user_id', user.id) // Segurança: garante que o pedido pertence ao usuário
        .maybeSingle();

      if (orderError) throw orderError;

      if (!data) {
        setError('Pedido não encontrado ou você não tem permissão para visualizá-lo.');
        return;
      }

      setOrder(data);
    } catch (err: any) {
      console.error('Erro ao buscar detalhes do pedido:', err);
      setError(err.message || 'Erro ao carregar pedido');
    } finally {
      setLoading(false);
    }
  }, [supabase, id, user]);

  const handleRequestCancellation = async () => {
    if (!user || !id) return;
    setIsSubmittingCancel(true);
    try {
      const fullReason = cancelDetails ? `${cancelReason}: ${cancelDetails}` : cancelReason;
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          cancellation_reason: fullReason,
          cancellation_requested_at: new Date().toISOString(),
          cancellation_status: 'requested'
        })
        .eq('id', id)
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      await fetchOrderDetails();
      setIsCancelModalOpen(false);
    } catch (err) {
      console.error('Erro ao solicitar cancelamento:', err);
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login?redirect=/account/orders/' + id);
      } else {
        fetchOrderDetails();
      }
    }
  }, [authLoading, user, id, fetchOrderDetails, router]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
        <Navbar />
        <div className="flex-grow flex flex-col items-center justify-center p-20">
          <Loader2 className="w-10 h-10 animate-spin text-[#13daec] mb-4" />
          <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Carregando detalhes do pedido...</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
        <Navbar />
        <div className="flex-grow flex flex-col items-center justify-center p-20 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mb-4 opacity-20" />
          <p className="text-gray-900 dark:text-white font-bold mb-2">Pedido não encontrado</p>
          <p className="text-gray-500 text-sm max-w-xs">{error || 'O pedido solicitado não existe ou você não tem permissão para vê-lo.'}</p>
          <Link 
            href="/account/orders"
            className="mt-6 px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:opacity-90 transition-all"
          >
            Voltar para Meus Pedidos
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const currentStatusIndex = PROGRESS_STEPS.indexOf(order.status as OrderStatus);
  const isCancelled = order.status === 'cancelled';

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
      <Navbar />
      
      <main className="flex-grow max-w-5xl mx-auto w-full px-6 pt-32 pb-20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Link 
              href="/account/orders"
              className="p-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-500 hover:text-gray-900 dark:hover:text-white transition-all shadow-sm"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter flex items-center gap-3">
                Pedido #{order.id.substring(0, 8).toUpperCase()}
                <OrderStatusBadge status={order.status} className="text-[12px] py-1 px-3" />
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest mt-1">
                Realizado em {new Date(order.created_at).toLocaleString('pt-BR')}
              </p>
            </div>
          </div>
          
          <div className="px-4 py-2 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-0.5">Total do Pedido</p>
            <p className="text-lg font-black text-gray-900 dark:text-white">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.total_amount)}
            </p>
          </div>
        </div>

        {/* Linha do Tempo de Progresso */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-8 mb-8 overflow-hidden">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 relative">
            {!isCancelled ? (
              PROGRESS_STEPS.map((step, index) => {
                const Icon = STEP_ICONS[step];
                const isCompleted = index < currentStatusIndex || order.status === 'delivered';
                const isCurrent = index === currentStatusIndex;

                return (
                  <React.Fragment key={step}>
                    <div className="flex flex-col items-center text-center relative z-10 flex-1">
                      <div className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 border-4",
                        isCompleted ? "bg-emerald-500 border-emerald-100 dark:border-emerald-900/30 text-white" :
                        isCurrent ? "bg-[#13daec] border-cyan-100 dark:border-cyan-900/30 text-white shadow-[0_0_20px_rgba(19,218,236,0.3)]" :
                        "bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-800 text-gray-300"
                      )}>
                        <Icon size={20} className={cn(isCurrent && "animate-pulse")} />
                      </div>
                      <div className="mt-4">
                        <p className={cn(
                          "text-[10px] font-black uppercase tracking-widest mb-1",
                          isCurrent ? "text-[#13daec]" : isCompleted ? "text-emerald-500" : "text-gray-400"
                        )}>
                          {ORDER_STATUS_LABELS[step]}
                        </p>
                        <p className="text-[9px] text-gray-400 font-medium max-w-[120px] leading-tight mx-auto">
                          {ORDER_STATUS_DESCRIPTIONS[step]}
                        </p>
                      </div>
                    </div>
                    {index < PROGRESS_STEPS.length - 1 && (
                      <div className="hidden md:block flex-1 h-0.5 bg-gray-100 dark:bg-gray-800 relative -mt-12">
                        <div 
                          className="absolute inset-0 bg-emerald-500 transition-all duration-1000" 
                          style={{ width: isCompleted ? '100%' : '0%' }}
                        />
                      </div>
                    )}
                  </React.Fragment>
                );
              })
            ) : (
              <div className="w-full flex items-center justify-center py-4">
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-500 border-4 border-red-100 dark:border-red-900/30">
                    <XCircle size={32} />
                  </div>
                  <h3 className="mt-4 text-lg font-black text-gray-900 dark:text-white uppercase tracking-tighter">Pedido Cancelado</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mt-1">
                    Este pedido foi encerrado e não seguirá o fluxo normal de entrega.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Coluna Principal: Itens */}
          <div className="lg:col-span-2 space-y-8">
            {/* Itens do Pedido */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-50 dark:border-gray-800 flex items-center gap-2">
                <Package size={18} className="text-gray-400" />
                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-widest">Itens do Pedido</h3>
              </div>
              <div className="divide-y divide-gray-50 dark:divide-gray-800">
                {order.order_items?.map((item: any) => (
                  <div key={item.id} className="p-6 flex items-center gap-4">
                    <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800 flex-shrink-0 relative">
                      <ProductImage 
                        src={item.product_image_snapshot || item.products?.image_url} 
                        alt={item.product_name_snapshot || item.products?.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{item.product_name_snapshot || item.products?.name}</p>
                      {(item.variant_label || item.size_label) && (
                        <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">
                          {item.variant_label && <span>Cor: {item.variant_label}</span>}
                          {item.variant_label && item.size_label && <span className="mx-1">•</span>}
                          {item.size_label && <span>Tam: {item.size_label}</span>}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-gray-900 dark:text-white">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price_at_time)}
                      </p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">Qtd: {item.quantity}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-6 bg-gray-50/50 dark:bg-gray-800/30 border-t border-gray-50 dark:border-gray-800">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Subtotal</span>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.total_amount)}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Frete</span>
                  <span className="text-xs font-bold text-emerald-500 uppercase tracking-widest">Grátis</span>
                </div>
                <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                  <span className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">Total</span>
                  <span className="text-xl font-black text-gray-900 dark:text-white">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.total_amount)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Coluna Lateral: Info */}
          <div className="space-y-8">
            {/* Pagamento */}
            <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <CreditCard size={14} />
                Pagamento
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Método</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-widest">
                    {order.payment_method === 'credit_card' ? 'Cartão de Crédito' : order.payment_method || 'Não informado'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Status</p>
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      order.status === 'pending' ? "bg-amber-500" : "bg-emerald-500"
                    )} />
                    <span className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-widest">
                      {order.status === 'pending' ? 'Aguardando' : 'Confirmado'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Endereço de Entrega */}
            <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <MapPin size={14} />
                Entrega
              </h3>
              <div className="flex items-start gap-3 text-gray-500 dark:text-gray-400">
                <p className="text-xs font-medium leading-relaxed">
                  {order.shipping_address || 'Endereço não informado'}
                </p>
              </div>
            </div>

            {/* Envio e Rastreio */}
            <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Truck size={14} />
                Envio e Rastreio
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Tipo de Envio</p>
                    <p className="text-xs font-bold text-gray-900 dark:text-white">
                      {order.shipping_type || 'Não informado'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Prazo Estimado</p>
                    <p className="text-xs font-bold text-gray-900 dark:text-white">
                      {order.estimated_delivery || 'Não informado'}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Transportadora</p>
                  <p className="text-xs font-bold text-gray-900 dark:text-white">
                    {order.carrier || 'Não informado'}
                  </p>
                </div>

                {order.tracking_code && (
                  <div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Código de Rastreio</p>
                    <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 p-2 rounded-lg border border-gray-100 dark:border-gray-800">
                      <code className="text-xs font-mono text-gray-600 dark:text-gray-300 flex-1 truncate">
                        {order.tracking_code}
                      </code>
                      <button 
                        onClick={() => handleCopy(order.tracking_code)}
                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors text-gray-400"
                        title="Copiar código"
                      >
                        {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>
                )}

                {order.tracking_url && (
                  <a 
                    href={order.tracking_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-3 bg-[#13daec] text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:opacity-90 transition-all shadow-sm"
                  >
                    <ExternalLink size={14} />
                    Acompanhar Pedido
                  </a>
                )}
              </div>
            </div>

            {/* Ajuda */}
            <div className="bg-zinc-900 dark:bg-zinc-100 p-6 rounded-2xl shadow-xl text-white dark:text-zinc-900">
              <h3 className="text-sm font-black uppercase tracking-tighter mb-2">Precisa de ajuda?</h3>
              <p className="text-xs opacity-70 font-medium mb-4 leading-relaxed">
                Se você tiver qualquer dúvida sobre o seu pedido, entre em contato com nosso suporte.
              </p>
              
              <div className="space-y-3">
                <Link 
                  href="/contact"
                  className="block w-full py-3 bg-white/10 dark:bg-black/5 border border-white/20 dark:border-black/10 rounded-xl text-center text-[10px] font-bold uppercase tracking-widest hover:bg-white/20 dark:hover:bg-black/10 transition-all"
                >
                  Falar com Suporte
                </Link>

                {/* Lógica de Solicitação de Cancelamento */}
                {!isCancelled && (
                  <>
                    {order.cancellation_status === 'requested' ? (
                      <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                        <p className="text-[9px] font-bold text-amber-500 uppercase tracking-tight leading-tight text-center">
                          Sua solicitação de cancelamento já foi enviada e está em análise.
                        </p>
                      </div>
                    ) : ['pending', 'paid', 'processing'].includes(order.status) ? (
                      <button 
                        onClick={() => setIsCancelModalOpen(true)}
                        className="w-full py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-center text-[10px] font-bold uppercase tracking-widest text-red-500 hover:bg-red-500/20 transition-all"
                      >
                        Solicitar Cancelamento
                      </button>
                    ) : ['shipped', 'delivered'].includes(order.status) ? (
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tight leading-tight text-center">
                        Este pedido já foi enviado e não pode mais ser cancelado online.
                      </p>
                    ) : null}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
        {/* Modal de Solicitação de Cancelamento */}
        {isCancelModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-3xl p-8 shadow-2xl animate-in zoom-in-95 duration-300 border border-gray-100 dark:border-gray-800">
              <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter mb-2 uppercase">Solicitar Cancelamento</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest mb-8">Conte-nos o motivo da sua solicitação</p>
              
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 block">Motivo Principal</label>
                  <select 
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  >
                    <option value="Desisti da compra">Desisti da compra</option>
                    <option value="Endereço preenchido errado">Endereço preenchido errado</option>
                    <option value="Encontrei outro produto">Encontrei outro produto</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 block">Detalhes Adicionais (Opcional)</label>
                  <textarea 
                    value={cancelDetails}
                    onChange={(e) => setCancelDetails(e.target.value)}
                    placeholder="Explique melhor se desejar..."
                    className="w-full min-h-[100px] bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3 text-sm font-medium text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                  />
                </div>

                <div className="flex flex-col gap-3 pt-4">
                  <button 
                    onClick={handleRequestCancellation}
                    disabled={isSubmittingCancel}
                    className="w-full py-4 bg-red-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:opacity-90 transition-all shadow-lg shadow-red-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSubmittingCancel ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Confirmar Solicitação"
                    )}
                  </button>
                  <button 
                    onClick={() => setIsCancelModalOpen(false)}
                    disabled={isSubmittingCancel}
                    className="w-full py-4 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
                  >
                    Voltar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
