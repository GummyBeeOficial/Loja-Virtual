'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Mail, 
  MoreVertical, 
  Loader2, 
  User, 
  MapPin, 
  ShoppingBag, 
  TrendingUp,
  CreditCard,
  Calendar,
  AlertCircle,
  RefreshCw,
  ArrowUpDown,
  ChevronDown,
  Phone,
  UserPlus,
  DollarSign,
  Hash
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Link from 'next/link';

// Interface alinhada com o retorno da RPC get_customers_summary
interface CustomerSummary {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  cpf: string | null;
  city: string | null;
  state: string | null;
  created_at: string;
  total_orders: number;
  total_spent: number | string;
  last_order_at?: string | null;
}

interface FetchError {
  message: string;
  details?: string;
  hint?: string;
  code?: string;
  status?: number;
}

import { useAuth } from '@/context/AuthContext';

export default function CustomersPage() {
  const { role, isStaff, loading: authLoading } = useAuth();
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<FetchError | null>(null);
  const [filter, setFilter] = useState<'all' | 'with_orders' | 'no_orders' | 'recurring'>('all');
  const [sortBy, setSortBy] = useState<'spent' | 'orders' | 'recent' | 'name'>('recent');

  const supabase = useMemo(() => createClient(), []);

  const RECURRING_THRESHOLD = 3;

  const fetchCustomers = useCallback(async () => {
    if (!isStaff || (role !== 'admin' && role !== 'super_admin' && role !== 'atendimento' && role !== 'financeiro')) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Chamada via RPC para máxima estabilidade e performance
      // A RPC get_customers_summary centraliza a lógica de agregação no banco
      const { data, error: fetchError } = await supabase.rpc('get_customers_summary');
      
      if (fetchError) {
        // Log detalhado para diagnóstico profissional conforme solicitado
        console.error('CustomersPage: Erro ao buscar sumário de clientes via RPC:', {
          message: fetchError.message,
          details: fetchError.details,
          hint: fetchError.hint,
          code: fetchError.code
        });
        
        setError({
          message: fetchError.message,
          details: fetchError.details,
          hint: fetchError.hint,
          code: fetchError.code
        });
        return;
      }

      setCustomers(data || []);
    } catch (err: any) {
      console.error('CustomersPage: Erro inesperado:', err);
      setError({
        message: err.message || 'Erro inesperado ao carregar a lista de clientes.',
        code: 'UNEXPECTED_ERROR'
      });
    } finally {
      setLoading(false);
    }
  }, [supabase, isStaff, role]);

  useEffect(() => {
    if (isStaff && (role === 'admin' || role === 'super_admin' || role === 'atendimento' || role === 'financeiro')) {
      fetchCustomers();
    }
  }, [isStaff, role, fetchCustomers]);

  // Filtro e Ordenação Local
  const processedCustomers = useMemo(() => {
    let result = [...customers];

    // 1. Search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(c => 
        c.full_name?.toLowerCase().includes(term) ||
        c.email?.toLowerCase().includes(term) ||
        c.cpf?.includes(term) ||
        c.phone?.includes(term)
      );
    }

    // 2. Filter
    if (filter === 'with_orders') {
      result = result.filter(c => c.total_orders > 0);
    } else if (filter === 'no_orders') {
      result = result.filter(c => c.total_orders === 0);
    } else if (filter === 'recurring') {
      result = result.filter(c => c.total_orders >= RECURRING_THRESHOLD);
    }

    // 3. Sort
    result.sort((a, b) => {
      if (sortBy === 'spent') return Number(b.total_spent) - Number(a.total_spent);
      if (sortBy === 'orders') return b.total_orders - a.total_orders;
      if (sortBy === 'name') return (a.full_name || '').localeCompare(b.full_name || '');
      // Default: recent
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return result;
  }, [customers, searchTerm, filter, sortBy]);

  // Formatação de moeda segura
  const formatCurrency = (value: number | string) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(Number(value || 0));
  };

  const getFilterLabel = (f: typeof filter) => {
    const labels = {
      all: 'Todos',
      with_orders: 'Com pedidos',
      no_orders: 'Sem pedidos',
      recurring: 'Recorrentes (3+ pedidos)'
    };
    return labels[f];
  };

  const getSortLabel = (s: typeof sortBy) => {
    const labels = {
      spent: 'Maior Gasto',
      orders: 'Mais Pedidos',
      recent: 'Mais Recente',
      name: 'Nome A-Z'
    };
    return labels[s];
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-white rounded-3xl border border-red-100 p-12 text-center shadow-sm mx-4">
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center text-red-500 mb-6">
          <AlertCircle size={40} />
        </div>
        <h2 className="text-2xl font-black text-gray-900 mb-2">Erro de Sincronização</h2>
        <p className="text-gray-500 mb-6 max-w-md">
          {error.message || 'Não foi possível carregar os dados dos clientes.'}
        </p>
        
        {error.code && (
          <div className="bg-gray-50 px-4 py-2 rounded-lg mb-8 font-mono text-[10px] text-gray-400 uppercase tracking-widest border border-gray-100">
            Code: {error.code} | Status: {error.status || 'N/A'}
          </div>
        )}

        <button 
          onClick={fetchCustomers}
          className="flex items-center gap-2 px-10 py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-gray-800 transition-all active:scale-95 shadow-xl shadow-gray-200"
        >
          <RefreshCw size={18} />
          Tentar Novamente
        </button>
      </div>
    );
  }

  if (authLoading) return null;
  if (!isStaff || (role !== 'admin' && role !== 'super_admin' && role !== 'atendimento' && role !== 'financeiro')) return null;

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 py-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight mb-1">Clientes</h1>
          <p className="text-gray-500 dark:text-gray-300 font-medium">Base de dados unificada com histórico financeiro e atividade.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchCustomers}
            disabled={loading}
            className="p-3 text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all disabled:opacity-50"
            title="Atualizar dados"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
          <div className="px-6 py-3 bg-gray-900 dark:bg-gray-800 rounded-2xl shadow-lg shadow-gray-200 dark:shadow-none text-sm font-black text-white flex items-center gap-3">
            <User size={16} className="text-gray-400 dark:text-gray-500" />
            {customers.length} Usuários Registrados
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row gap-4 justify-between items-center">
          <div className="relative w-full lg:flex-1">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={20} />
            <input 
              type="text" 
              placeholder="Buscar por nome, email, CPF ou telefone..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-14 pr-6 py-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white transition-all placeholder:text-gray-400 dark:placeholder:text-gray-400"
            />
          </div>
          
          <div className="flex flex-wrap gap-3 w-full lg:w-auto">
            {/* Filter Dropdown */}
            <div className="relative flex-1 lg:flex-none min-w-[160px]">
              <select 
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="w-full appearance-none pl-5 pr-12 py-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-black text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white transition-all cursor-pointer"
              >
                <option value="all">Todos os Clientes</option>
                <option value="with_orders">Com Pedidos</option>
                <option value="no_orders">Sem Pedidos</option>
                <option value="recurring">Clientes Recorrentes</option>
              </select>
              <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
            </div>

            {/* Sort Dropdown */}
            <div className="relative flex-1 lg:flex-none min-w-[160px]">
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full appearance-none pl-5 pr-12 py-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-black text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white transition-all cursor-pointer"
              >
                <option value="recent">Mais Recentes</option>
                <option value="spent">Maior Gasto (LTV)</option>
                <option value="orders">Mais Pedidos</option>
                <option value="name">Nome (A-Z)</option>
              </select>
              <ArrowUpDown className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
            </div>
          </div>
        </div>

        {/* Active Filters Summary */}
        {(searchTerm || filter !== 'all' || sortBy !== 'recent') && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-50 dark:border-gray-800">
            <span className="text-[10px] font-black text-gray-400 dark:text-gray-400 uppercase tracking-widest mr-2">Filtros Ativos:</span>
            {searchTerm && (
              <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-lg text-[10px] font-bold">Busca: &quot;{searchTerm}&quot;</span>
            )}
            {filter !== 'all' && (
              <span className="px-3 py-1 bg-gray-900 dark:bg-gray-800 text-white dark:text-gray-200 rounded-lg text-[10px] font-bold">{getFilterLabel(filter)}</span>
            )}
            {sortBy !== 'recent' && (
              <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-lg text-[10px] font-bold">Ordem: {getSortLabel(sortBy)}</span>
            )}
            <button 
              onClick={() => {
                setSearchTerm('');
                setFilter('all');
                setSortBy('recent');
              }}
              className="text-[10px] font-black text-red-500 hover:text-red-600 uppercase tracking-widest ml-auto"
            >
              Limpar Tudo
            </button>
          </div>
        )}
      </div>

      {/* Main Table Container */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-400">Identificação</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-400">Contato / Local</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-400">Atividade</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-400">Financeiro</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-8 py-32 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <Loader2 className="w-12 h-12 animate-spin text-gray-900 dark:text-white" />
                      <p className="text-gray-500 dark:text-gray-400 font-bold animate-pulse uppercase tracking-widest text-xs">Sincronizando base de dados...</p>
                    </div>
                  </td>
                </tr>
              ) : processedCustomers.length > 0 ? (
                processedCustomers.map((customer) => (
                  <tr key={customer.id} className="group hover:bg-gray-50/30 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="px-8 py-8">
                      <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-base font-black text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 group-hover:bg-white dark:group-hover:bg-gray-700 group-hover:shadow-md transition-all duration-300 relative">
                          {customer.full_name ? customer.full_name.split(' ').map((n: any) => n[0]).join('').substring(0, 2).toUpperCase() : <User size={24} />}
                          {customer.total_orders >= RECURRING_THRESHOLD && (
                            <div className="absolute -top-2 -right-2 w-6 h-6 bg-gray-900 dark:bg-gray-700 rounded-full flex items-center justify-center text-white border-2 border-white dark:border-gray-800 shadow-sm" title="Cliente Recorrente">
                              <RefreshCw size={10} />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-base font-black text-gray-900 dark:text-white leading-none mb-2">{customer.full_name || 'Usuário Sem Nome'}</p>
                          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-300">
                            <Mail size={14} className="text-gray-400 dark:text-gray-500" />
                            <p className="text-xs font-bold">{customer.email}</p>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-8">
                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                          {customer.cpf && (
                            <div className="flex items-center gap-2 text-[10px] font-black text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-lg uppercase tracking-tighter border border-gray-200 dark:border-gray-700">
                              <CreditCard size={12} />
                              {customer.cpf}
                            </div>
                          )}
                          {customer.phone && (
                            <div className="flex items-center gap-2 text-[10px] font-black text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-lg uppercase tracking-tighter border border-gray-200 dark:border-gray-700">
                              <Phone size={12} />
                              {customer.phone}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-300 font-bold">
                          <MapPin size={14} className="text-gray-400 dark:text-gray-500" />
                          {customer.city ? `${customer.city}, ${customer.state}` : 'Local não informado'}
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-8">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2.5 text-xs font-black text-gray-900 dark:text-white">
                          <ShoppingBag size={14} className="text-gray-400 dark:text-gray-500" />
                          {customer.total_orders} Pedidos Realizados
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-400 font-bold">
                          <Calendar size={14} />
                          {customer.last_order_at 
                            ? `Último em ${format(new Date(customer.last_order_at), 'dd/MM/yyyy', { locale: ptBR })}`
                            : `Membro desde ${format(new Date(customer.created_at), 'dd/MM/yyyy', { locale: ptBR })}`
                          }
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-8">
                      <div className="space-y-1.5">
                        <p className="text-lg font-black text-gray-900 dark:text-white tracking-tighter">{formatCurrency(customer.total_spent)}</p>
                        <div className="flex items-center gap-1.5 text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                          <TrendingUp size={12} />
                          LTV (Lifetime Value)
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-8 text-right">
                      <Link 
                        href={`/admin/customers/${customer.id}`}
                        className="w-12 h-12 inline-flex items-center justify-center rounded-2xl text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-all active:scale-90"
                      >
                        <MoreVertical size={24} />
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-8 py-32 text-center">
                    <div className="max-w-sm mx-auto">
                      <div className="w-24 h-24 bg-gray-50 dark:bg-gray-800 rounded-3xl flex items-center justify-center text-gray-200 dark:text-gray-700 mx-auto mb-6">
                        <Search size={48} />
                      </div>
                      <p className="text-gray-900 dark:text-white text-2xl font-black mb-2">Nenhum cliente encontrado</p>
                      <p className="text-gray-500 dark:text-gray-400 font-medium">Ajuste sua busca ou filtros para encontrar o que procura.</p>
                      <button 
                        onClick={() => {
                          setSearchTerm('');
                          setFilter('all');
                          setSortBy('recent');
                        }}
                        className="mt-6 text-sm font-black text-gray-900 dark:text-white underline underline-offset-4"
                      >
                        Limpar todos os filtros
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
