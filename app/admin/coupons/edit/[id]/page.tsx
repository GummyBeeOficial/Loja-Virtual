'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Save, Loader2, Tag, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

export default function EditCouponPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { isStaff, role } = useAuth();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  const [formData, setFormData] = useState({
    code: '',
    type: 'percentage',
    value: '',
    min_purchase: '0',
    usage_limit: '',
    expires_at: '',
    active: true
  });

  const fetchCoupon = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (data) {
        setFormData({
          code: data.code,
          type: data.type,
          value: data.value.toString(),
          min_purchase: data.min_purchase.toString(),
          usage_limit: data.usage_limit ? data.usage_limit.toString() : '',
          expires_at: data.expires_at ? new Date(data.expires_at).toISOString().slice(0, 16) : '',
          active: data.active
        });
      }
    } catch (err) {
      console.error('Error fetching coupon:', err);
      addToast('error', 'Erro ao carregar dados do cupom.');
      router.push('/admin/coupons');
    } finally {
      setPageLoading(false);
    }
  }, [id, addToast, router]);

  useEffect(() => {
    if (isStaff && (role === 'admin' || role === 'super_admin')) {
      fetchCoupon();
    }
  }, [isStaff, role, fetchCoupon]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isStaff || (role !== 'admin' && role !== 'super_admin')) return;

    setLoading(true);

    try {
      const payload = {
        code: formData.code.trim().toLowerCase(),
        type: formData.type,
        value: Number(formData.value),
        min_purchase: Number(formData.min_purchase) || 0,
        usage_limit: formData.usage_limit ? parseInt(formData.usage_limit) : null,
        expires_at: formData.expires_at ? new Date(formData.expires_at).toISOString() : null,
        active: formData.active
      };

      const { error } = await supabase
        .from('coupons')
        .update(payload)
        .eq('id', id);

      if (error) throw error;

      addToast('success', 'Cupom atualizado com sucesso!');
      router.push('/admin/coupons');
    } catch (err: any) {
      console.error('Error updating coupon:', err);
      if (err.code === '23505') {
        addToast('error', 'Já existe outro cupom com este código.');
      } else {
        addToast('error', 'Erro ao atualizar cupom.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormData(prev => ({ ...prev, [name]: val }));
  };

  if (pageLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 size={40} className="animate-spin text-[#2271b1] mb-4" />
        <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Carregando Cupom...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link 
            href="/admin/coupons" 
            className="p-2 text-gray-500 hover:bg-white dark:hover:bg-gray-800 rounded-full transition-all"
          >
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tighter">Editar Cupom</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="p-8 border-b border-gray-50 dark:border-gray-800">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 text-[#2271b1] rounded-full flex items-center justify-center">
              <Tag size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Editar Regras</h2>
              <p className="text-xs text-gray-500">Alerte que alterações podem afetar compras em andamento.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-600 dark:text-gray-300 uppercase tracking-widest">Código do Cupom</label>
              <input 
                type="text" 
                name="code"
                required
                value={formData.code}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-[#2271b1] transition-all text-sm font-bold uppercase tracking-widest text-gray-900 dark:text-white"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-600 dark:text-gray-300 uppercase tracking-widest">Tipo de Desconto</label>
              <select 
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-[#2271b1] transition-all text-sm font-bold text-gray-900 dark:text-white"
              >
                <option value="percentage">Porcentagem (%)</option>
                <option value="fixed">Valor Fixo (R$)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-600 dark:text-gray-300 uppercase tracking-widest">Valor do Desconto</label>
              <input 
                type="number" 
                name="value"
                required
                step="0.01"
                value={formData.value}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-[#2271b1] transition-all text-sm font-bold text-gray-900 dark:text-white"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-600 dark:text-gray-300 uppercase tracking-widest">Compra Mínima (R$)</label>
              <input 
                type="number" 
                name="min_purchase"
                step="0.01"
                value={formData.min_purchase}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-[#2271b1] transition-all text-sm font-bold text-gray-900 dark:text-white"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-600 dark:text-gray-300 uppercase tracking-widest">Limite de Uso (Total)</label>
              <input 
                type="number" 
                name="usage_limit"
                value={formData.usage_limit}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-[#2271b1] transition-all text-sm font-bold text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                placeholder="Vazio para ilimitado"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-600 dark:text-gray-300 uppercase tracking-widest">Data de Expiração</label>
              <input 
                type="datetime-local" 
                name="expires_at"
                value={formData.expires_at}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-[#2271b1] transition-all text-sm font-bold text-gray-900 dark:text-white"
              />
            </div>

            <div className="md:col-span-2 flex items-center gap-3 py-4">
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  name="active"
                  checked={formData.active}
                  onChange={handleInputChange}
                  className="sr-only peer" 
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#2271b1]"></div>
              </label>
              <span className="text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-widest">Cupom Ativo</span>
            </div>
          </div>
        </div>

        <div className="p-8 bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-4">
          <Link 
            href="/admin/coupons" 
            className="px-8 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-gray-700 transition-colors"
          >
            Cancelar
          </Link>
          <button 
            type="submit" 
            disabled={loading}
            className="bg-[#2271b1] text-white px-10 py-3 rounded-full font-bold text-[10px] uppercase tracking-widest hover:bg-[#135e96] hover:brightness-110 transition-all shadow-lg shadow-[#2271b1]/20 flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {loading ? 'Salvando...' : 'Atualizar Cupom'}
          </button>
        </div>
      </form>
    </div>
  );
}
