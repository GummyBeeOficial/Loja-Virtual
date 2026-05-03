'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Edit2, Trash2, Loader2, X, Truck, CheckCircle2, XCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { cn } from '@/lib/utils';

export default function ShippingPage() {
  const { role, isStaff, loading: authLoading } = useAuth();
  const { addToast } = useToast();
  const [shippingMethods, setShippingMethods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [shippingToDelete, setShippingToDelete] = useState<{ id: string; code: string } | null>(null);

  const [formData, setFormData] = useState({
    code: '',
    label: '',
    price: '' as string | number,
    prazo_min: '' as string | number,
    prazo_max: '' as string | number,
    active: true
  });

  const parseETA = (eta: string) => {
    const numbers = eta.match(/\d+/g);
    if (numbers && numbers.length >= 2) {
      return { min: numbers[0], max: numbers[1] };
    } else if (numbers && numbers.length === 1) {
      return { min: numbers[0], max: numbers[0] };
    }
    return { min: '', max: '' };
  };

  const fetchShippingMethods = useCallback(async () => {
    if (!isStaff || (role !== 'admin' && role !== 'super_admin')) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('shipping_methods')
        .select('*')
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      setShippingMethods(data || []);
    } catch (err) {
      console.error('Error fetching shipping methods:', err);
      addToast('error', 'Erro ao carregar métodos de envio.');
    } finally {
      setLoading(false);
    }
  }, [isStaff, role, addToast]);

  useEffect(() => {
    if (isStaff && (role === 'admin' || role === 'super_admin')) {
      fetchShippingMethods();
    }
  }, [isStaff, role, fetchShippingMethods]);

  const handleOpenModal = (method: any = null) => {
    if (method) {
      const parsed = parseETA(method.eta || '');
      setEditingMethod(method);
      setFormData({
        code: method.code,
        label: method.label,
        price: Number(method.price),
        prazo_min: parsed.min,
        prazo_max: parsed.max,
        active: method.active
      });
    } else {
      setEditingMethod(null);
      setFormData({
        code: '',
        label: '',
        price: '',
        prazo_min: '',
        prazo_max: '',
        active: true
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const min = parseInt(formData.prazo_min as string);
      const max = parseInt(formData.prazo_max as string);
      let finalETA = '';
      
      if (!isNaN(min) && !isNaN(max)) {
        finalETA = min === max ? `${min} dias úteis` : `${min} a ${max} dias úteis`;
      } else if (!isNaN(min)) {
        finalETA = `${min} dias úteis`;
      }

      const numericPrice = formData.price === '' ? 0 : Number(formData.price);

      if (editingMethod) {
        // Edit mode
        const { error } = await supabase
          .from('shipping_methods')
          .update({
            label: formData.label,
            price: numericPrice,
            eta: finalETA,
            active: formData.active
          })
          .eq('id', editingMethod.id);
        
        if (error) throw error;
        addToast('success', 'Método de envio atualizado com sucesso!');
      } else {
        // Create mode
        if (!formData.code.trim()) {
          addToast('error', 'O código é obrigatório para novos métodos.');
          setSaving(false);
          return;
        }

        // Check for duplicates
        const exists = shippingMethods.find(m => m.code.toLowerCase() === formData.code.toLowerCase());
        if (exists) {
          addToast('error', 'Já existe um método com este código.');
          setSaving(false);
          return;
        }

        const { error } = await supabase
          .from('shipping_methods')
          .insert([{
            id: crypto.randomUUID(),
            code: formData.code.toLowerCase().trim(),
            label: formData.label,
            price: numericPrice,
            eta: finalETA,
            active: formData.active
          }]);
        
        if (error) throw error;
        addToast('success', 'Método de envio criado com sucesso!');
      }
      
      setIsModalOpen(false);
      fetchShippingMethods();
    } catch (err: any) {
      console.error('Error saving shipping method:', err);
      addToast('error', err.message || 'Erro ao salvar método de envio.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setDeletingId(id);
      const { error } = await supabase
        .from('shipping_methods')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setShippingMethods(prev => prev.filter(m => m.id !== id));
      addToast('success', 'Método de envio excluído com sucesso!');
    } catch (err: any) {
      console.error('Error deleting shipping method:', err);
      addToast('error', err.message || 'Erro ao excluir método de envio.');
    } finally {
      setDeletingId(null);
      setShippingToDelete(null);
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('shipping_methods')
        .update({ active: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      setShippingMethods(prev => prev.map(m => m.id === id ? { ...m, active: !currentStatus } : m));
      addToast('success', `Método ${!currentStatus ? 'ativado' : 'desativado'} com sucesso!`);
    } catch (err) {
      console.error('Error toggling status:', err);
      addToast('error', 'Erro ao alterar status.');
    }
  };

  const filteredMethods = shippingMethods.filter(method => 
    method.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    method.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (authLoading) return null;
  if (!isStaff || (role !== 'admin' && role !== 'super_admin')) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Métodos de Envio</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Configure as opções de frete e prazos de entrega.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-[#2271b1] text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-[#135e96] transition-colors text-sm font-medium"
        >
          <Plus size={18} />
          Adicionar Novo
        </button>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Pesquisar métodos..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded focus:outline-none focus:border-[#2271b1] text-sm text-gray-900 dark:text-white bg-transparent transition-colors"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 font-bold uppercase text-[10px] tracking-widest">
              <tr>
                <th className="px-6 py-4">Código (Slug)</th>
                <th className="px-6 py-4">Nome do Método</th>
                <th className="px-6 py-4">Preço (R$)</th>
                <th className="px-6 py-4">Prazo (ETA)</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800 text-gray-700 dark:text-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-[#2271b1] mx-auto" />
                  </td>
                </tr>
              ) : filteredMethods.length > 0 ? (
                filteredMethods.map((method) => (
                  <tr key={method.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-mono text-[10px] bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-500 uppercase">
                        {method.code}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-[#2271b1] dark:text-[#72aee6]">
                      {method.label}
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">
                      {Number(method.price) === 0 ? 'Grátis' : `R$ ${Number(method.price).toFixed(2)}`}
                    </td>
                    <td className="px-6 py-4 italic text-xs">
                      {method.eta || 'Não informado'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={method.active}
                            onChange={() => toggleActive(method.id, method.active)}
                            className="sr-only peer" 
                          />
                          <div className="w-9 h-5 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                        </label>
                        <span className={cn(
                          "text-[10px] uppercase font-bold tracking-widest",
                          method.active ? "text-green-500" : "text-gray-400"
                        )}>
                          {method.active ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleOpenModal(method)}
                          className="p-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-[#2271b1] dark:text-[#72aee6] transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => setShippingToDelete({ id: method.id, code: method.code })}
                          disabled={deletingId === method.id}
                          className="p-2 border border-red-100 dark:border-red-900/50 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 transition-colors disabled:opacity-50"
                        >
                          {deletingId === method.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-500 italic">
                    Nenhum método de envio encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal CRUD */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-gray-800 animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <h2 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Truck size={18} className="text-[#2271b1]" />
                {editingMethod ? 'Editar Método de Envio' : 'Novo Método de Envio'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="space-y-4">
                {/* Code - Only editable if creating */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-widest mb-1">
                    Código Identificador {editingMethod && <span className="text-[10px] lowercase normal-case opacity-50">(Não editável)</span>}
                  </label>
                  <input 
                    type="text" 
                    required
                    disabled={!!editingMethod}
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toLowerCase().replace(/\s/g, '') })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-950/50 focus:outline-none focus:border-[#2271b1] disabled:bg-gray-100 dark:disabled:bg-gray-900 disabled:text-gray-400"
                    placeholder="ex: standard, express, pickup"
                  />
                  {!editingMethod && (
                    <p className="text-[10px] text-gray-400 mt-1 italic leading-tight">
                      Identificador interno usado no checkout. Use apenas letras minúsculas e sem espaços.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-widest mb-1">Nome de Exibição</label>
                  <input 
                    type="text" 
                    required
                    value={formData.label}
                    onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-950/50 focus:outline-none focus:border-[#2271b1]"
                    placeholder="Ex: Entrega Padrão"
                  />
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-widest mb-1">Preço do Frete (R$)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">R$</span>
                      <input 
                        type="number" 
                        step="0.01"
                        required
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-700 rounded text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-950/50 focus:outline-none focus:border-[#2271b1]"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-widest mb-1">Prazo Mín. (Dias)</label>
                      <input 
                        type="number" 
                        required
                        min="0"
                        value={formData.prazo_min}
                        onChange={(e) => setFormData({ ...formData, prazo_min: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-950/50 focus:outline-none focus:border-[#2271b1]"
                        placeholder="Ex: 5"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-widest mb-1">Prazo Máx. (Dias)</label>
                      <input 
                        type="number" 
                        required
                        min="0"
                        value={formData.prazo_max}
                        onChange={(e) => setFormData({ ...formData, prazo_max: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-950/50 focus:outline-none focus:border-[#2271b1]"
                        placeholder="Ex: 7"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input 
                    type="checkbox" 
                    id="active-check"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-[#2271b1] focus:ring-[#2271b1]"
                  />
                  <label htmlFor="active-check" className="text-sm text-gray-700 dark:text-gray-300">Ativar este método imediatamente</label>
                </div>
              </div>

              <div className="pt-6 flex justify-end gap-3 border-t border-gray-200 dark:border-gray-800 mt-6">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={saving}
                  className="bg-[#2271b1] text-white px-6 py-2 rounded text-sm font-bold uppercase tracking-widest hover:bg-[#135e96] transition-colors disabled:opacity-70 flex items-center gap-2"
                >
                  {saving && <Loader2 size={16} className="animate-spin" />}
                  {editingMethod ? 'Atualizar' : 'Criar Método'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {shippingToDelete && (
        <DeleteModal
          code={shippingToDelete.code}
          onConfirm={() => handleDelete(shippingToDelete.id)}
          onCancel={() => setShippingToDelete(null)}
          isDeleting={deletingId === shippingToDelete.id}
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
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Excluir método de envio</h3>
          <p className="text-gray-600 dark:text-gray-400">
            Tem certeza que deseja excluir o método <span className="font-bold text-red-500 uppercase">&quot;{code}&quot;</span>? Esta ação não pode ser desfeita.
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
            {isDeleting ? 'Excluindo...' : 'Excluir Método'}
          </button>
        </div>
      </div>
    </div>
  );
}
