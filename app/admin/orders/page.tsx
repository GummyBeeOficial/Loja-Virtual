'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { 
  ShoppingCart, 
  Search, 
  Filter, 
  Loader2, 
  AlertCircle,
  Calendar,
  User,
  ExternalLink,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Clock,
  FileText,
  Truck,
  Package
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import OrderStatusBadge from '@/components/orders/order-status-badge';
import OrderStatusSelect from '@/components/admin/order-status-select';
import { useToast } from '@/context/ToastContext';

export default function AdminOrdersPage() {
  const { isStaff, loading: authLoading } = useAuth();
  const { addToast } = useToast();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [tab, setTab] = useState('active');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [bulkStatus, setBulkStatus] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowAdvancedFilters(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Função centralizada para buscar dados (sem join automático para evitar erro de schema cache)
  const fetchOrdersData = React.useCallback(async () => {
    if (!isStaff) return;
    
    const supabase = createClient();
    setLoading(true);
    setError(null);
    try {
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      let userIds: string[] = [];
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(searchTerm);

      // 1. Busca profiles se searchTerm não for UUID (Busca em 2 passos)
      if (searchTerm && !isUUID) {
        const { data: profilesSearch } = await supabase
          .from('profiles')
          .select('id')
          .or(`email.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%`);
          
        if (profilesSearch && profilesSearch.length > 0) {
          userIds = profilesSearch.map(p => p.id);
        }
      }

      // 2. Busca pedidos apenas de orders (sem join) com count de itens
      let query = supabase
        .from('orders')
        .select('id, total_amount, shipping_cost, status, created_at, user_id, internal_notes, shipping_type, estimated_delivery, tracking_code, cancellation_status, order_items(count)', { count: 'exact' });

      if (statusFilter === 'active') {
        query = query.in('status', ['pending', 'paid', 'processing', 'shipped']);
      } else if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      // Filtro de Data
      if (dateFilter !== 'all') {
        const now = new Date();
        let startDate = new Date();
        
        if (dateFilter === 'today') {
          startDate.setHours(0, 0, 0, 0);
        } else if (dateFilter === '7days') {
          startDate.setDate(now.getDate() - 7);
        } else if (dateFilter === '30days') {
          startDate.setDate(now.getDate() - 30);
        }
        
        query = query.gte('created_at', startDate.toISOString());
      }

      if (activeFilters.includes('with_notes')) {
        query = query.not('internal_notes', 'is', null).neq('internal_notes', '');
      }

      if (activeFilters.includes('no_tracking')) {
        query = query.or('tracking_code.is.null,tracking_code.eq.');
      }

      if (activeFilters.includes('no_shipping')) {
        query = query.is('shipping_type', null).is('estimated_delivery', null);
      }

      if (activeFilters.includes('cancellation_requested')) {
        query = query.eq('cancellation_status', 'requested');
      }

      if (searchTerm) {
        if (isUUID) {
          query = query.eq('id', searchTerm);
        } else if (userIds.length > 0) {
          query = query.in('user_id', userIds);
        } else {
          // Se não for UUID e não houver perfis correspondentes, força lista vazia
          query = query.eq('id', '00000000-0000-0000-0000-000000000000');
        }
      }

      query = query
        .order('created_at', { ascending: false })
        .range(from, to);

      const { data: ordersData, error: fetchError, count } = await query;

      if (fetchError) {
        console.error('Erro detalhado Supabase (Orders):', fetchError);
        const errorMsg = fetchError.message || 'Erro desconhecido';
        const errorDetails = fetchError.details ? ` (${fetchError.details})` : '';
        throw new Error(`${errorMsg}${errorDetails}`);
      }

      if (ordersData && ordersData.length > 0) {
        // 3. Extrair todos os user_id únicos para buscar perfis separadamente
        const currentOrderUserIds = Array.from(new Set(ordersData.map(o => o.user_id).filter(Boolean)));
        
        if (currentOrderUserIds.length > 0) {
          // 4. Segunda query em profiles usando .in('id', userIds)
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, email, full_name')
            .in('id', currentOrderUserIds);

          if (profilesError) {
            console.error('Erro ao buscar perfis:', profilesError);
          }

          // 5. Merge no frontend
          const profilesMap = (profilesData || []).reduce((acc: any, profile: any) => {
            acc[profile.id] = profile;
            return acc;
          }, {});

          const mergedOrders = ordersData.map(order => ({
            ...order,
            profiles: profilesMap[order.user_id] || { full_name: 'Cliente s/ nome', email: 'Sem e-mail' }
          }));
          setOrders(mergedOrders);
        } else {
          // Pedidos sem user_id (improvável mas possível)
          const fallbackOrders = ordersData.map(order => ({
            ...order,
            profiles: { full_name: 'Cliente s/ nome', email: 'Sem e-mail' }
          }));
          setOrders(fallbackOrders);
        }
      } else {
        setOrders([]);
      }
      
      setTotalCount(count || 0);
    } catch (err: any) {
      console.error('Erro ao buscar pedidos:', err);
      setError(err.message || 'Erro ao carregar pedidos');
      addToast('error', 'Erro ao carregar pedidos');
    } finally {
      setLoading(false);
    }
  }, [isStaff, currentPage, statusFilter, dateFilter, activeFilters, searchTerm, itemsPerPage, addToast]);

  // Busca automática com debounce
  useEffect(() => {
    if (isStaff) {
      const timer = setTimeout(() => {
        fetchOrdersData();
      }, searchTerm ? 500 : 0);
      return () => clearTimeout(timer);
    }
  }, [isStaff, fetchOrdersData, searchTerm]);

  // Função manual para o botão Atualizar
  const handleRefresh = () => {
    fetchOrdersData();
    addToast('success', 'Lista de pedidos atualizada');
  };

  // Resetar página ao mudar filtro ou busca
  useEffect(() => {
    setCurrentPage(1);
    setSelectedOrderIds(new Set());
  }, [statusFilter, dateFilter, searchTerm, activeFilters]);

  // Sincronizar abas com statusFilter
  useEffect(() => {
    const activeStatuses = ['pending', 'paid', 'processing', 'shipped'];
    if (statusFilter === 'active' || activeStatuses.includes(statusFilter)) {
      setTab('active');
    } else if (statusFilter === 'delivered') {
      setTab('delivered');
    } else if (statusFilter === 'cancelled') {
      setTab('cancelled');
    } else {
      setTab('all');
    }
  }, [statusFilter]);

  const handleBulkUpdate = async () => {
    if (!bulkStatus) return;

    setIsBulkUpdating(true);

    const supabase = createClient();

    for (const id of selectedOrderIds) {
      try {
        await supabase.rpc('update_order_status', {
          p_order_id: id,
          p_new_status: bulkStatus
        });
      } catch (err) {
        console.error('Erro no lote:', id, err);
      }
    }

    setSelectedOrderIds(new Set());
    setBulkStatus('');
    setIsBulkUpdating(false);

    fetchOrdersData();
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!isStaff) return null;

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter">Gerenciar Pedidos</h1>
          <p className="text-gray-500 dark:text-gray-400 font-medium">Acompanhe e atualize o status dos pedidos dos clientes.</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-xs font-bold uppercase tracking-widest text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-all shadow-sm disabled:opacity-50"
          >
            <RefreshCw size={14} className={cn(loading && "animate-spin")} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Abas Superiores de Status */}
      <div className="flex flex-wrap gap-2 mb-2 bg-white dark:bg-gray-900 p-2 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
        <button
          onClick={() => setStatusFilter('active')}
          className={cn(
            "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
            tab === 'active' 
              ? "bg-primary text-white shadow-lg shadow-primary/20" 
              : "text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800"
          )}
        >
          Ativos
        </button>
        <button
          onClick={() => setStatusFilter('delivered')}
          className={cn(
            "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
            tab === 'delivered' 
              ? "bg-primary text-white shadow-lg shadow-primary/20" 
              : "text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800"
          )}
        >
          Entregues
        </button>
        <button
          onClick={() => setStatusFilter('cancelled')}
          className={cn(
            "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
            tab === 'cancelled' 
              ? "bg-primary text-white shadow-lg shadow-primary/20" 
              : "text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800"
          )}
        >
          Cancelados
        </button>
        <button
          onClick={() => setStatusFilter('all')}
          className={cn(
            "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
            tab === 'all' 
              ? "bg-primary text-white shadow-lg shadow-primary/20" 
              : "text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800"
          )}
        >
          Todos
        </button>
      </div>

      {/* Filtros e Busca */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="md:col-span-2 lg:col-span-2 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
          <input 
            type="text"
            placeholder="Buscar por ID, nome ou e-mail do cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-400"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl appearance-none focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all font-bold uppercase tracking-widest text-xs text-gray-900 dark:text-white"
          >
            <option value="all">Todos os Status</option>
            <option value="active">Ativos</option>
            <option value="pending">Pendentes</option>
            <option value="paid">Pagos</option>
            <option value="processing">Processando</option>
            <option value="shipped">Enviados</option>
            <option value="delivered">Entregues</option>
            <option value="cancelled">Cancelados</option>
          </select>
        </div>
        <div className="relative">
          <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
          <select 
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl appearance-none focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all font-bold uppercase tracking-widest text-xs text-gray-900 dark:text-white"
          >
            <option value="all">Qualquer data</option>
            <option value="today">Hoje</option>
            <option value="7days">Últimos 7 dias</option>
            <option value="30days">Últimos 30 dias</option>
          </select>
        </div>
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={cn(
              "w-full h-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl transition-all font-bold uppercase tracking-widest text-[10px] z-20",
              activeFilters.length > 0 ? "text-primary border-primary/30" : "text-gray-600 dark:text-gray-300",
              showAdvancedFilters && "ring-2 ring-primary border-transparent"
            )}
          >
            <div className="flex items-center gap-2">
              <Filter size={16} />
              <span>Filtros avançados {activeFilters.length > 0 && `(${activeFilters.length})`}</span>
            </div>
          </button>

          {showAdvancedFilters && (
            <div className="absolute right-0 top-full mt-2 w-64 p-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-xl shadow-gray-200/50 dark:shadow-black/50 z-30 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-50 dark:border-gray-800">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Operacionais</span>
                {activeFilters.length > 0 && (
                  <button 
                    onClick={() => {
                      setActiveFilters([]);
                      setShowAdvancedFilters(false);
                    }}
                    className="text-[10px] font-bold text-primary hover:underline transition-all"
                  >
                    Limpar filtros
                  </button>
                )}
              </div>
                <div className="flex flex-col gap-3">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={activeFilters.includes('with_notes')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setActiveFilters([...activeFilters.filter(f => f !== 'with_notes'), 'with_notes']);
                        } else {
                          setActiveFilters(activeFilters.filter(f => f !== 'with_notes'));
                        }
                      }}
                      className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                    />
                    <span className="text-xs font-bold uppercase tracking-tight text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">Com nota</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={activeFilters.includes('no_tracking')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setActiveFilters([...activeFilters.filter(f => f !== 'no_tracking'), 'no_tracking']);
                        } else {
                          setActiveFilters(activeFilters.filter(f => f !== 'no_tracking'));
                        }
                      }}
                      className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                    />
                    <span className="text-xs font-bold uppercase tracking-tight text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">Sem rastreio</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={activeFilters.includes('no_shipping')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setActiveFilters([...activeFilters.filter(f => f !== 'no_shipping'), 'no_shipping']);
                        } else {
                          setActiveFilters(activeFilters.filter(f => f !== 'no_shipping'));
                        }
                      }}
                      className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                    />
                    <span className="text-xs font-bold uppercase tracking-tight text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">Sem logística</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={activeFilters.includes('cancellation_requested')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setActiveFilters([...activeFilters.filter(f => f !== 'cancellation_requested'), 'cancellation_requested']);
                        } else {
                          setActiveFilters(activeFilters.filter(f => f !== 'cancellation_requested'));
                        }
                      }}
                      className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                    />
                    <span className="text-xs font-bold uppercase tracking-tight text-red-500 group-hover:text-red-600 transition-colors">Cancelamento</span>
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>

      {/* Barra de ações em lote */}
      {selectedOrderIds.size > 0 && (
        <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-800 p-4 rounded-xl animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-4">
            <span className="text-sm font-bold text-gray-900 dark:text-white">
              {selectedOrderIds.size} selecionados
            </span>
            <button 
              onClick={() => setSelectedOrderIds(new Set())}
              className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Limpar seleção
            </button>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value)}
              disabled={isBulkUpdating}
              className="px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-primary outline-none transition-all disabled:opacity-50"
            >
              <option value="">Alterar status para...</option>
              <option value="paid">Pago</option>
              <option value="processing">Processando</option>
              <option value="shipped">Enviado</option>
              <option value="delivered">Entregue</option>
              <option value="cancelled">Cancelado</option>
            </select>

            <button
              onClick={handleBulkUpdate}
              disabled={!bulkStatus || isBulkUpdating}
              className="flex items-center gap-2 px-6 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {isBulkUpdating ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Processando...
                </>
              ) : (
                'Aplicar em lote'
              )}
            </button>
          </div>
        </div>
      )}

      {/* Lista de Pedidos */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        {loading && orders.length === 0 ? (
          <div className="p-20 flex flex-col items-center justify-center">
            <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
            <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Carregando pedidos...</p>
          </div>
        ) : error ? (
          <div className="p-20 flex flex-col items-center justify-center text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mb-4 opacity-20" />
            <p className="text-gray-900 dark:text-white font-bold mb-2">Erro ao carregar pedidos</p>
            <p className="text-gray-500 text-sm max-w-xs">{error}</p>
            <button 
              onClick={handleRefresh}
              className="mt-6 px-6 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-bold uppercase tracking-widest text-[10px]"
            >
              Tentar Novamente
            </button>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-20 flex flex-col items-center justify-center text-center">
            <ShoppingCart className="w-12 h-12 text-gray-300 mb-4 opacity-20" />
            <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Nenhum pedido encontrado</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-50 dark:border-gray-800">
                    <th className="px-6 py-4 w-10">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                        checked={orders.length > 0 && selectedOrderIds.size === orders.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedOrderIds(new Set(orders.map(o => o.id)));
                          } else {
                            setSelectedOrderIds(new Set());
                          }
                        }}
                      />
                    </th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-400">ID / Data</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-400">Cliente</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-400">Valor / Itens</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-400">Status</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-400">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {orders.map((order) => (
                    <tr key={order.id} className={cn(
                      "hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors group",
                      selectedOrderIds.has(order.id) && "bg-primary/5 dark:bg-primary/10"
                    )}>
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                          checked={selectedOrderIds.has(order.id)}
                          onChange={(e) => {
                            const newSet = new Set(selectedOrderIds);
                            if (e.target.checked) {
                              newSet.add(order.id);
                            } else {
                              newSet.delete(order.id);
                            }
                            setSelectedOrderIds(newSet);
                          }}
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-gray-900 dark:text-white">#{order.id.substring(0, 8).toUpperCase()}</span>
                          <span className="text-[10px] text-gray-400 dark:text-gray-400 font-bold uppercase flex items-center gap-1">
                            <Calendar size={10} />
                            {new Date(order.created_at).toLocaleDateString('pt-BR')}
                          </span>
                          <div className="flex items-center gap-2 mt-1">
                            {order.internal_notes && (
                              <span title="Possui nota interna">
                                <FileText size={12} className="text-gray-400" />
                              </span>
                            )}
                            {(order.shipping_type || order.estimated_delivery) && (
                              <span title="Logística preenchida">
                                <Truck size={12} className="text-gray-400" />
                              </span>
                            )}
                            {order.tracking_code && (
                              <span title="Possui rastreio">
                                <Package size={12} className="text-gray-400" />
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col max-w-[200px]">
                          <span className="text-sm font-bold text-gray-900 dark:text-white truncate">
                            {order.profiles?.full_name || 'Cliente s/ nome'}
                          </span>
                          <span className="text-[10px] text-gray-400 dark:text-gray-400 font-bold truncate flex items-center gap-1">
                            <User size={10} />
                            {order.profiles?.email}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-gray-900 dark:text-white">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.total_amount)}
                          </span>
                          <span className="text-[10px] text-gray-400 dark:text-gray-400 font-bold uppercase">
                            {order.order_items?.[0]?.count || 0} {order.order_items?.[0]?.count === 1 ? 'item' : 'itens'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <OrderStatusBadge status={order.status} />
                          {order.cancellation_status === 'requested' && (
                            <span title="Cancelamento solicitado">
                              <AlertCircle size={14} className="text-amber-500 animate-pulse" />
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <OrderStatusSelect 
                            orderId={order.id} 
                            currentStatus={order.status}
                            onUpdate={(newStatus) => {
                              setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: newStatus } : o));
                            }}
                            className="w-40"
                          />
                          <Link 
                            href={`/admin/orders/${order.id}`}
                            className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
                          >
                            <ExternalLink size={14} />
                            Ver
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-50 dark:border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50/30 dark:bg-gray-800/10">
                <div className="text-[10px] font-bold text-gray-400 dark:text-gray-400 uppercase tracking-widest">
                  Exibindo <span className="text-gray-900 dark:text-white">{orders.length}</span> de <span className="text-gray-900 dark:text-white">{totalCount}</span> pedidos
                </div>
                
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1 || loading}
                    className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-30 transition-colors"
                    title="Primeira Página"
                  >
                    <ChevronsLeft size={16} />
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1 || loading}
                    className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-30 transition-colors"
                    title="Anterior"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  
                  <div className="flex items-center px-4 py-1 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-lg shadow-sm">
                    <span className="text-xs font-black text-gray-900 dark:text-white">
                      {currentPage} <span className="text-gray-400 font-bold mx-1">/</span> {totalPages}
                    </span>
                  </div>

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages || loading}
                    className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-30 transition-colors"
                    title="Próxima"
                  >
                    <ChevronRight size={16} />
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages || loading}
                    className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-30 transition-colors"
                    title="Última Página"
                  >
                    <ChevronsRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
