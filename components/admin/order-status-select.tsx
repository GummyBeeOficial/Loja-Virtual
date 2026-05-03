'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { 
  OrderStatus, 
  ORDER_STATUS_LABELS, 
  ORDER_STATUS_TRANSITIONS,
  getFriendlyOrderStatusError 
} from '@/lib/order-status';
import { Loader2, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/context/ToastContext';

interface OrderStatusSelectProps {
  orderId: string;
  currentStatus: OrderStatus;
  onUpdate?: (newStatus: OrderStatus) => void;
  className?: string;
}

export default function OrderStatusSelect({ 
  orderId, 
  currentStatus, 
  onUpdate,
  className 
}: OrderStatusSelectProps) {
  const supabase = createClient();
  const { addToast } = useToast();
  const [status, setStatus] = useState<OrderStatus>(currentStatus);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sincronizar estado interno com a prop currentStatus
  useEffect(() => {
    setStatus(currentStatus);
    setError(null);
    setSuccess(false);
  }, [currentStatus]);

  // Determinar opções válidas
  const validNextStatuses = ORDER_STATUS_TRANSITIONS[status] || [];
  const isFinalStatus = validNextStatuses.length === 0;

  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value as OrderStatus;
    
    // Se for o mesmo status, não faz nada
    if (newStatus === status) return;

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Chamar RPC update_order_status
      const { error: rpcError } = await supabase.rpc('update_order_status', {
        p_order_id: orderId,
        p_new_status: newStatus
      });

      if (rpcError) {
        // Preservar o objeto original do erro do Supabase
        throw rpcError;
      }

      setStatus(newStatus);
      setSuccess(true);
      addToast('success', 'Status do pedido atualizado com sucesso!');
      if (onUpdate) onUpdate(newStatus);
      
      // Limpar feedback de sucesso após 3 segundos
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      // Log completo para debug real
      console.error('[OrderStatusSelect] Erro na transição:', {
        message: err.message,
        details: err.details,
        hint: err.hint,
        code: err.code,
        currentStatus: status,
        targetStatus: newStatus
      });
      
      const friendlyError = getFriendlyOrderStatusError(err, status, newStatus);
      setError(friendlyError);
      addToast('error', friendlyError);
      
      // O select voltará ao valor de 'status' automaticamente pois é um componente controlado
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="relative">
        <select
          value={status}
          onChange={handleStatusChange}
          disabled={loading || isFinalStatus}
          className={cn(
            "w-full pl-3 pr-10 py-2.5 text-[10px] font-black uppercase tracking-widest bg-white dark:bg-gray-900 border rounded-xl appearance-none focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed",
            error ? "border-red-500 text-red-600 dark:text-red-400" : "border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white",
            isFinalStatus && "bg-gray-50 dark:bg-gray-800/50"
          )}
        >
          {/* Sempre mostrar o status atual */}
          <option value={status} className="text-gray-900 dark:text-white bg-white dark:bg-gray-900">
            {ORDER_STATUS_LABELS[status]} (Atual)
          </option>
          
          {/* Mostrar apenas transições permitidas */}
          {validNextStatuses.map((nextStatus) => (
            <option key={nextStatus} value={nextStatus} className="text-gray-900 dark:text-white bg-white dark:bg-gray-900">
              Alterar para: {ORDER_STATUS_LABELS[nextStatus]}
            </option>
          ))}
        </select>
        
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          {loading ? (
            <Loader2 size={14} className="animate-spin text-gray-400 dark:text-gray-500" />
          ) : success ? (
            <Check size={14} className="text-emerald-500" />
          ) : error ? (
            <AlertCircle size={14} className="text-red-500" />
          ) : !isFinalStatus ? (
            <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-gray-400 dark:border-t-gray-500" />
          ) : null}
        </div>
      </div>
      
      {error && (
        <p className="text-[9px] font-bold text-red-500 uppercase tracking-tight leading-tight animate-in slide-in-from-top-1 duration-300">
          {error}
        </p>
      )}

      {isFinalStatus && !error && (
        <p className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-tight leading-tight">
          Status finalizado. Não permite alterações.
        </p>
      )}
    </div>
  );
}
