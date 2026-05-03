'use client';

import React from 'react';
import { MapPin, Loader2, Save, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProfileAddressFormProps {
  formData: {
    zip_code: string;
    address: string;
    address_number: string;
    address_complement: string;
    neighborhood: string;
    city: string;
    state: string;
  };
  saving: boolean;
  message: { type: 'success' | 'error', text: string } | null;
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSave: (e: React.FormEvent) => void;
}

export function ProfileAddressForm({ 
  formData, 
  saving, 
  message,
  isEditing,
  onEdit,
  onCancel,
  onInputChange, 
  onSave 
}: ProfileAddressFormProps) {

  // Mascarar CEP: 00000-000
  const maskCEP = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .replace(/(-\d{3})\d+?$/, '$1');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let maskedValue = value;

    if (name === 'zip_code') maskedValue = maskCEP(value);

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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-widest text-[10px]">CEP</label>
          <input 
            type="text"
            name="zip_code"
            value={formData.zip_code}
            onChange={handleChange}
            disabled={!isEditing}
            className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-2xl focus:ring-2 focus:ring-[#13daec] focus:border-transparent outline-none transition-all font-medium disabled:bg-gray-100/50 dark:disabled:bg-gray-800/50 disabled:text-gray-500 dark:disabled:text-gray-500 disabled:cursor-not-allowed"
            placeholder="00000-000"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-widest text-[10px]">Endereço</label>
          <input 
            type="text"
            name="address"
            value={formData.address}
            onChange={onInputChange}
            disabled={!isEditing}
            className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-2xl focus:ring-2 focus:ring-[#13daec] focus:border-transparent outline-none transition-all font-medium disabled:bg-gray-100/50 dark:disabled:bg-gray-800/50 disabled:text-gray-500 dark:disabled:text-gray-500 disabled:cursor-not-allowed"
            placeholder="Rua, Avenida, etc."
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-widest text-[10px]">Número</label>
          <input 
            type="text"
            name="address_number"
            value={formData.address_number}
            onChange={onInputChange}
            disabled={!isEditing}
            className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-2xl focus:ring-2 focus:ring-[#13daec] focus:border-transparent outline-none transition-all font-medium disabled:bg-gray-100/50 dark:disabled:bg-gray-800/50 disabled:text-gray-500 dark:disabled:text-gray-500 disabled:cursor-not-allowed"
            placeholder="123"
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-widest text-[10px]">Complemento</label>
          <input 
            type="text"
            name="address_complement"
            value={formData.address_complement}
            onChange={onInputChange}
            disabled={!isEditing}
            className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-2xl focus:ring-2 focus:ring-[#13daec] focus:border-transparent outline-none transition-all font-medium disabled:bg-gray-100/50 dark:disabled:bg-gray-800/50 disabled:text-gray-500 dark:disabled:text-gray-500 disabled:cursor-not-allowed"
            placeholder="Apto, Bloco, etc."
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-widest text-[10px]">Bairro</label>
          <input 
            type="text"
            name="neighborhood"
            value={formData.neighborhood}
            onChange={onInputChange}
            disabled={!isEditing}
            className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-2xl focus:ring-2 focus:ring-[#13daec] focus:border-transparent outline-none transition-all font-medium disabled:bg-gray-100/50 dark:disabled:bg-gray-800/50 disabled:text-gray-500 dark:disabled:text-gray-500 disabled:cursor-not-allowed"
            placeholder="Seu bairro"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-widest text-[10px]">Cidade</label>
          <input 
            type="text"
            name="city"
            value={formData.city}
            onChange={onInputChange}
            disabled={!isEditing}
            className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-2xl focus:ring-2 focus:ring-[#13daec] focus:border-transparent outline-none transition-all font-medium disabled:bg-gray-100/50 dark:disabled:bg-gray-800/50 disabled:text-gray-500 dark:disabled:text-gray-500 disabled:cursor-not-allowed"
            placeholder="Sua cidade"
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-widest text-[10px]">Estado</label>
          <input 
            type="text"
            name="state"
            value={formData.state}
            onChange={onInputChange}
            disabled={!isEditing}
            className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-2xl focus:ring-2 focus:ring-[#13daec] focus:border-transparent outline-none transition-all font-medium disabled:bg-gray-100/50 dark:disabled:bg-gray-800/50 disabled:text-gray-500 dark:disabled:text-gray-500 disabled:cursor-not-allowed"
            placeholder="UF"
          />
        </div>
      </div>
      <div className="flex justify-end pt-4 gap-3">
        {!isEditing ? (
          <button 
            type="button"
            onClick={onEdit}
            className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-all flex items-center gap-3 shadow-xl shadow-zinc-200 dark:shadow-none"
          >
            <MapPin size={18} />
            Editar Endereço
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
              Salvar Endereço
            </button>
          </>
        )}
      </div>
    </form>
  );
}
