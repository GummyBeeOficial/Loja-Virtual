'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { 
  Users, 
  Shield, 
  Mail, 
  Save, 
  Loader2, 
  AlertCircle, 
  CheckCircle2,
  Search,
  Filter
} from 'lucide-react';
import { cn } from '@/lib/utils';

type UserRole = 'super_admin' | 'admin' | 'financeiro' | 'estoque' | 'atendimento' | 'user';

interface Profile {
  id: string;
  email: string;
  role: UserRole;
  updated_at: string;
}

const ROLES: { value: UserRole; label: string; description: string }[] = [
  { value: 'super_admin', label: 'Super Admin', description: 'Acesso total ao sistema' },
  { value: 'admin', label: 'Admin', description: 'Gerencia produtos, categorias e pedidos' },
  { value: 'financeiro', label: 'Financeiro', description: 'Visualiza e confirma pagamentos' },
  { value: 'estoque', label: 'Estoque', description: 'Gerencia inventário e produtos' },
  { value: 'atendimento', label: 'Atendimento', description: 'Gerencia status de pedidos' },
  { value: 'user', label: 'Usuário', description: 'Cliente padrão' },
];

export default function UsersManagementPage() {
  const { user: currentUser, role: currentUserRole, isStaff, loading: authLoading } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  const fetchProfiles = useCallback(async () => {
    if (!isStaff || (currentUserRole !== 'admin' && currentUserRole !== 'super_admin')) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, role, updated_at')
        .order('email');

      if (error) throw error;
      setProfiles(data || []);
    } catch (error: any) {
      console.error('Erro ao buscar perfis:', error);
      setMessage({ text: 'Falha ao carregar usuários.', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [isStaff, currentUserRole]);

  useEffect(() => {
    if (isStaff && (currentUserRole === 'admin' || currentUserRole === 'super_admin')) {
      fetchProfiles();
    }
  }, [isStaff, currentUserRole, fetchProfiles]);

  // Hierarchy check: can current user edit the target profile?
  const canEditProfile = (targetProfile: Profile) => {
    if (!currentUser || !currentUserRole) return false;
    
    // Cannot edit self
    if (targetProfile.id === currentUser.id) return false;
    
    // Super Admin can edit anyone (except self)
    if (currentUserRole === 'super_admin') return true;
    
    // Admin can only edit those who are NOT super_admin or admin
    if (currentUserRole === 'admin') {
      return targetProfile.role !== 'super_admin' && targetProfile.role !== 'admin';
    }
    
    return false;
  };

  // Get roles that the current user is allowed to assign
  const getAvailableRoles = (targetProfile: Profile) => {
    if (!currentUserRole) return [];
    
    if (currentUserRole === 'super_admin') {
      return ROLES; // Super admin can assign anything
    }
    
    if (currentUserRole === 'admin') {
      // Admin can only assign non-privileged roles
      // And only if the target is not already privileged (handled by canEditProfile)
      return ROLES.filter(r => r.value !== 'super_admin' && r.value !== 'admin');
    }
    
    return [];
  };

  const handleRoleChange = async (profileId: string, newRole: UserRole) => {
    const targetProfile = profiles.find(p => p.id === profileId);
    
    // Double check hierarchy before sending to API
    if (!targetProfile || !canEditProfile(targetProfile)) {
      setMessage({ text: 'Você não tem permissão para alterar este cargo.', type: 'error' });
      return;
    }

    // Check if the new role is allowed for the current user
    const availableRoles = getAvailableRoles(targetProfile);
    if (!availableRoles.find(r => r.value === newRole)) {
      setMessage({ text: 'Você não tem permissão para atribuir este cargo.', type: 'error' });
      return;
    }

    try {
      setSavingId(profileId);
      setMessage(null);

      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq('id', profileId);

      if (error) throw error;

      // Update local state only on success
      setProfiles(prev => prev.map(p => p.id === profileId ? { ...p, role: newRole } : p));
      setMessage({ text: 'Cargo atualizado com sucesso!', type: 'success' });
      
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      console.error('Erro ao atualizar cargo:', error);
      setMessage({ text: 'Erro ao atualizar cargo. Verifique suas permissões.', type: 'error' });
      // Re-fetch to ensure UI is in sync with DB
      fetchProfiles();
    } finally {
      setSavingId(null);
    }
  };

  const filteredProfiles = profiles.filter(profile => {
    const matchesSearch = profile.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || profile.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  if (authLoading) return null;
  if (!isStaff || (currentUserRole !== 'admin' && currentUserRole !== 'super_admin')) return null;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 animate-spin text-[#13daec] mb-4" />
        <p className="text-gray-500 dark:text-gray-400 font-medium">Carregando usuários...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Shield className="text-[#13daec]" />
            Gerenciamento de Cargos
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Controle o nível de acesso dos funcionários e administradores.
          </p>
        </div>
      </div>

      {/* Feedback Message */}
      {message && (
        <div className={cn(
          "p-4 rounded-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300",
          message.type === 'success' ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"
        )}>
          {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <span className="text-sm font-medium">{message.text}</span>
        </div>
      )}

      {/* Filters & Search */}
      <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
          <input 
            type="text"
            placeholder="Buscar por e-mail..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-[#13daec] transition-all text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-gray-400 dark:text-gray-500" />
          <select 
            className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#13daec] text-gray-900 dark:text-white"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="all">Todos os Cargos</option>
            {ROLES.map(role => (
              <option key={role.value} value={role.value}>{role.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Usuário</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cargo Atual</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Alterar Cargo</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredProfiles.length > 0 ? (
                filteredProfiles.map((profile) => (
                  <tr key={profile.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#13daec]/10 flex items-center justify-center text-[#13daec] font-bold">
                          {profile.email[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{profile.email}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">ID: {profile.id.substring(0, 8)}...</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                        profile.role === 'super_admin' ? "bg-purple-100 text-purple-800" :
                        profile.role === 'admin' ? "bg-blue-100 text-blue-800" :
                        profile.role === 'user' ? "bg-gray-100 text-gray-800" :
                        "bg-teal-100 text-teal-800"
                      )}>
                        {ROLES.find(r => r.value === profile.role)?.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <select 
                        className={cn(
                          "bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#13daec] transition-all text-gray-900 dark:text-white",
                          !canEditProfile(profile) && "opacity-50 cursor-not-allowed"
                        )}
                        value={profile.role}
                        onChange={(e) => {
                          const newRole = e.target.value as UserRole;
                          setProfiles(prev => prev.map(p => p.id === profile.id ? { ...p, role: newRole } : p));
                        }}
                        disabled={!canEditProfile(profile)}
                      >
                        {getAvailableRoles(profile).map(role => (
                          <option key={role.value} value={role.value}>
                            {role.label}
                          </option>
                        ))}
                        {/* If current role is not in available roles (e.g. admin looking at super_admin), show it as disabled option */}
                        {!getAvailableRoles(profile).find(r => r.value === profile.role) && (
                          <option value={profile.role} disabled>
                            {ROLES.find(r => r.value === profile.role)?.label}
                          </option>
                        )}
                      </select>
                      {profile.id === currentUser?.id && (
                        <p className="text-[10px] text-amber-600 mt-1 font-medium">Você não pode alterar seu próprio cargo.</p>
                      )}
                      {profile.id !== currentUser?.id && !canEditProfile(profile) && (
                        <p className="text-[10px] text-red-600 mt-1 font-medium">Nível de acesso insuficiente.</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleRoleChange(profile.id, profile.role)}
                        disabled={savingId === profile.id || !canEditProfile(profile)}
                        className={cn(
                          "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                          !canEditProfile(profile) 
                            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                            : "bg-[#13daec] text-white hover:bg-[#11c5d4] shadow-sm hover:shadow-md active:scale-95"
                        )}
                      >
                        {savingId === profile.id ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Save size={16} />
                        )}
                        Salvar
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                    Nenhum usuário encontrado com os filtros aplicados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role Descriptions Help */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {ROLES.map(role => (
          <div key={role.value} className="p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <div className={cn(
                "w-2 h-2 rounded-full",
                role.value === 'super_admin' ? "bg-purple-500" :
                role.value === 'admin' ? "bg-blue-500" :
                "bg-teal-500"
              )} />
              {role.label}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{role.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
