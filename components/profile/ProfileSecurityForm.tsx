'use client';

import React, { useState, useMemo } from 'react';
import { Shield, Loader2, Key, CheckCircle, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export function ProfileSecurityForm() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const supabase = useMemo(() => createClient(), []);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'A senha deve ter pelo menos 6 caracteres.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'As senhas não coincidem.' });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      setMessage({ type: 'success', text: 'Senha alterada com sucesso!' });
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error('Error updating password:', err);
      setMessage({ type: 'error', text: err.message || 'Erro ao alterar senha.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-800">
        <Shield className="text-[#13daec] shrink-0" size={24} />
        <div>
          <h3 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-tight mb-1">Segurança da Conta</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Recomendamos o uso de uma senha forte com letras, números e símbolos.</p>
        </div>
      </div>

      <form onSubmit={handlePasswordChange} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-widest text-[10px]">Nova Senha</label>
            <div className="relative">
              <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
              <input 
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-2xl focus:ring-2 focus:ring-[#13daec] focus:border-transparent outline-none transition-all font-medium"
                placeholder="••••••••"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-widest text-[10px]">Confirmar Nova Senha</label>
            <div className="relative">
              <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
              <input 
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-2xl focus:ring-2 focus:ring-[#13daec] focus:border-transparent outline-none transition-all font-medium"
                placeholder="••••••••"
              />
            </div>
          </div>
        </div>

        {message && (
          <div className={`p-4 rounded-xl flex items-center gap-3 text-sm font-bold ${
            message.type === 'success' 
              ? "bg-green-50 text-green-700 border border-green-100" 
              : "bg-red-50 text-red-700 border border-red-100"
          }`}>
            {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            <span>{message.text}</span>
          </div>
        )}

        <div className="flex justify-end">
          <button 
            type="submit"
            disabled={loading}
            className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-all flex items-center gap-3 disabled:opacity-70 shadow-xl shadow-zinc-200 dark:shadow-none"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Shield size={18} />}
            Atualizar Senha
          </button>
        </div>
      </form>
    </div>
  );
}
