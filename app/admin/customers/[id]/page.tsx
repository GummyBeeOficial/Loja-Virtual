'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  User, 
  MapPin, 
  ShoppingBag, 
  TrendingUp, 
  Calendar, 
  ArrowLeft, 
  Loader2, 
  AlertCircle,
  CreditCard,
  Mail,
  Phone,
  Clock,
  ExternalLink,
  DollarSign,
  Hash
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Link from 'next/link';

// Interfaces
interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  cpf: string | null;
  zip_code: string | null;
  address: string | null;
  address_number: string | null;
  address_complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  updated_at: string | null;
  email?: string; 
}

interface Order {
  id: string;
  created_at: string;
  status: string;
  total_amount: number;
  user_id: string;
}

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  
  const supabase = useMemo(() => createClient(), []);
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCustomerData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch Profile
      // Tentamos buscar o email também, caso exista na tabela profiles (comum em triggers de sync)
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profileData) {
        setError('Cliente não encontrado.');
        return;
      }

      // 2. Fetch Orders
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', id)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      setProfile(profileData);
      setOrders(ordersData || []);
    } catch (err: any) {
      console.error('Error fetching customer data:', err);
      setError(err.message || 'Erro ao carregar dados do cliente.');
    } finally {
      setLoading(false);
    }
  }, [id, supabase]);

  useEffect(() => {
    if (id) {
      fetchCustomerData();
    }
  }, [id, fetchCustomerData]);

  // Cálculos de Métricas
  const totalSpent = orders.reduce((acc, order) => acc + (Number(order.total_amount) || 0), 0);
  const orderCount = orders.length;
  const averageTicket = orderCount > 0 ? totalSpent / orderCount : 0;
  const lastOrderDate = orders.length > 0 ? orders[0].created_at : null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-amber-100 text-amber-700 border-amber-200',
      paid: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      shipped: 'bg-blue-100 text-blue-700 border-blue-200',
      delivered: 'bg-purple-100 text-purple-700 border-purple-200',
      cancelled: 'bg-red-100 text-red-700 border-red-200',
    };
    
    const labels: Record<string, string> = {
      pending: 'Pendente',
      paid: 'Pago',
      shipped: 'Enviado',
      delivered: 'Entregue',
      cancelled: 'Cancelado',
    };

    return (
      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${styles[status] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
        {labels[status] || status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-12 h-12 animate-spin text-gray-900 dark:text-white mb-4" />
        <p className="text-gray-500 dark:text-gray-400 font-bold animate-pulse uppercase tracking-widest text-xs">Carregando dossiê do cliente...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-12 text-center shadow-sm">
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center text-red-500 mb-6">
          <AlertCircle size={40} />
        </div>
        <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Ops! Algo deu errado</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md">{error || 'Cliente não encontrado.'}</p>
        <button 
          onClick={() => router.back()}
          className="flex items-center gap-2 px-8 py-4 bg-gray-900 dark:bg-gray-800 text-white rounded-2xl font-bold hover:bg-gray-800 dark:hover:bg-gray-700 transition-all"
        >
          <ArrowLeft size={18} />
          Voltar para Lista
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Navigation & Header */}
      <div className="flex flex-col gap-6">
        <button 
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-bold text-sm transition-colors w-fit"
        >
          <ArrowLeft size={16} />
          Voltar para Clientes
        </button>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">Cliente</h1>
              <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-lg text-[10px] font-black uppercase tracking-widest border border-gray-200 dark:border-gray-700">
                ID: {profile.id.substring(0, 8)}...
              </span>
            </div>
            <p className="text-gray-500 dark:text-gray-400 font-medium">Visão detalhada do perfil, histórico de compras e métricas de consumo.</p>
          </div>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-all group">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
              <TrendingUp size={24} />
            </div>
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-xs font-black uppercase tracking-widest mb-1">Total Gasto</p>
          <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter">{formatCurrency(totalSpent)}</h3>
        </div>

        <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-all group">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
              <ShoppingBag size={24} />
            </div>
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-xs font-black uppercase tracking-widest mb-1">Pedidos</p>
          <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter">{orderCount}</h3>
        </div>

        <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-all group">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/20 rounded-2xl flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
              <DollarSign size={24} />
            </div>
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-xs font-black uppercase tracking-widest mb-1">Ticket Médio</p>
          <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter">{formatCurrency(averageTicket)}</h3>
        </div>

        <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-all group">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/20 rounded-2xl flex items-center justify-center text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">
              <Calendar size={24} />
            </div>
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-xs font-black uppercase tracking-widest mb-1">Último Pedido</p>
          <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter">
            {lastOrderDate ? format(new Date(lastOrderDate), 'dd/MM/yyyy', { locale: ptBR }) : 'N/A'}
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Customer Data & Address */}
        <div className="lg:col-span-1 space-y-8">
          {/* Customer Data */}
          <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 flex items-center gap-3">
              <User size={18} className="text-gray-400 dark:text-gray-500" />
              <h2 className="font-black text-gray-900 dark:text-white uppercase tracking-widest text-xs">Dados do Cliente</h2>
            </div>
            <div className="p-8 space-y-6">
              <div>
                <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5">Nome Completo</p>
                <p className="text-gray-900 dark:text-white font-bold">{profile.full_name || 'Não informado'}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5">E-mail</p>
                <div className="flex items-center gap-2 text-gray-900 dark:text-white font-bold">
                  <Mail size={14} className="text-gray-400 dark:text-gray-500" />
                  {profile.email || 'Não informado'}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5">CPF</p>
                <div className="flex items-center gap-2 text-gray-900 dark:text-white font-bold">
                  <CreditCard size={14} className="text-gray-400 dark:text-gray-500" />
                  {profile.cpf || 'Não informado'}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5">Telefone</p>
                <div className="flex items-center gap-2 text-gray-900 dark:text-white font-bold">
                  <Phone size={14} className="text-gray-400 dark:text-gray-500" />
                  {profile.phone || 'Não informado'}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5">Última Atualização</p>
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm font-medium">
                  <Clock size={14} className="text-gray-400 dark:text-gray-500" />
                  {profile.updated_at ? format(new Date(profile.updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : 'N/A'}
                </div>
              </div>
            </div>
          </div>

          {/* Address Data */}
          <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 flex items-center gap-3">
              <MapPin size={18} className="text-gray-400 dark:text-gray-500" />
              <h2 className="font-black text-gray-900 dark:text-white uppercase tracking-widest text-xs">Endereço de Entrega</h2>
            </div>
            <div className="p-8 space-y-6">
              <div>
                <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5">Logradouro</p>
                <p className="text-gray-900 dark:text-white font-bold">
                  {profile.address ? `${profile.address}, ${profile.address_number}` : 'Não informado'}
                </p>
                {profile.address_complement && (
                  <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{profile.address_complement}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5">Bairro</p>
                  <p className="text-gray-900 dark:text-white font-bold">{profile.neighborhood || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5">CEP</p>
                  <p className="text-gray-900 dark:text-white font-bold">{profile.zip_code || 'N/A'}</p>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5">Cidade / Estado</p>
                <p className="text-gray-900 dark:text-white font-bold">
                  {profile.city ? `${profile.city} - ${profile.state}` : 'Não informado'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Order History */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden h-full flex flex-col">
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShoppingBag size={18} className="text-gray-400 dark:text-gray-500" />
                <h2 className="font-black text-gray-900 dark:text-white uppercase tracking-widest text-xs">Histórico de Pedidos</h2>
              </div>
              <span className="px-2.5 py-1 bg-gray-900 dark:bg-gray-800 text-white rounded-lg text-[10px] font-black tracking-widest">
                {orders.length}
              </span>
            </div>
            
            <div className="flex-1 overflow-x-auto">
              {orders.length > 0 ? (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/30 dark:bg-gray-800/30 border-b border-gray-100 dark:border-gray-800">
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Pedido</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Data</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Status</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Total</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                    {orders.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2">
                            <Hash size={14} className="text-gray-300 dark:text-gray-600" />
                            <span className="text-sm font-black text-gray-900 dark:text-white">{order.id.substring(0, 8).toUpperCase()}</span>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                            {format(new Date(order.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          {getStatusBadge(order.status)}
                        </td>
                        <td className="px-6 py-5">
                          <span className="text-sm font-black text-gray-900 dark:text-white">{formatCurrency(Number(order.total_amount))}</span>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <Link 
                            href={`/admin/orders/${order.id}`}
                            className="inline-flex items-center gap-2 text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white font-black uppercase tracking-widest text-[10px] transition-colors"
                          >
                            Ver Detalhes
                            <ExternalLink size={14} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                  <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-2xl flex items-center justify-center text-gray-200 dark:text-gray-700 mb-4">
                    <ShoppingBag size={32} />
                  </div>
                  <p className="text-gray-900 dark:text-white font-black text-lg mb-1">Nenhum pedido realizado</p>
                  <p className="text-gray-500 dark:text-gray-400 font-medium">Este cliente ainda não efetuou nenhuma compra no sistema.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
