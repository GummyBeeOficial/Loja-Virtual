'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { 
  User, MapPin, Loader2, AlertCircle, CheckCircle, 
  LayoutDashboard, Package, Heart, Shield, Bell, 
  CreditCard as PaymentIcon, LogOut
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

// Componentes Refatorados
import { AccountSectionCard } from '@/components/profile/AccountSectionCard';
import { ProfilePersonalDataForm } from '@/components/profile/ProfilePersonalDataForm';
import { ProfileAddressForm } from '@/components/profile/ProfileAddressForm';
import { ProfileSecurityForm } from '@/components/profile/ProfileSecurityForm';
import { AccountOrdersSummary } from '@/components/profile/AccountOrdersSummary';

export default function ProfilePage() {
  const { user, role, isAdmin, isStaff, loading: authLoading, signOut } = useAuth();
  const router = useRouter();

  const getAdminLabel = (userRole: string | null) => {
    switch (userRole) {
      case 'super_admin':
      case 'admin':
        return 'Painel Admin';
      case 'estoque':
        return 'Painel de Estoque';
      case 'financeiro':
        return 'Painel Financeiro';
      case 'atendimento':
        return 'Painel de Atendimento';
      default:
        return 'Painel Admin';
    }
  };

  const getRoleBadgeLabel = (userRole: string | null) => {
    switch (userRole) {
      case 'super_admin':
        return 'Super Admin';
      case 'admin':
        return 'Administrador';
      case 'estoque':
        return 'Estoque';
      case 'financeiro':
        return 'Financeiro';
      case 'atendimento':
        return 'Atendimento';
      default:
        return 'Cliente';
    }
  };
  
  // Instância do Supabase estabilizada dentro do componente via useMemo
  const supabase = useMemo(() => createClient(), []);
  
  const [loading, setLoading] = useState(true);
  const [savingPersonal, setSavingPersonal] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [personalMessage, setPersonalMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [addressMessage, setAddressMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [activeSection, setActiveSection] = useState<string | null>('personal');
  
  // 1. Estados Separados por Seção
  const [personalData, setPersonalData] = useState({
    full_name: '',
    phone: '',
    cpf: '',
  });
  
  const [addressData, setAddressData] = useState({
    zip_code: '',
    address: '',
    address_number: '',
    address_complement: '',
    neighborhood: '',
    city: '',
    state: '',
  });

  // 2. Backups Separados para Cancelamento Independente
  const [personalBackup, setPersonalBackup] = useState(personalData);
  const [addressBackup, setAddressBackup] = useState(addressData);

  // 3. Estados de Edição Independentes
  const [isEditingPersonal, setIsEditingPersonal] = useState(false);
  const [isEditingAddress, setIsEditingAddress] = useState(false);

  // Redirecionamento se não estiver logado
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const fetchProfile = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const pData = {
          full_name: data.full_name || '',
          phone: data.phone || '',
          cpf: data.cpf || '',
        };
        const aData = {
          zip_code: data.zip_code || '',
          address: data.address || '',
          address_number: data.address_number || '',
          address_complement: data.address_complement || '',
          neighborhood: data.neighborhood || '',
          city: data.city || '',
          state: data.state || '',
        };
        
        setPersonalData(pData);
        setPersonalBackup(pData);
        setAddressData(aData);
        setAddressBackup(aData);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, supabase]);

  useEffect(() => {
    if (user && !authLoading) {
      fetchProfile();
    }
  }, [user, authLoading, fetchProfile]);

  // Handlers de Input
  const handlePersonalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPersonalData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setAddressData(prev => ({ ...prev, [name]: value }));
  };

  // 4. Lógica de Cancelamento Isolada
  const handleCancelPersonal = () => {
    setPersonalData(personalBackup);
    setIsEditingPersonal(false);
    setPersonalMessage(null);
  };

  const handleCancelAddress = () => {
    setAddressData(addressBackup);
    setIsEditingAddress(false);
    setAddressMessage(null);
  };

  // 5. Lógica de Salvamento Isolada
  const handleSavePersonal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSavingPersonal(true);
    setPersonalMessage(null);

    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          ...personalData,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
      
      setPersonalBackup(personalData);
      setIsEditingPersonal(false);
      setPersonalMessage({ type: 'success', text: 'Dados pessoais atualizados!' });
      setTimeout(() => setPersonalMessage(null), 3000);
    } catch (err: any) {
      setPersonalMessage({ type: 'error', text: 'Erro ao salvar dados pessoais.' });
    } finally {
      setSavingPersonal(false);
    }
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSavingAddress(true);
    setAddressMessage(null);

    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          ...addressData,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
      
      setAddressBackup(addressData);
      setIsEditingAddress(false);
      setAddressMessage({ type: 'success', text: 'Endereço atualizado com sucesso!' });
      setTimeout(() => setAddressMessage(null), 3000);
    } catch (err: any) {
      setAddressMessage({ type: 'error', text: 'Erro ao salvar endereço.' });
    } finally {
      setSavingAddress(false);
    }
  };

  const toggleSection = (section: string) => {
    setActiveSection(activeSection === section ? null : section);
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col transition-colors duration-300">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 animate-spin text-[#13daec]" />
            <p className="text-zinc-400 font-black uppercase tracking-widest text-[10px] animate-pulse">Sincronizando Conta...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col transition-colors duration-300">
      <Navbar />
      
      <main className="flex-1 pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-zinc-900 dark:bg-white rounded-3xl flex items-center justify-center text-white dark:text-zinc-900 text-3xl font-black shadow-2xl shadow-zinc-200 dark:shadow-none">
                {personalData.full_name ? personalData.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : <User size={32} />}
              </div>
              <div>
                <h1 className="text-4xl font-black text-zinc-900 dark:text-white tracking-tighter leading-none mb-2">
                  {personalData.full_name || 'MEU PERFIL'}
                </h1>
                <div className="flex items-center gap-3 text-zinc-500 dark:text-zinc-400 font-bold text-sm">
                  <span>{user?.email}</span>
                  <span className="w-1 h-1 bg-zinc-300 rounded-full"></span>
                  <span className="uppercase tracking-widest text-[10px] bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md">
                    {getRoleBadgeLabel(role)}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {isStaff && (
                <Link 
                  href="/admin" 
                  className="inline-flex items-center gap-2 bg-zinc-900 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-200 dark:shadow-none"
                >
                  <LayoutDashboard size={18} />
                  {getAdminLabel(role)}
                </Link>
              )}
              <button 
                onClick={handleSignOut}
                className="p-4 bg-white dark:bg-zinc-900 text-red-500 border border-zinc-200 dark:border-zinc-800 rounded-2xl hover:bg-red-50 dark:hover:bg-red-900/10 transition-all shadow-sm"
                title="Sair da Conta"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>

          {/* Account Sections */}
          <div className="space-y-6">
            <AccountSectionCard 
              id="orders" 
              title="Meus Pedidos" 
              icon={<Package size={20} />}
              isActive={activeSection === 'orders'}
              onToggle={() => toggleSection('orders')}
            >
              <AccountOrdersSummary userId={user?.id || ''} />
            </AccountSectionCard>

            <AccountSectionCard 
              id="personal" 
              title="Dados Pessoais" 
              icon={<User size={20} />}
              isActive={activeSection === 'personal'}
              onToggle={() => toggleSection('personal')}
            >
              <ProfilePersonalDataForm 
                formData={personalData}
                userEmail={user?.email || ''}
                saving={savingPersonal}
                message={personalMessage}
                isEditing={isEditingPersonal}
                onEdit={() => setIsEditingPersonal(true)}
                onCancel={handleCancelPersonal}
                onInputChange={handlePersonalChange}
                onSave={handleSavePersonal}
              />
            </AccountSectionCard>

            <AccountSectionCard 
              id="address" 
              title="Endereços" 
              icon={<MapPin size={20} />}
              isActive={activeSection === 'address'}
              onToggle={() => toggleSection('address')}
            >
              <ProfileAddressForm 
                formData={addressData}
                saving={savingAddress}
                message={addressMessage}
                isEditing={isEditingAddress}
                onEdit={() => setIsEditingAddress(true)}
                onCancel={handleCancelAddress}
                onInputChange={handleAddressChange}
                onSave={handleSaveAddress}
              />
            </AccountSectionCard>

            <AccountSectionCard 
              id="security" 
              title="Segurança" 
              icon={<Shield size={20} />}
              isActive={activeSection === 'security'}
              onToggle={() => toggleSection('security')}
            >
              <ProfileSecurityForm />
            </AccountSectionCard>

            <AccountSectionCard 
              id="wishlist" 
              title="Lista de Desejos" 
              icon={<Heart size={20} />}
              isActive={activeSection === 'wishlist'}
              onToggle={() => toggleSection('wishlist')}
              comingSoon
            >
              <div className="py-4 text-zinc-400 text-sm font-medium italic">
                Funcionalidade em desenvolvimento.
              </div>
            </AccountSectionCard>

            <AccountSectionCard 
              id="payments" 
              title="Pagamentos" 
              icon={<PaymentIcon size={20} />}
              isActive={activeSection === 'payments'}
              onToggle={() => toggleSection('payments')}
              comingSoon
            >
              <div className="py-4 text-zinc-400 text-sm font-medium italic">
                Gerenciamento de cartões em breve.
              </div>
            </AccountSectionCard>

            <AccountSectionCard 
              id="notifications" 
              title="Notificações" 
              icon={<Bell size={20} />}
              isActive={activeSection === 'notifications'}
              onToggle={() => toggleSection('notifications')}
              comingSoon
            >
              <div className="py-4 text-zinc-400 text-sm font-medium italic">
                Preferências de notificação em breve.
              </div>
            </AccountSectionCard>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
