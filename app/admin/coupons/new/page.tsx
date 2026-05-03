'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Loader2, Tag } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

export default function NewCouponPage() {
  const router = useRouter();
  const { isStaff, role } = useAuth();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    code: '',
    type: 'percentage',
    value: '',
    min_purchase: '0',
    usage_limit: '',
    expires_at: '',
    active: true
  });

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
        .insert([payload]);

      if (error) {
        console.error('Error creating coupon (raw):', error);
        console.error('Error creating coupon message:', error.message);
        console.error('Error creating coupon details:', error.details);
        console.error('Error creating coupon hint:', error.hint);
        console.error('Error creating coupon code:', error.code);
        console.error('Error creating coupon full json:', JSON.stringify(error, null, 2));

        alert(
          `Erro ao criar cupom:\n\n` +
          `Mensagem: ${error.message || 'Sem mensagem'}\n` +
          `Detalhes: ${error.details || 'Sem detalhes'}\n` +
          `Hint: ${error.hint || 'Sem hint'}\n` +
          `Código: ${error.code || 'Sem código'}`
        );

        if (error.code === '23505') {
          addToast('error', 'Já existe um cupom com este código.');
        } else {
          addToast('error', error.message || 'Erro ao criar cupom.');
        }
        return;
      }

      addToast('success', 'Cupom criado com sucesso!');
      router.push('/admin/coupons');
    } catch (err) {
      console.error('Unexpected error:', err);
      addToast('error', 'Erro inesperado.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormData(prev => ({ ...prev, [name]: val }));
  };

  if (!isStaff) return null;

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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tighter">Novo Cupom</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="p-8 border-b border-gray-50 dark:border-gray-800">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 text-[#2271b1] rounded-full flex items-center justify-center">
              <Tag size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Informações Principais</h2>
              <p className="text-xs text-gray-500">Defina as regras do cupom promocional.</p>
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
                className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-[#2271b1] transition-all text-sm font-bold uppercase tracking-widest text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                placeholder="EX: VERAO20"
              />
              <p className="text-[10px] text-gray-400 italic">Será salvo em letras minúsculas automaticamente.</p>
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
                className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-[#2271b1] transition-all text-sm font-bold text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                placeholder={formData.type === 'percentage' ? '10' : '50.00'}
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
                className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-[#2271b1] transition-all text-sm font-bold text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                placeholder="0.00"
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
            {loading ? 'Criando...' : 'Salvar Cupom'}
          </button>
        </div>
      </form>
    </div>
  );
}
