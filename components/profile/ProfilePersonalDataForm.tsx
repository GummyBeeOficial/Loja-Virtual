'use client';

import React from 'react';
import { User, Mail, Phone, CreditCard, Loader2, Save, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProfilePersonalDataFormProps {
  formData: {
    full_name: string;
    phone: string;
    cpf: string;
  };
  userEmail: string;
  saving: boolean;
  message: { type: 'success' | 'error', text: string } | null;
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSave: (e: React.FormEvent) => void;
}

export function ProfilePersonalDataForm({ 
  formData, 
  userEmail, 
  saving, 
  message,
  isEditing,
  onEdit,
  onCancel,
  onInputChange, 
  onSave 
}: ProfilePersonalDataFormProps) {
  
  // Mascarar CPF: 000.000.000-00
  const maskCPF = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  // Mascarar Telefone: (00) 00000-0000
  const maskPhone = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let maskedValue = value;

    if (name === 'cpf') maskedValue = maskCPF(value);
    if (name === 'phone') maskedValue = maskPhone(value);

    // Criar um novo evento com o valor mascarado para passar ao pai
    const newEvent = {
      ...e,
      target: {
        ...e.target,
        name,
        value: maskedValue
      }
    } as React.ChangeEvent<HTMLInputElement>;

    onInputChange(newEvent);
  };

  return (
    <form onSubmit={onSave} className="space-y-6">
      {/* Local Feedback Message */}
      {message && (
        <div className={cn(
          "p-4 rounded-xl flex items-center gap-3 text-sm font-bold animate-in fade-in slide-in-from-top-2 border shadow-sm",
          message.type === 'success' 
            ? "bg-green-50 text-green-700 border-green-100" 
            : "bg-red-50 text-red-700 border-red-100"
        )}>
          {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span>{message.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-2">
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-widest text-[10px]">Nome Completo</label>
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
            <input 
              type="text"
              name="full_name"
              value={formData.full_name}
              onChange={onInputChange}
              disabled={!isEditing}
              className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-2xl focus:ring-2 focus:ring-[#13daec] focus:border-transparent outline-none transition-all font-medium disabled:bg-gray-100/50 dark:disabled:bg-gray-800/50 disabled:text-gray-500 dark:disabled:text-gray-500 disabled:cursor-not-allowed"
              placeholder="Seu nome completo"
              required
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-widest text-[10px]">E-mail (Somente Leitura)</label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
            <input 
              type="email"
              value={userEmail}
              disabled
              className="w-full pl-12 pr-4 py-4 bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-2xl text-gray-500 dark:text-gray-500 cursor-not-allowed font-medium"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-widest text-[10px]">Telefone</label>
          <div className="relative">
            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
            <input 
              type="text"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              disabled={!isEditing}
              className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-2xl focus:ring-2 focus:ring-[#13daec] focus:border-transparent outline-none transition-all font-medium disabled:bg-gray-100/50 dark:disabled:bg-gray-800/50 disabled:text-gray-500 dark:disabled:text-gray-500 disabled:cursor-not-allowed"
              placeholder="(00) 00000-0000"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-widest text-[10px]">CPF</label>
          <div className="relative">
            <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
            <input 
              type="text"
              name="cpf"
              value={formData.cpf}
              onChange={handleChange}
              disabled={!isEditing}
              className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-2xl focus:ring-2 focus:ring-[#13daec] focus:border-transparent outline-none transition-all font-medium disabled:bg-gray-100/50 dark:disabled:bg-gray-800/50 disabled:text-gray-500 dark:disabled:text-gray-500 disabled:cursor-not-allowed"
              placeholder="000.000.000-00"
            />
          </div>
        </div>
      </div>
      <div className="flex justify-end pt-4 gap-3">
        {!isEditing ? (
          <button 
            type="button"
            onClick={onEdit}
            className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-all flex items-center gap-3 shadow-xl shadow-zinc-200 dark:shadow-none"
          >
            <User size={18} />
            Editar Dados
          </button>
        ) : (
          <>
            <button 
              type="button"
              onClick={onCancel}
              className="bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              disabled={saving}
              className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-all flex items-center gap-3 disabled:opacity-70 shadow-xl shadow-zinc-200 dark:shadow-none"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              Salvar Dados
            </button>
          </>
        )}
      </div>
    </form>
  );
}
