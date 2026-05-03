'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  CreditCard, 
  Save, 
  Loader2, 
  QrCode, 
  Barcode, 
  AlertCircle,
  ShieldCheck,
  Landmark,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Settings2,
  GripVertical,
  X,
  Check,
  Edit2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

// Constantes de Controle
const PROTECTED_CODES = ['credit_card', 'pix', 'boleto', 'bank_transfer'];

const ICON_MAP: Record<string, any> = {
  CreditCard,
  QrCode,
  Barcode,
  Landmark,
  Settings2
};

const PAYMENT_TYPES = [
  { id: 'gateway', label: 'Gateway / Cartão', icon: CreditCard },
  { id: 'qr_code', label: 'QR Code / PIX', icon: QrCode },
  { id: 'barcode', label: 'Código de Barras / Boleto', icon: Barcode },
  { id: 'manual', label: 'Depósito / Transferência', icon: Landmark }
];

export default function PaymentsAdminPage() {
  const { role, isStaff, loading: authLoading } = useAuth();
  const { addToast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [methods, setMethods] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<any>(null);
  const [methodToDelete, setMethodToDelete] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchMethods = useCallback(async () => {
    if (!isStaff || (role !== 'admin' && role !== 'super_admin')) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) {
        // Se a tabela ainda não existir ( migration não aplicada), tratamos graciosamente
        if (error.code === 'PGRST116' || error.message.includes('relation "payment_methods" does not exist')) {
          console.warn('[PaymentsAdmin] Tabela payment_methods ainda não existe.');
          setMethods([]);
          return;
        }
        throw error;
      }

      setMethods(data || []);
    } catch (err) {
      console.error('Error fetching payment methods:', err);
      addToast('error', 'Erro ao carregar métodos de pagamento.');
    } finally {
      setLoading(false);
    }
  }, [isStaff, role, addToast]);

  useEffect(() => {
    if (!authLoading && isStaff && (role === 'admin' || role === 'super_admin')) {
      fetchMethods();
    }
  }, [authLoading, isStaff, role, fetchMethods]);

  const handleSaveMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMethod) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('payment_methods')
        .upsert(editingMethod);

      if (error) throw error;
      
      addToast('success', `Método "${editingMethod.label}" salvo com sucesso!`);
      setIsModalOpen(false);
      fetchMethods();
    } catch (err) {
      console.error('Error saving payment method:', err);
      addToast('error', 'Erro ao salvar o método de pagamento.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (method: any) => {
    setMethodToDelete(method);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!methodToDelete) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from('payment_methods')
        .delete()
        .eq('id', methodToDelete.id);

      if (error) throw error;
      
      addToast('success', `Método "${methodToDelete.label}" excluído com sucesso.`);
      setIsDeleteModalOpen(false);
      setMethodToDelete(null);
      fetchMethods();
    } catch (err) {
      console.error('Error deleting payment method:', err);
      addToast('error', 'Erro ao excluir o método de pagamento.');
    } finally {
      setDeleting(false);
    }
  };

  const moveOrder = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= methods.length) return;

    const newMethods = [...methods];
    const temp = newMethods[index];
    newMethods[index] = newMethods[targetIndex];
    newMethods[targetIndex] = temp;

    // Atualiza sort_order localmente
    const updatedWithOrder = newMethods.map((m, i) => ({ ...m, sort_order: i }));
    setMethods(updatedWithOrder);

    // Persiste no banco em lote
    try {
      const { error } = await supabase
        .from('payment_methods')
        .upsert(updatedWithOrder);
      
      if (error) throw error;
    } catch (err) {
      console.error('Error updating sort order:', err);
      addToast('error', 'Erro ao salvar nova ordem.');
      fetchMethods(); // Reverte se falhar
    }
  };

  const openModal = (method: any = null) => {
    if (method) {
      setEditingMethod({ ...method });
    } else {
      setEditingMethod({
        label: '',
        code: '',
        type: 'gateway',
        active: true,
        instructions: '',
        icon_name: 'Settings2',
        config: {},
        sort_order: methods.length
      });
    }
    setIsModalOpen(true);
  };

  if (authLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <Loader2 size={40} className="animate-spin text-[#2271b1] mb-4" />
        <p className="text-gray-500 font-medium tracking-widest text-xs uppercase">Sincronizando métodos de pagamento...</p>
      </div>
    );
  }

  if (!isStaff || (role !== 'admin' && role !== 'super_admin')) {
    return (
      <div className="p-8 text-center bg-red-50 text-red-600 rounded-xl border border-red-100">
        <AlertCircle size={40} className="mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">Acesso Negado</h2>
        <p>Você não tem permissão para gerenciar pagamentos.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex justify-between items-center bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <CreditCard className="text-[#2271b1]" />
            Gerenciador de Pagamentos
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Configuração dinâmica de métodos de pagamento do checkout.</p>
        </div>
        <button 
          onClick={() => openModal()}
          className="bg-[#2271b1] text-white px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-[#135e96] transition-all shadow-lg shadow-blue-500/10"
        >
          <Plus size={18} />
          Adicionar Método
        </button>
      </div>

      {methods.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
          <Settings2 size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">Nenhum método cadastrado na nova tabela.</p>
          <p className="text-xs text-gray-400 mt-2">Clique em &quot;Adicionar Método&quot; ou aplique a migration de sincronização.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {methods.map((method, index) => {
            const Icon = ICON_MAP[method.icon_name] || Settings2;
            const isProtected = PROTECTED_CODES.includes(method.code);
            
            return (
              <div 
                key={method.id} 
                className={cn(
                  "bg-white dark:bg-gray-900 p-5 rounded-2xl border transition-all flex items-center gap-4 group",
                  method.active ? "border-gray-100 dark:border-gray-800 hover:shadow-md" : "border-gray-200 dark:border-gray-800 opacity-60 grayscale-[0.5]"
                )}
              >
                <div className="text-gray-300 cursor-grab active:cursor-grabbing px-1">
                  <GripVertical size={20} />
                </div>

                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors",
                  method.active ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600" : "bg-gray-100 dark:bg-gray-800 text-gray-400"
                )}>
                  <Icon size={24} />
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-gray-900 dark:text-white">{method.label}</h3>
                    {isProtected && (
                      <span className="text-[9px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Sistema</span>
                    )}
                    {!method.active && (
                      <span className="text-[9px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Inativo</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <p className="text-[10px] font-mono text-gray-400 uppercase tracking-tighter">CODE: {method.code}</p>
                    <span className="w-1 h-1 bg-gray-200 rounded-full" />
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{method.type}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => moveOrder(index, 'up')}
                    disabled={index === 0}
                    className="p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl text-gray-400 disabled:opacity-20"
                  >
                    <ChevronUp size={18} />
                  </button>
                  <button 
                    onClick={() => moveOrder(index, 'down')}
                    disabled={index === methods.length - 1}
                    className="p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl text-gray-400 disabled:opacity-20"
                  >
                    <ChevronDown size={18} />
                  </button>
                </div>

                <div className="flex items-center gap-2 pl-4 border-l border-gray-50 dark:border-gray-800">
                  <button 
                    onClick={() => openModal(method)}
                    className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 rounded-xl transition-colors flex items-center gap-2 px-4"
                  >
                    <Edit2 size={18} />
                    <span className="text-sm font-bold">Editar</span>
                  </button>
                  {!isProtected && (
                    <button 
                      onClick={() => handleDeleteClick(method)}
                      className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 rounded-xl transition-colors"
                      title="Excluir método"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Alerta de Modo de Migração */}
      <div className="bg-amber-50 dark:bg-amber-900/10 p-6 rounded-2xl border border-amber-100 dark:border-amber-900/30 flex items-start gap-4">
        <AlertCircle className="text-amber-600 flex-shrink-0 mt-1" size={20} />
        <div>
          <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200 uppercase tracking-tighter">Ambiente de Transição</h4>
          <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
            Esta tela gerencia a nova tabela dinâmica de pagamentos. O checkout atual já foi preparado para ler desta fonte como prioridade. Métodos protegidos (Cartão, PIX, Boleto, Transferência) mantêm seus códigos de sistema para garantir que pedidos antigos e integrações não quebrem.
          </p>
        </div>
      </div>

      {/* Modal de Cadastro/Edição */}
      {isModalOpen && editingMethod && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-gray-900 w-full max-w-2xl rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-gray-50 dark:border-gray-800 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-900 z-10">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tighter">
                  {editingMethod.id ? 'Editar Método' : 'Novo Método de Pagamento'}
                </h2>
                <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest font-medium">Configurações Gerais e de Sucesso</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-2xl text-gray-400 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSaveMethod} className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Nome do Método */}
                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Nome Exibido ao Cliente</label>
                  <input 
                    type="text" 
                    required
                    value={editingMethod.label || ''}
                    onChange={(e) => setEditingMethod({ ...editingMethod, label: e.target.value })}
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl text-sm outline-none focus:ring-2 focus:ring-[#2271b1] transition-all text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                    placeholder="Ex: Cartão de Crédito via Stripe"
                  />
                </div>

                {/* Código Interno */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Código (Slug)</label>
                  <input 
                    type="text" 
                    required
                    disabled={PROTECTED_CODES.includes(editingMethod.code)}
                    value={editingMethod.code || ''}
                    onChange={(e) => setEditingMethod({ ...editingMethod, code: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl text-sm font-mono outline-none focus:ring-2 focus:ring-[#2271b1] transition-all disabled:opacity-50 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                    placeholder="ex: mp_card"
                  />
                  {PROTECTED_CODES.includes(editingMethod.code) && (
                    <p className="text-[9px] text-blue-500 font-bold pl-1 italic">Código de sistema protegido.</p>
                  )}
                </div>

                {/* Tipo de Renderização */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Tipo de Pagamento</label>
                  <select 
                    value={editingMethod.type || 'gateway'}
                    onChange={(e) => setEditingMethod({ ...editingMethod, type: e.target.value })}
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl text-sm outline-none focus:ring-2 focus:ring-[#2271b1] transition-all text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                  >
                    {PAYMENT_TYPES.map(type => (
                      <option 
                        key={type.id} 
                        value={type.id}
                        className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                      >
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Ícone */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Ícone</label>
                  <div className="flex gap-2 text-gray-900 dark:text-white">
                    {Object.keys(ICON_MAP).map(iconName => (
                      <button
                        key={iconName}
                        type="button"
                        onClick={() => setEditingMethod({ ...editingMethod, icon_name: iconName })}
                        className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center transition-all border-2",
                          editingMethod.icon_name === iconName 
                            ? "border-[#2271b1] bg-blue-50 dark:bg-blue-900/20 text-blue-600" 
                            : "border-transparent bg-gray-50 dark:bg-gray-800 text-gray-400 hover:bg-gray-100"
                        )}
                      >
                        {React.createElement(ICON_MAP[iconName], { size: 20 })}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Status Ativo */}
                <div className="flex items-center gap-3 pt-6 pl-1">
                  <button
                    type="button"
                    onClick={() => setEditingMethod({ ...editingMethod, active: !editingMethod.active })}
                    className={cn(
                      "w-12 h-6 rounded-full transition-all relative",
                      editingMethod.active ? "bg-green-500" : "bg-gray-200 dark:bg-gray-700"
                    )}
                  >
                    <div className={cn(
                      "w-4 h-4 bg-white rounded-full absolute top-1 transition-all shadow-sm",
                      editingMethod.active ? "left-7" : "left-1"
                    )} />
                  </button>
                  <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                    {editingMethod.active ? 'Método Ativo' : 'Inativo'}
                  </span>
                </div>
              </div>

              {/* Seção de Configuração Adaptativa baseada no TYPE */}
              <div className="p-6 bg-gray-50 dark:bg-gray-800/50 rounded-[24px] border border-gray-100 dark:border-gray-800 space-y-6">
                <div className="flex items-center gap-2 mb-2">
                  <Settings2 size={16} className="text-blue-600" />
                  <h4 className="text-xs font-black uppercase tracking-widest text-gray-900 dark:text-white">Configurações Específicas</h4>
                </div>

                {editingMethod.type === 'gateway' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Mensagem de Sucesso Automática</label>
                      <textarea 
                        value={editingMethod.config?.success_message || ''}
                        onChange={(e) => setEditingMethod({ 
                          ...editingMethod, 
                          config: { ...editingMethod.config, success_message: e.target.value } 
                        })}
                        rows={2}
                        className="w-full px-5 py-3 bg-white dark:bg-gray-900 border-none rounded-xl text-sm outline-none transition-all text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                        placeholder="Ex: Seu pagamento foi processado agora mesmo!"
                      />
                    </div>
                  </div>
                )}

                {editingMethod.type === 'qr_code' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Chave PIX</label>
                      <input 
                        type="text" 
                        value={editingMethod.config?.key || ''}
                        onChange={(e) => setEditingMethod({ 
                          ...editingMethod, 
                          config: { ...editingMethod.config, key: e.target.value } 
                        })}
                        className="w-full px-5 py-3 bg-white dark:bg-gray-900 border-none rounded-xl text-sm font-mono outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                        placeholder="E-mail, CPF ou Aleatória"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Nome do Recebedor</label>
                      <input 
                        type="text" 
                        value={editingMethod.config?.beneficiary || ''}
                        onChange={(e) => setEditingMethod({ 
                          ...editingMethod, 
                          config: { ...editingMethod.config, beneficiary: e.target.value } 
                        })}
                        className="w-full px-5 py-3 bg-white dark:bg-gray-900 border-none rounded-xl text-sm outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                        placeholder="Nome da Empresa"
                      />
                    </div>
                  </div>
                )}

                {editingMethod.type === 'barcode' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Linha Digitável (Para teste)</label>
                      <input 
                        type="text" 
                        value={editingMethod.config?.line || ''}
                        onChange={(e) => setEditingMethod({ 
                          ...editingMethod, 
                          config: { ...editingMethod.config, line: e.target.value } 
                        })}
                        className="w-full px-5 py-3 bg-white dark:bg-gray-900 border-none rounded-xl text-sm font-mono outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                        placeholder="00000.00000 00000.000000..."
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Dias p/ Vencimento</label>
                      <input 
                        type="number" 
                        value={editingMethod.config?.expiry_days ?? 3}
                        onChange={(e) => setEditingMethod({ 
                          ...editingMethod, 
                          config: { ...editingMethod.config, expiry_days: parseInt(e.target.value) || 0 } 
                        })}
                        className="w-full px-5 py-3 bg-white dark:bg-gray-900 border-none rounded-xl text-sm outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                      />
                    </div>
                  </div>
                )}

                {editingMethod.type === 'manual' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Nome do Banco</label>
                      <input 
                        type="text" 
                        value={editingMethod.config?.bank_name || ''}
                        onChange={(e) => setEditingMethod({ 
                          ...editingMethod, 
                          config: { ...editingMethod.config, bank_name: e.target.value } 
                        })}
                        className="w-full px-5 py-3 bg-white dark:bg-gray-900 border-none rounded-xl text-sm outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                        placeholder="Ex: Inter, Nubank..."
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Dados Bancários / Agência e Conta</label>
                      <input 
                        type="text" 
                        value={editingMethod.config?.account || ''}
                        onChange={(e) => setEditingMethod({ 
                          ...editingMethod, 
                          config: { ...editingMethod.config, account: e.target.value } 
                        })}
                        className="w-full px-5 py-3 bg-white dark:bg-gray-900 border-none rounded-xl text-sm font-mono outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                        placeholder="Ag 0001 C/C 1234-5"
                      />
                    </div>
                  </div>
                )}

                {/* Instruções de Pagamento (Comum a quase todos) */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Texto de Instrução ao Cliente (Checkout / Sucesso)</label>
                  <textarea 
                    value={editingMethod.instructions || ''}
                    onChange={(e) => setEditingMethod({ ...editingMethod, instructions: e.target.value })}
                    rows={4}
                    className="w-full px-5 py-3 bg-white dark:bg-gray-900 border-none rounded-xl text-sm outline-none transition-all text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                    placeholder="Dicas extras: Envie comprovante, aguarde compensação, etc."
                  />
                </div>
              </div>

              <div className="sticky bottom-0 bg-white dark:bg-gray-900 pt-4 pb-0 flex gap-3">
                <button 
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-[#2271b1] text-white py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#135e96] transition-all disabled:opacity-50"
                >
                  {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  {saving ? 'Gravando Alterações...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {isDeleteModalOpen && methodToDelete && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl p-8 space-y-6 text-center">
            <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-full flex items-center justify-center mx-auto">
              <Trash2 size={32} />
            </div>
            
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tighter">Confirmar Exclusão</h2>
              <p className="text-gray-500 dark:text-gray-400 mt-2">
                Tem certeza que deseja excluir o método <span className="font-bold text-gray-900 dark:text-white">&quot;{methodToDelete.label}&quot;</span>? Esta ação não pode ser desfeita.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={deleting}
                className="flex-1 px-6 py-4 rounded-2xl font-bold text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="flex-1 px-6 py-4 rounded-2xl font-bold text-sm text-white bg-red-600 hover:bg-red-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-600/20"
              >
                {deleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                {deleting ? 'Excluindo...' : 'Sim, Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
