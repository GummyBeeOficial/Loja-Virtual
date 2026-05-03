'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { 
  ArrowLeft, 
  Loader2, 
  AlertCircle, 
  User, 
  Mail, 
  MapPin, 
  CreditCard, 
  Package,
  History,
  Clock,
  CheckCircle2,
  Truck,
  Box,
  CreditCard as PaymentIcon,
  CircleDot,
  XCircle,
  ExternalLink,
  FileText
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import OrderStatusBadge from '@/components/orders/order-status-badge';
import OrderStatusSelect from '@/components/admin/order-status-select';
import ProductImage from '@/components/ProductImage';
import { OrderStatus, ORDER_STATUS_LABELS, ORDER_STATUS_DESCRIPTIONS } from '@/lib/order-status';
import { useToast } from '@/context/ToastContext';

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
  const { isStaff, loading: authLoading } = useAuth();
  const { addToast } = useToast();
  const [order, setOrder] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trackingInfo, setTrackingInfo] = useState({
    carrier: '',
    tracking_code: '',
    tracking_url: ''
  });
  const [savingTracking, setSavingTracking] = useState(false);
  const [internalNotes, setInternalNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [shippingInfo, setShippingInfo] = useState({
    shipping_type: '',
    estimated_delivery: '',
    shipping_notes: ''
  });
  const [savingShipping, setSavingShipping] = useState(false);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  useEffect(() => {
    if (order) {
      setTrackingInfo({
        carrier: order.carrier || '',
        tracking_code: order.tracking_code || '',
        tracking_url: order.tracking_url || ''
      });
      setInternalNotes(order.internal_notes || '');
      setShippingInfo({
        shipping_type: order.shipping_type || '',
        estimated_delivery: order.estimated_delivery || '',
        shipping_notes: order.shipping_notes || ''
      });
    }
  }, [order]);

  const handleSaveTracking = async () => {
    setSavingTracking(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          carrier: trackingInfo.carrier,
          tracking_code: trackingInfo.tracking_code,
          tracking_url: trackingInfo.tracking_url,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      
      // Atualizar estado local
      setOrder({ ...order, ...trackingInfo });
      addToast('success', 'Informações de rastreio atualizadas com sucesso!');
    } catch (err: any) {
      console.error('Erro ao salvar rastreio:', err);
      addToast('error', 'Erro ao salvar informações de rastreio: ' + err.message);
    } finally {
      setSavingTracking(false);
    }
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          internal_notes: internalNotes,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      
      setOrder({ ...order, internal_notes: internalNotes });
      addToast('success', 'Notas internas atualizadas com sucesso!');
    } catch (err: any) {
      console.error('Erro ao salvar notas:', err);
      addToast('error', 'Erro ao salvar notas internas: ' + err.message);
    } finally {
      setSavingNotes(false);
    }
  };

  const handleSaveShipping = async () => {
    setSavingShipping(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          shipping_type: shippingInfo.shipping_type,
          estimated_delivery: shippingInfo.estimated_delivery,
          shipping_notes: shippingInfo.shipping_notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      
      setOrder({ ...order, ...shippingInfo });
      addToast('success', 'Dados de logística atualizados com sucesso!');
    } catch (err: any) {
      console.error('Erro ao salvar logística:', err);
      addToast('error', 'Erro ao salvar dados de logística: ' + err.message);
    } finally {
      setSavingShipping(false);
    }
  };

  const handleApproveCancellation = async () => {
    if (!id) return;
    setIsProcessingAction(true);
    try {
      // 1. Chamar RPC existente para cancelar (garante estoque e histórico)
      const { error: rpcError } = await supabase.rpc('update_order_status', {
        p_order_id: id,
        p_new_status: 'cancelled'
      });

      if (rpcError) throw rpcError;

      // 2. Atualizar cancellation_status para 'approved'
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          cancellation_status: 'approved',
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (updateError) throw updateError;

      addToast('success', 'Solicitação de cancelamento aprovada com sucesso!');
      fetchOrderDetails();
    } catch (err: any) {
      console.error('Erro ao aprovar cancelamento:', err);
      addToast('error', 'Erro ao aprovar cancelamento: ' + err.message);
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleRejectCancellation = async () => {
    if (!id) return;
    setIsProcessingAction(true);
    try {
      // Apenas atualiza o status da solicitação para 'rejected'
      const { error } = await supabase
        .from('orders')
        .update({
          cancellation_status: 'rejected',
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      addToast('success', 'Solicitação de cancelamento recusada.');
      fetchOrderDetails();
    } catch (err: any) {
      console.error('Erro ao recusar cancelamento:', err);
      addToast('error', 'Erro ao recusar cancelamento: ' + err.message);
    } finally {
      setIsProcessingAction(false);
    }
  };

  const fetchOrderDetails = React.useCallback(async () => {
    if (!isStaff) return;
    
    setLoading(true);
    setError(null);
    try {
      // 1. Buscar detalhes do pedido (sem join com profiles)
      const { data: orderData, error: orderError } = await supabase
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
        .maybeSingle();

      if (orderError) {
        console.error('Erro detalhado Supabase (Pedido):', orderError);
        const errorMsg = orderError.message || 'Erro desconhecido';
        const errorDetails = orderError.details ? ` (${orderError.details})` : '';
        throw new Error(`${errorMsg}${errorDetails}`);
      }

      // 2. Buscar profile separadamente
      if (orderData?.user_id) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('email, full_name')
          .eq('id', orderData.user_id)
          .maybeSingle();

        if (profileError) {
          console.error('Erro ao buscar profile:', profileError);
        }
        
        // Merge profile data
        orderData.profiles = profileData || { full_name: 'Cliente s/ nome', email: 'Sem e-mail' };
      } else {
        orderData.profiles = { full_name: 'Cliente s/ nome', email: 'Sem e-mail' };
      }

      setOrder(orderData);

      // 3. Buscar histórico de status
      const { data: historyData, error: historyError } = await supabase
        .from('order_status_history')
        .select('*')
        .eq('order_id', id)
        .order('created_at', { ascending: false });

      if (historyError) {
        console.error('Erro detalhado Supabase (Histórico):', historyError);
        const errorMsg = historyError.message || 'Erro desconhecido';
        const errorDetails = historyError.details ? ` (${historyError.details})` : '';
        throw new Error(`${errorMsg}${errorDetails}`);
      }
      setHistory(historyData || []);

    } catch (err: any) {
      console.error('Erro ao buscar detalhes do pedido:', err);
      setError(err.message || 'Erro ao carregar pedido');
      addToast('error', 'Erro ao carregar detalhes do pedido');
    } finally {
      setLoading(false);
    }
  }, [supabase, id, isStaff, addToast]);

  useEffect(() => {
    if (isStaff && id) {
      fetchOrderDetails();
    }
  }, [isStaff, id, fetchOrderDetails]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!isStaff) return null;

  if (loading) {
    return (
      <div className="p-20 flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
        <p className="text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest text-xs">Carregando detalhes do pedido...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="p-20 flex flex-col items-center justify-center text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4 opacity-20" />
        <p className="text-gray-900 dark:text-white font-bold mb-2">Pedido não encontrado</p>
        <p className="text-gray-500 text-sm max-w-xs">{error || 'O pedido solicitado não existe ou você não tem permissão para vê-lo.'}</p>
        <Link 
          href="/admin/orders"
          className="mt-6 px-6 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-bold uppercase tracking-widest text-[10px]"
        >
          Voltar para Lista
        </Link>
      </div>
    );
  }

  const currentStatusIndex = PROGRESS_STEPS.indexOf(order.status as OrderStatus);
  const isCancelled = order.status === 'cancelled';

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link 
            href="/admin/orders"
            className="p-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all shadow-sm"
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
        
        <div className="flex items-center gap-2">
          <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest mb-0.5">Total do Pedido</p>
            <p className="text-lg font-black text-gray-900 dark:text-white">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.total_amount)}
            </p>
          </div>
        </div>
      </div>

      {/* Banner de Solicitação de Cancelamento */}
      {order.cancellation_status === 'requested' && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-amber-100 dark:bg-amber-900/40 rounded-xl text-amber-600 dark:text-amber-400">
              <AlertCircle size={24} />
            </div>
            <div>
              <h3 className="text-lg font-black text-amber-900 dark:text-amber-400 uppercase tracking-tighter">Solicitação de Cancelamento</h3>
              <p className="text-sm text-amber-700 dark:text-amber-500 font-medium mt-1">O cliente solicitou o cancelamento deste pedido.</p>
              <div className="mt-3 p-3 bg-white/50 dark:bg-black/20 rounded-lg border border-amber-200/50 dark:border-amber-800/50">
                <p className="text-[10px] font-black text-amber-800 dark:text-amber-600 uppercase tracking-widest mb-1">Motivo enviado:</p>
                <p className="text-sm text-amber-900 dark:text-amber-300 font-bold italic">&quot;{order.cancellation_reason}&quot;</p>
                <p className="text-[9px] text-amber-600 dark:text-amber-500 font-bold uppercase mt-2">
                  Solicitado em: {new Date(order.cancellation_requested_at).toLocaleString('pt-BR')}
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <button 
              onClick={handleApproveCancellation}
              disabled={isProcessingAction}
              className="px-6 py-3 bg-red-500 text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-red-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-red-500/20"
            >
              {isProcessingAction ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              Aprovar Cancelamento
            </button>
            <button 
              onClick={handleRejectCancellation}
              disabled={isProcessingAction}
              className="px-6 py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-gray-50 dark:hover:bg-gray-700 transition-all disabled:opacity-50"
            >
              Recusar Solicitação
            </button>
          </div>
        </div>
      )}

      {/* Linha do Tempo de Progresso */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-8 overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 relative">
          {!isCancelled ? (
            PROGRESS_STEPS.map((step, index) => {
              const Icon = STEP_ICONS[step];
              const isCompleted = index < currentStatusIndex || order.status === 'delivered';
              const isCurrent = index === currentStatusIndex;
              const isPending = index > currentStatusIndex && order.status !== 'delivered';

              return (
                <React.Fragment key={step}>
                  <div className="flex flex-col items-center text-center relative z-10 flex-1">
                    <div className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 border-4",
                      isCompleted ? "bg-emerald-500 border-emerald-100 dark:border-emerald-900/30 text-white" :
                      isCurrent ? "bg-primary border-cyan-100 dark:border-cyan-900/30 text-white shadow-[0_0_20px_rgba(19,218,236,0.3)]" :
                      "bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-800 text-gray-300 dark:text-gray-600"
                    )}>
                      <Icon size={20} className={cn(isCurrent && "animate-pulse")} />
                    </div>
                    <div className="mt-4">
                      <p className={cn(
                        "text-[10px] font-black uppercase tracking-widest mb-1",
                        isCurrent ? "text-primary" : isCompleted ? "text-emerald-500" : "text-gray-400 dark:text-gray-500"
                      )}>
                        {ORDER_STATUS_LABELS[step]}
                      </p>
                      <p className="text-[9px] text-gray-400 dark:text-gray-500 font-medium max-w-[120px] leading-tight">
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
        {/* Coluna Principal: Itens e Histórico */}
        <div className="lg:col-span-2 space-y-8">
          {/* Seção de Rastreamento */}
          {(order.status === 'shipped' || order.status === 'delivered') && (
            <div className={cn(
              "rounded-2xl shadow-lg p-8 text-white overflow-hidden relative group transition-all duration-500",
              order.status === 'delivered' 
                ? "bg-gradient-to-r from-emerald-500 to-teal-600" 
                : "bg-gradient-to-r from-indigo-500 to-purple-600"
            )}>
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                <Truck size={120} />
              </div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                      <Truck size={24} />
                    </div>
                    <h3 className="text-lg font-black uppercase tracking-tighter">
                      {order.status === 'delivered' ? 'Pedido Entregue' : 'Rastreamento do Pedido'}
                    </h3>
                  </div>
                  {order.status === 'shipped' && (
                    <button 
                      onClick={handleSaveTracking}
                      disabled={savingTracking}
                      className="px-4 py-2 bg-white text-indigo-600 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-indigo-50 transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                      {savingTracking ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                      Salvar Rastreio
                    </button>
                  )}
                </div>

                {order.status === 'shipped' ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest opacity-70">Transportadora</label>
                      <input 
                        type="text"
                        value={trackingInfo.carrier}
                        onChange={(e) => setTrackingInfo({...trackingInfo, carrier: e.target.value})}
                        placeholder="Ex: Correios, Loggi..."
                        className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-sm font-bold placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/30 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest opacity-70">Código de Rastreio</label>
                      <input 
                        type="text"
                        value={trackingInfo.tracking_code}
                        onChange={(e) => setTrackingInfo({...trackingInfo, tracking_code: e.target.value})}
                        placeholder="Ex: AA123456789BR"
                        className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-sm font-bold placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/30 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest opacity-70">Link de Rastreio</label>
                      <input 
                        type="text"
                        value={trackingInfo.tracking_url}
                        onChange={(e) => setTrackingInfo({...trackingInfo, tracking_url: e.target.value})}
                        placeholder="https://..."
                        className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-sm font-bold placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/30 transition-all"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">Transportadora</p>
                      <p className="text-sm font-bold">{order.carrier || 'Não informada'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">Código de Rastreio</p>
                      <p className="text-sm font-bold">{order.tracking_code || 'Não informado'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">Link de Rastreio</p>
                      {order.tracking_url ? (
                        <a 
                          href={order.tracking_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm font-bold underline flex items-center gap-1 hover:text-emerald-100 transition-colors"
                        >
                          Acompanhar Entrega <ExternalLink size={12} />
                        </a>
                      ) : (
                        <p className="text-sm font-bold">Não informado</p>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="mt-8 pt-6 border-t border-white/10 flex flex-wrap gap-6">
                  {order.shipped_at && (
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="opacity-70" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">
                        Enviado em: {new Date(order.shipped_at).toLocaleString('pt-BR')}
                      </span>
                    </div>
                  )}
                  {order.delivered_at && (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={14} className="opacity-70" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">
                        Entregue em: {new Date(order.delivered_at).toLocaleString('pt-BR')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          {/* Logística e Envio */}
          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
            <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4">Logística e Envio</h3>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5 block">Tipo de Envio</label>
                <input 
                  type="text"
                  value={shippingInfo.shipping_type}
                  onChange={(e) => setShippingInfo({...shippingInfo, shipping_type: e.target.value})}
                  placeholder="Ex: Sedex, PAC, Transportadora..."
                  className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-2 text-sm font-medium text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5 block">Valor do Frete</label>
                <div className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-2 text-sm font-bold text-gray-900 dark:text-white">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.shipping_cost || 0)}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5 block">Prazo Estimado</label>
                <input 
                  type="text"
                  value={shippingInfo.estimated_delivery}
                  onChange={(e) => setShippingInfo({...shippingInfo, estimated_delivery: e.target.value})}
                  placeholder="Ex: 5-7 dias úteis"
                  className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-2 text-sm font-medium text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5 block">Observação de Envio</label>
                <textarea
                  value={shippingInfo.shipping_notes}
                  onChange={(e) => setShippingInfo({...shippingInfo, shipping_notes: e.target.value})}
                  placeholder="Instruções para o despacho..."
                  className="w-full min-h-[80px] bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3 text-sm font-medium text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                />
              </div>
              <button
                onClick={handleSaveShipping}
                disabled={savingShipping}
                className="w-full py-3 bg-primary text-white rounded-xl font-bold uppercase tracking-widest text-[10px] hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm"
              >
                {savingShipping ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Truck size={14} />
                )}
                Salvar Dados de Envio
              </button>
            </div>
          </div>

          {/* Itens do Pedido */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-50 dark:border-gray-800 flex items-center gap-2">
              <Package size={18} className="text-gray-400 dark:text-gray-500" />
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
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase mt-1">
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
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase">Qtd: {item.quantity}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-6 bg-gray-50/50 dark:bg-gray-800/30 border-t border-gray-50 dark:border-gray-800 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Subtotal Estimado</span>
                <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.total_amount - (order.shipping_cost || 0))}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Frete</span>
                <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.shipping_cost || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-gray-800">
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Total do Pedido</span>
                <span className="text-xl font-black text-gray-900 dark:text-white">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.total_amount)}
                </span>
              </div>
            </div>
          </div>

          {/* Histórico de Status */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-50 dark:border-gray-800 flex items-center gap-2">
              <History size={18} className="text-gray-400 dark:text-gray-500" />
              <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-widest">Histórico de Status</h3>
            </div>
            <div className="p-6">
              <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-100 dark:before:via-gray-800 before:to-transparent">
                {history.map((item, index) => (
                  <div key={item.id} className="relative flex items-start gap-6 group">
                    <div className={cn(
                      "absolute left-0 w-10 h-10 rounded-full border-4 border-white dark:border-gray-900 flex items-center justify-center z-10 transition-colors",
                      index === 0 ? "bg-primary text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500"
                    )}>
                      <Clock size={16} />
                    </div>
                    <div className="ml-12 pt-1">
                      <div className="flex items-center gap-3 mb-1">
                        <OrderStatusBadge status={item.new_status} />
                        <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase">
                          {new Date(item.created_at).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                        Status alterado para <span className="font-bold text-gray-700 dark:text-gray-300">{ORDER_STATUS_LABELS[item.new_status as OrderStatus]}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Coluna Lateral: Cliente, Entrega e Ações */}
        <div className="space-y-8">
          {/* Card de Status e Ações */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
            <div className="p-6 border-b border-gray-50 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-800/20">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Status do Pedido</h3>
                <CircleDot size={14} className={cn(
                  "animate-pulse",
                  order.status === 'delivered' ? "text-emerald-500" : 
                  order.status === 'cancelled' ? "text-red-500" : "text-primary"
                )} />
              </div>
              <div className="flex items-center gap-3">
                <OrderStatusBadge status={order.status} className="text-[11px] py-1 px-3" />
              </div>
              <p className="mt-3 text-[11px] text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
                {ORDER_STATUS_DESCRIPTIONS[order.status as OrderStatus]}
              </p>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 block">Alterar Status</label>
                <OrderStatusSelect 
                  orderId={order.id} 
                  currentStatus={order.status}
                  onUpdate={() => fetchOrderDetails()}
                  className="w-full"
                />
              </div>
              
              <div className="pt-4 border-t border-gray-50 dark:border-gray-800 flex items-center gap-2 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                <Clock size={12} />
                <span>Última atualização: {new Date(order.updated_at || order.created_at).toLocaleDateString('pt-BR')}</span>
              </div>
            </div>
          </div>

          {/* Dados do Cliente */}
          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
            <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4">Cliente</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-400 dark:text-gray-500">
                  <User size={20} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{order.profiles?.full_name || 'Cliente s/ nome'}</p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase truncate">{order.user_id.substring(0, 8)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
                <Mail size={16} />
                <span className="text-xs font-medium truncate">{order.profiles?.email}</span>
              </div>
            </div>
          </div>

          {/* Endereço de Entrega */}
          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
            <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4">Entrega</h3>
            <div className="flex items-start gap-3 text-gray-500 dark:text-gray-400">
              <MapPin size={16} className="mt-0.5 shrink-0" />
              <p className="text-xs font-medium leading-relaxed">
                {order.shipping_address || 'Endereço não informado'}
              </p>
            </div>
          </div>

          {/* Pagamento */}
          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
            <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4">Pagamento</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
                <CreditCard size={16} />
                <span className="text-xs font-medium uppercase tracking-widest">
                  {order.payment_method === 'credit_card' ? 'Cartão de Crédito' : order.payment_method || 'Não informado'}
                </span>
              </div>
              <div className="pt-4 border-t border-gray-50 dark:border-gray-800 space-y-2">
                {order.paid_at && (
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                    <span className="text-gray-400 dark:text-gray-500">Pago em:</span>
                    <span className="text-gray-900 dark:text-white">{new Date(order.paid_at).toLocaleDateString('pt-BR')}</span>
                  </div>
                )}
                {order.shipped_at && (
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                    <span className="text-gray-400 dark:text-gray-500">Enviado em:</span>
                    <span className="text-gray-900 dark:text-white">{new Date(order.shipped_at).toLocaleDateString('pt-BR')}</span>
                  </div>
                )}
                {order.delivered_at && (
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                    <span className="text-gray-400 dark:text-gray-500">Entregue em:</span>
                    <span className="text-gray-900 dark:text-white">{new Date(order.delivered_at).toLocaleDateString('pt-BR')}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Notas Internas */}
          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
            <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4">Notas Internas</h3>
            <div className="space-y-4">
              <textarea
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                placeholder="Adicione observações internas sobre este pedido..."
                className="w-full min-h-[100px] bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3 text-sm font-medium text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
              />
              <button
                onClick={handleSaveNotes}
                disabled={savingNotes}
                className="w-full py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm"
              >
                {savingNotes ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <FileText size={14} />
                )}
                Salvar Nota
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
