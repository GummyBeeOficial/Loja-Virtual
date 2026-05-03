'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Plus, Search, Filter, Edit2, Trash2, Loader2, Tag, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

export default function CouponsPage() {
  const { role, isStaff, loading: authLoading } = useAuth();
  const { addToast } = useToast();
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [couponToDelete, setCouponToDelete] = useState<{ id: string; code: string } | null>(null);

  const fetchCoupons = useCallback(async () => {
    if (!isStaff || (role !== 'admin' && role !== 'super_admin')) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setCoupons(data || []);
    } catch (err) {
      console.error('Error fetching coupons:', err);
      addToast('error', 'Erro ao carregar cupons.');
    } finally {
      setLoading(false);
    }
  }, [isStaff, role, addToast]);

  useEffect(() => {
    if (isStaff && (role === 'admin' || role === 'super_admin')) {
      fetchCoupons();
    }
  }, [isStaff, role, fetchCoupons]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);

    try {
      const { error } = await supabase
        .from('coupons')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setCoupons(prev => prev.filter(c => c.id !== id));
      addToast('success', 'Cupom excluído com sucesso!');
    } catch (err: any) {
      console.error('Error deleting coupon:', err);
      addToast('error', err?.message || 'Erro ao excluir cupom.');
    } finally {
      setDeletingId(null);
      setCouponToDelete(null);
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('coupons')
        .update({ active: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      setCoupons(prev => prev.map(c => c.id === id ? { ...c, active: !currentStatus } : c));
      addToast('success', `Cupom ${!currentStatus ? 'ativado' : 'desativado'} com sucesso!`);
    } catch (err) {
      console.error('Error toggling coupon status:', err);
      addToast('error', 'Erro ao alterar status do cupom.');
    }
  };

  const filteredCoupons = coupons.filter(coupon => 
    coupon.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (authLoading) return null;
  if (!isStaff || (role !== 'admin' && role !== 'super_admin')) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Cupons de Desconto</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Gerencie códigos promocionais e descontos do site.</p>
        </div>
        <Link 
          href="/admin/coupons/new" 
          className="bg-[#2271b1] text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-[#135e96] transition-colors text-sm font-bold uppercase tracking-widest"
        >
          <Plus size={18} />
          Novo Cupom
        </Link>
      </div>

      <div className="relative z-0 bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex flex-col md:flex-row md:items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Pesquisar por código..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded focus:outline-none focus:border-[#2271b1] text-sm text-gray-900 dark:text-white bg-transparent"
            />
          </div>
        </div>

        <div className="overflow-x-auto relative z-0">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 font-bold uppercase text-[10px] tracking-widest">
              <tr>
                <th className="px-6 py-4">Código</th>
                <th className="px-6 py-4">Tipo</th>
                <th className="px-6 py-4">Valor</th>
                <th className="px-6 py-4">Uso</th>
                <th className="px-6 py-4">Expiração</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-[#2271b1] mx-auto" />
                  </td>
                </tr>
              ) : filteredCoupons.length > 0 ? (
                filteredCoupons.map((coupon) => (
                  <tr key={coupon.id} className="relative z-0 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-[#2271b1] dark:text-[#72aee6] uppercase">
                      {coupon.code}
                    </td>
                    <td className="px-6 py-4 text-gray-700 dark:text-gray-200 text-xs font-bold uppercase tracking-tighter">
                      {coupon.type === 'percentage' ? 'Porcentagem (%)' : 'Valor Fixo (R$)'}
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">
                      {coupon.type === 'percentage' ? `${coupon.value}%` : `R$ ${Number(coupon.value).toFixed(2)}`}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-900 dark:text-white">{coupon.used_count || 0} / {coupon.usage_limit || '∞'}</span>
                        <div className="w-20 h-1 bg-gray-100 dark:bg-gray-800 rounded-full mt-1 overflow-hidden">
                          <div 
                            className="h-full bg-[#13daec]" 
                            style={{ width: coupon.usage_limit ? `${Math.min(100, (coupon.used_count / coupon.usage_limit) * 100)}%` : '0%' }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-gray-500 dark:text-gray-400">
                      {coupon.expires_at ? new Date(coupon.expires_at).toLocaleDateString('pt-BR') : 'Sem expiração'}
                    </td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => toggleActive(coupon.id, coupon.active)}
                        className={cn(
                          "flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest transition-colors",
                          coupon.active 
                            ? "bg-green-50 text-green-600 dark:bg-green-900/20" 
                            : "bg-red-50 text-red-600 dark:bg-red-900/20"
                        )}
                      >
                        {coupon.active ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                        {coupon.active ? 'Ativo' : 'Inativo'}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 relative z-20">
                        <Link 
                          href={`/admin/coupons/edit/${coupon.id}`}
                          className="p-2 rounded-lg text-gray-400 hover:text-[#2271b1] hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors relative z-20 cursor-pointer"
                        >
                          <Edit2 size={18} />
                        </Link>
                        <button 
                          type="button"
                          onClick={() => setCouponToDelete({ id: coupon.id, code: coupon.code })}
                          disabled={deletingId === coupon.id}
                          className="p-2 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer z-20 relative"
                        >
                          {deletingId === coupon.id ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-gray-500 dark:text-gray-400">
                    Nenhum cupom encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {couponToDelete && (
        <DeleteModal
          code={couponToDelete.code}
          onConfirm={() => handleDelete(couponToDelete.id)}
          onCancel={() => setCouponToDelete(null)}
          isDeleting={deletingId === couponToDelete.id}
        />
      )}
    </div>
  );
}

// Modal de Confirmação de Exclusão
function DeleteModal({ code, onConfirm, onCancel, isDeleting }: { code: string; onConfirm: () => void; onCancel: () => void; isDeleting: boolean }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-gray-800 animate-in fade-in zoom-in duration-200">
        <div className="p-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Excluir cupom</h3>
          <p className="text-gray-600 dark:text-gray-400">
            Tem certeza que deseja excluir o cupom <span className="font-bold text-red-500 uppercase">&quot;{code}&quot;</span>? Esta ação não pode ser desfeita.
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800/50 px-6 py-4 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-bold text-white bg-red-500 hover:bg-red-600 rounded transition-colors flex items-center gap-2 disabled:bg-red-400"
          >
            {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
            {isDeleting ? 'Excluindo...' : 'Excluir Cupom'}
          </button>
        </div>
      </div>
    </div>
  );
}
