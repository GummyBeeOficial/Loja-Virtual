'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { 
  TrendingUp, 
  ShoppingCart, 
  CheckCircle, 
  Clock, 
  Users, 
  Package, 
  AlertCircle, 
  Calendar,
  Filter,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  RefreshCcw,
  BarChart2,
  DollarSign,
  ArrowLeft
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import Link from 'next/link';

// ===============================================================
// TIPOS E CONFIGURAÇÕES
// ===============================================================

type Period = '7d' | '30d' | 'month' | 'year' | 'custom';

const VALID_SALE_STATUSES = ['paid', 'processing', 'shipped', 'delivered'];
const DEMAND_STATUSES = ['pending', 'cancelled', 'failed'];

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

// ===============================================================
// SUB-COMPONENTES
// ===============================================================

const StatCard = ({ title, value, icon: Icon, color, trend, trendValue }: any) => (
  <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 transition-all">
    <div className="flex justify-between items-start mb-4">
      <div className={cn("p-3 rounded-xl shadow-lg shadow-current/10", color)}>
        <Icon size={20} className="text-white" />
      </div>
      {trend && (
        <div className={cn(
          "flex items-center gap-1 text-[10px] font-black uppercase px-2 py-1 rounded-full",
          trend === 'up' ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/10" : "text-rose-600 bg-rose-50 dark:bg-rose-900/10"
        )}>
          {trend === 'up' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {trendValue}
        </div>
      )}
    </div>
    <div>
      <p className="text-[10px] text-gray-400 dark:text-gray-500 font-black uppercase tracking-widest mb-1">{title}</p>
      <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{value}</h3>
    </div>
  </div>
);

const TabButton = ({ active, onClick, label, icon: Icon }: any) => (
  <button
    onClick={onClick}
    className={cn(
      "flex items-center gap-2 px-6 py-3 text-sm font-bold transition-all border-b-2",
      active 
        ? "border-primary text-primary" 
        : "border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
    )}
  >
    <Icon size={16} />
    {label}
  </button>
);

// ===============================================================
// PÁGINA PRINCIPAL
// ===============================================================

function ReportsContent() {
  const { role, isStaff, loading: authLoading } = useAuth();
  const supabase = createClient();
  const searchParams = useSearchParams();
  
  const initialTab = searchParams.get('tab') || 'overview';
  const initialProductId = searchParams.get('productId');

  const [activeTab, setActiveTab] = useState(initialTab);
  const [period, setPeriod] = useState<Period>('30d');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Estados de Dados
  const [orders, setOrders] = useState<any[]>([]);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [customerCount, setCustomerCount] = useState(0);

  const fetchReportsData = React.useCallback(async (isManual = false) => {
    if (!isStaff) return;
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      // Definir datas com base no período
      const now = new Date();
      const endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);

      let startDate = new Date(now);

      if (period === '7d') startDate.setDate(now.getDate() - 7);
      else if (period === '30d') startDate.setDate(now.getDate() - 30);
      else if (period === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      } else if (period === 'year') {
        startDate = new Date(now.getFullYear(), 0, 1);
      } else if (period === 'custom') {
        startDate = new Date(selectedYear, selectedMonth, 1);
        // Pegar o último dia do mês selecionado
        const lastDay = new Date(selectedYear, selectedMonth + 1, 0);
        endDate.setFullYear(selectedYear, selectedMonth, lastDay.getDate());
      }

      startDate.setHours(0, 0, 0, 0);

      let ordersData: any[] = [];
      let itemsData: any[] = [];

      if (initialProductId) {
        // FLUXO INDIVIDUAL DE PRODUTO
        // 1. Buscar todos os items deste produto para pegar os order_ids
        const { data: allProductItems } = await supabase
          .from('order_items')
          .select('*, products(name)')
          .eq('product_id', initialProductId);

        if (allProductItems && allProductItems.length > 0) {
          const productOrderIds = Array.from(new Set(allProductItems.map(item => item.order_id)));

          // 2. Buscar pedidos que contém este produto dentro do período
          const { data: filteredOrders } = await supabase
            .from('orders')
            .select('*')
            .in('id', productOrderIds)
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString())
            .order('created_at', { ascending: true });

          ordersData = filteredOrders || [];

          // 3. Manter apenas os itens que pertencem aos pedidos filtrados pelo período
          const validOrderIds = new Set(ordersData.map(o => o.id));
          itemsData = allProductItems.filter(item => validOrderIds.has(item.order_id));
        }
      } else {
        // FLUXO GERAL
        // 1. Buscar Pedidos do período
        const { data: allOrders } = await supabase
          .from('orders')
          .select('*')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString())
          .order('created_at', { ascending: true });

        ordersData = allOrders || [];
        const orderIds = ordersData.map(o => o.id);

        // 2. Buscar Todos os Itens de Pedido do período
        if (orderIds.length > 0) {
          const { data: allItems } = await supabase
            .from('order_items')
            .select('*, products(name)')
            .in('order_id', orderIds);
          itemsData = allItems || [];
        }
      }

      // 3. Buscar Produtos (para estoque e catálogo)
      let productsQuery = supabase
        .from('products')
        .select('*, product_variants(*, product_sizes(*))');
        
      if (initialProductId) {
        productsQuery = productsQuery.eq('id', initialProductId);
      }
      
      const { data: productsData } = await productsQuery.order('name');

      // 4. Buscar Contagem de Clientes
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      setOrders(ordersData);
      setOrderItems(itemsData);
      setProducts(productsData || []);
      setCustomerCount(count || 0);

    } catch (error) {
      console.error('Erro ao carregar relatórios:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isStaff, period, selectedMonth, selectedYear, initialProductId, supabase]);

  useEffect(() => {
    if (!authLoading && isStaff) {
      fetchReportsData();
    }
  }, [authLoading, isStaff, period, fetchReportsData]);

  // Cálculos Derivados (Memoizados)
  const stats = useMemo(() => {
    // Se houver productId, filtrar as ordens que contém este produto
    let filteredOrders = orders;
    if (initialProductId) {
      const validOrderIdsForProduct = new Set(orderItems.map(item => item.order_id));
      filteredOrders = orders.filter(o => validOrderIdsForProduct.has(o.id));
    }

    const validOrders = filteredOrders.filter(o => VALID_SALE_STATUSES.includes(o.status));
    const validOrderIds = new Set(validOrders.map(o => o.id));

    // Cálculos de receita e unidades usando apenas itens dos pedidos válidos
    const relevantItems = orderItems.filter(item => validOrderIds.has(item.order_id));
    
    const totalRevenue = relevantItems.reduce((acc, item) => {
      return acc + ((item.price_at_time || 0) * (item.quantity || 0));
    }, 0);

    const totalItemsSold = relevantItems.reduce((acc, item) => acc + (item.quantity || 0), 0);
    
    // Ticket Médio conforme solicitado: faturamento / unidades
    const avgTicket = totalItemsSold > 0 ? totalRevenue / totalItemsSold : 0;
    
    // Estoque Baixo
    const lowStockItems = products.filter(p => p.stock_quantity <= (p.min_stock || 10));

    return {
      totalRevenue,
      validOrdersCount: validOrders.length,
      totalOrdersCount: filteredOrders.length,
      avgTicket,
      totalItemsSold,
      lowStockCount: lowStockItems.length
    };
  }, [orders, orderItems, products, initialProductId]);

  // Dados para Gráficos Financeiros
  const financialChartData = useMemo(() => {
    const dailyData: Record<string, number> = {};
    
    const validOrders = orders.filter(o => VALID_SALE_STATUSES.includes(o.status));
    let ordersToProcess = validOrders;

    if (initialProductId) {
       const validOrderIdsForProduct = new Set(orderItems.map(item => item.order_id));
       ordersToProcess = validOrders.filter(o => validOrderIdsForProduct.has(o.id));
    }

    ordersToProcess.forEach(order => {
      const date = new Date(order.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      
      let amountToAdd = order.total_amount || 0;
      if (initialProductId) {
        const productItems = orderItems.filter(item => item.order_id === order.id && item.product_id === initialProductId);
        amountToAdd = productItems.reduce((sum, item) => sum + ((item.price_at_time || 0) * (item.quantity || 0)), 0);
      }
      
      dailyData[date] = (dailyData[date] || 0) + amountToAdd;
    });

    return Object.entries(dailyData).map(([date, total]) => ({
      date,
      faturamento: total
    }));
  }, [orders, orderItems, initialProductId]);

  // Dados para Produtos Mais Vendidos
  const topProductsData = useMemo(() => {
    const productStats: Record<string, { name: string, quantity: number, revenue: number }> = {};
    
    // Se estiver filtrando por produto, já garante que ele apareça com 0 se não tiver vendas
    if (initialProductId && products.length > 0) {
      const product = products[0];
      productStats[product.id] = { name: product.name, quantity: 0, revenue: 0 };
    }

    const validOrderIds = new Set(orders.filter(o => VALID_SALE_STATUSES.includes(o.status)).map(o => o.id));
    
    orderItems.filter(item => validOrderIds.has(item.order_id)).forEach(item => {
      const productId = item.product_id;
      const name = item.products?.name || 'Desconhecido';
      
      if (!productStats[productId]) {
        productStats[productId] = { name, quantity: 0, revenue: 0 };
      }
      
      productStats[productId].quantity += (item.quantity || 0);
      const revenue = (item.price_at_time || 0) * (item.quantity || 0);
      productStats[productId].revenue += revenue;
    });

    return Object.values(productStats)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);
  }, [orders, orderItems, products, initialProductId]);

  // Dados para Produtos com maior interesse (Demanda)
  const topInterestData = useMemo(() => {
    const productStats: Record<string, { name: string, attempts: number, quantity: number, statuses: Record<string, number> }> = {};
    
    // Se estiver filtrando por produto, já garante que ele apareça
    if (initialProductId && products.length > 0) {
      const product = products[0];
      productStats[product.id] = { name: product.name, attempts: 0, quantity: 0, statuses: {} };
    }

    const demandOrders = orders.filter(o => DEMAND_STATUSES.includes(o.status));
    const demandOrderMap = new Map(demandOrders.map(o => [o.id, o.status]));
    
    orderItems.filter(item => demandOrderMap.has(item.order_id)).forEach(item => {
      const productId = item.product_id;
      const name = item.products?.name || 'Desconhecido';
      const status = demandOrderMap.get(item.order_id) || 'desconhecido';
      
      if (!productStats[productId]) {
        productStats[productId] = { name, attempts: 0, quantity: 0, statuses: {} };
      }
      
      productStats[productId].attempts += 1;
      productStats[productId].quantity += (item.quantity || 0);
      productStats[productId].statuses[status] = (productStats[productId].statuses[status] || 0) + 1;
    });

    return Object.values(productStats).map(p => {
      // Encontrar status mais comum
      const commonStatus = Object.entries(p.statuses).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';
      return {
        ...p,
        commonStatus
      };
    })
      .sort((a, b) => b.attempts - a.attempts)
      .slice(0, 10);
  }, [orders, orderItems, products, initialProductId]);

  // Cores para Gráficos
  const COLORS = ['#2271b1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  if (authLoading || (loading && !refreshing)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
        <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Preparando relatórios...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          {initialProductId && products[0] ? (
            <div className="space-y-1">
              <Link 
                href="/admin/reports" 
                className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-primary transition-colors mb-2"
              >
                <ArrowLeft size={12} />
                Voltar para visão geral
              </Link>
              <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter">
                Relatórios do Produto: <span className="text-primary">{products[0]?.name}</span>
              </h1>
            </div>
          ) : (
            <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter">Relatórios</h1>
          )}
          <p className="text-gray-500 dark:text-gray-400 font-medium">
            {initialProductId ? 'Análise individual de performance, vendas e interesse.' : 'Análise detalhada do seu e-commerce.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1 bg-white dark:bg-gray-900 p-1 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
            {(['7d', '30d', 'month', 'year'] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  "px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all",
                  period === p 
                    ? "bg-primary text-white shadow-md shadow-primary/20" 
                    : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                )}
              >
                {p === '7d' ? 'Últimos 7 Dias' : p === '30d' ? 'Últimos 30 Dias' : p === 'month' ? 'Mês Atual' : 'Ano Atual'}
              </button>
            ))}
          </div>

          <div className={cn(
            "flex items-center gap-2 bg-white dark:bg-gray-900 p-1 rounded-2xl shadow-sm border transition-all relative group",
            period === 'custom' 
              ? "border-primary ring-1 ring-primary/20 shadow-lg shadow-primary/5" 
              : "border-gray-100 dark:border-gray-800 hover:border-primary/50"
          )}>
            <div className="flex items-center gap-2 pl-2">
              <Filter size={14} className={cn(period === 'custom' ? "text-primary" : "text-gray-400")} />
              {period === 'custom' && (
                <span className="text-[9px] font-black uppercase text-primary tracking-tighter absolute -top-5 left-2">
                  Período Personalizado
                </span>
              )}
            </div>
            <select
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(parseInt(e.target.value));
                setPeriod('custom');
              }}
              className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 focus:text-primary dark:focus:text-primary py-1 focus:ring-0 cursor-pointer outline-none"
            >
              {MONTHS.map((m, i) => (
                <option key={m} value={i} className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">{m}</option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(parseInt(e.target.value));
                setPeriod('custom');
              }}
              className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 focus:text-primary dark:focus:text-primary py-1 focus:ring-0 cursor-pointer pr-4 outline-none"
            >
              {[new Date().getFullYear(), new Date().getFullYear() - 1].map(y => (
                <option key={y} value={y} className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">{y}</option>
              ))}
            </select>
          </div>

          <div className="w-px h-6 bg-gray-100 dark:bg-gray-800 hidden md:block" />
          <button 
            onClick={() => fetchReportsData(true)}
            disabled={refreshing}
            className="p-3 text-gray-400 hover:text-primary transition-all rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800"
          >
            <RefreshCcw size={16} className={cn(refreshing && "animate-spin")} />
          </button>
        </div>
      </div>

      {period === 'custom' && (
        <div className="flex items-center gap-2 px-4 py-2 bg-primary/5 rounded-xl border border-primary/10 animate-in slide-in-from-top-2 duration-300">
          <Calendar size={14} className="text-primary" />
          <p className="text-xs font-bold text-primary tracking-tight">
            Exibindo dados de: <span className="font-black underline decoration-primary/30 underline-offset-4">{MONTHS[selectedMonth]} de {selectedYear}</span>
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-800">
        <TabButton 
          active={activeTab === 'overview'} 
          onClick={() => setActiveTab('overview')} 
          label="Visão Geral" 
          icon={BarChart2} 
        />
        <TabButton 
          active={activeTab === 'finance'} 
          onClick={() => setActiveTab('finance')} 
          label="Financeiro" 
          icon={DollarSign} 
        />
        <TabButton 
          active={activeTab === 'products'} 
          onClick={() => setActiveTab('products')} 
          label="Produtos" 
          icon={Package} 
        />
        <TabButton 
          active={activeTab === 'inventory'} 
          onClick={() => setActiveTab('inventory')} 
          label="Estoque" 
          icon={AlertCircle} 
        />
      </div>

      {/* Overview Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <StatCard 
              title="Faturamento" 
              value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.totalRevenue)} 
              icon={TrendingUp} 
              color="bg-emerald-500" 
            />
            <StatCard 
              title="Vendas Válidas" 
              value={stats.validOrdersCount} 
              icon={CheckCircle} 
              color="bg-green-600" 
            />
            <StatCard 
              title="Ticket Médio" 
              value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.avgTicket)} 
              icon={ShoppingCart} 
              color="bg-blue-500" 
            />
            <StatCard 
              title="Itens Vendidos" 
              value={stats.totalItemsSold} 
              icon={Package} 
              color="bg-purple-500" 
            />
            <StatCard 
              title="Clientes" 
              value={customerCount} 
              icon={Users} 
              color="bg-orange-500" 
            />
            <StatCard 
              title="Estoque Baixo" 
              value={stats.lowStockCount} 
              icon={AlertCircle} 
              color="bg-rose-500" 
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Resumo de Faturamento Diário */}
            <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
              <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest mb-8">Faturamento Diário</h3>
              <div className="h-80 w-full">
                {financialChartData.length === 0 ? (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50/50 dark:bg-gray-800/20 rounded-2xl border-2 border-dashed border-gray-100 dark:border-gray-800">
                    <TrendingUp size={48} className="text-gray-200 dark:text-gray-700 mb-4" />
                    <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest text-center px-4">Nenhuma venda no período selecionado</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={financialChartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" className="dark:opacity-5" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 10, fontWeight: 'bold'}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 10, fontWeight: 'bold'}} />
                      <Tooltip 
                        cursor={{fill: '#f9fafb', opacity: 0.1}}
                        contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', backgroundColor: '#111827'}}
                        itemStyle={{color: '#fff', fontSize: '12px', fontWeight: 'bold'}}
                        labelStyle={{color: '#6b7280', fontSize: '9px', marginBottom: '8px', textTransform: 'uppercase', fontWeight: '900'}}
                        formatter={(val: any) => [new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val), "Vendas"]}
                      />
                      <Bar dataKey="faturamento" fill="#2271b1" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Top 5 Produtos */}
            <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
              <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest mb-8">Top 5 Produtos (Volume)</h3>
              <div className="space-y-6">
                {topProductsData.slice(0, 5).map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-800 text-xs font-black text-gray-400">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-primary transition-colors">{item.name}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase">{item.quantity} unidades vendidas</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-gray-900 dark:text-white">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.revenue)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Finance Tab Content */}
      {activeTab === 'finance' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
            <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest mb-8">Curva de Faturamento</h3>
            <div className="h-[400px] w-full">
              {financialChartData.length === 0 ? (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50/50 dark:bg-gray-800/20 rounded-2xl border-2 border-dashed border-gray-100 dark:border-gray-800">
                  <DollarSign size={48} className="text-gray-200 dark:text-gray-700 mb-4" />
                  <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest text-center px-4">Nenhuma venda no período selecionado</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={financialChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" className="dark:opacity-5" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 10, fontWeight: 'bold'}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 10, fontWeight: 'bold'}} />
                    <Tooltip 
                      contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', backgroundColor: '#111827'}}
                      itemStyle={{color: '#fff', fontSize: '12px', fontWeight: 'bold'}}
                      labelStyle={{color: '#6b7280', fontSize: '9px', marginBottom: '8px', textTransform: 'uppercase', fontWeight: '900'}}
                      formatter={(val: any) => [new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val), "Faturamento"]}
                    />
                    <Line type="monotone" dataKey="faturamento" stroke="#2271b1" strokeWidth={3} dot={{r: 4, fill: '#2271b1', strokeWidth: 0}} activeDot={{r: 6}} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
              <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest mb-6">Status dos Pedidos</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Válidos', value: orders.filter(o => VALID_SALE_STATUSES.includes(o.status)).length },
                        { name: 'Pendentes', value: orders.filter(o => o.status === 'pending').length },
                        { name: 'Cancelados', value: orders.filter(o => o.status === 'cancelled').length },
                        { name: 'Falhou', value: orders.filter(o => o.status === 'failed').length },
                      ]}
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {[0, 1, 2, 3].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
              <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest mb-6">Resumo Financeiro</h3>
              <div className="space-y-4">
                <div className="flex justify-between p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl">
                  <span className="text-[10px] font-black uppercase text-emerald-600">Receita Bruta</span>
                  <span className="text-sm font-black text-emerald-700 dark:text-emerald-400">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.totalRevenue)}
                  </span>
                </div>
                <div className="flex justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                  <span className="text-[10px] font-black uppercase text-gray-500">Pedidos Processados</span>
                  <span className="text-sm font-black text-gray-700 dark:text-gray-300">{stats.totalOrdersCount}</span>
                </div>
                <div className="flex justify-between p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl">
                  <span className="text-[10px] font-black uppercase text-blue-600">Ticket Médio</span>
                  <span className="text-sm font-black text-blue-700 dark:text-blue-400">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.avgTicket)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Products Tab Content */}
      {activeTab === 'products' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
            <div className="p-8 border-b border-gray-50 dark:border-gray-800 flex justify-between items-center">
              <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">Performance de Produtos</h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Top {topProductsData.length} itens no período</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 dark:bg-gray-800/50">
                  <tr>
                    <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Produto</th>
                    <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Unidades</th>
                    <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Faturamento</th>
                    <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Ticket Médio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {topProductsData.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                      <td className="px-8 py-4">
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{item.name}</p>
                      </td>
                      <td className="px-8 py-4 text-center">
                        <span className="text-xs font-black text-gray-600 dark:text-gray-400">{item.quantity}</span>
                      </td>
                      <td className="px-8 py-4 text-right">
                        <span className="text-xs font-black text-emerald-600">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.revenue)}
                        </span>
                      </td>
                      <td className="px-8 py-4 text-right">
                        <span className="text-xs font-bold text-gray-500">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.quantity > 0 ? item.revenue / item.quantity : 0)}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {topProductsData.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-8 py-20 text-center text-gray-400 text-xs font-bold uppercase tracking-widest">Nenhuma venda registrada no período selecionado.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
            <div className="p-8 border-b border-gray-50 dark:border-gray-800 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">Produtos com maior interesse</h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Baseado em pedidos pendentes, cancelados ou falhos</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 dark:bg-gray-800/50">
                  <tr>
                    <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Produto</th>
                    <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Tentativas</th>
                    <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Qtd Total</th>
                    <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Status Predominante</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {topInterestData.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                      <td className="px-8 py-4">
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{item.name}</p>
                      </td>
                      <td className="px-8 py-4 text-center">
                        <span className="text-xs font-black text-gray-600 dark:text-gray-400">{item.attempts}</span>
                      </td>
                      <td className="px-8 py-4 text-center">
                        <span className="text-xs font-black text-gray-600 dark:text-gray-400">{item.quantity}</span>
                      </td>
                      <td className="px-8 py-4 text-right">
                        <span className={cn(
                          "text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter",
                          item.commonStatus === 'pending' ? "bg-amber-100 text-amber-600" : 
                          item.commonStatus === 'cancelled' ? "bg-rose-100 text-rose-600" : 
                          "bg-gray-100 text-gray-600"
                        )}>
                          {item.commonStatus === 'pending' ? 'Pendente' : 
                          item.commonStatus === 'cancelled' ? 'Cancelado' : 
                          item.commonStatus === 'failed' ? 'Falhou' : item.commonStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {topInterestData.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-8 py-10 text-center text-gray-400 text-xs font-bold uppercase tracking-widest">Nenhuma demanda registrada no período.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Produtos sem Venda Válida */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
            <div className="p-8 border-b border-gray-50 dark:border-gray-800 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">Estoque Sem Movimento</h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Produtos sem nenhuma venda válida no período</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 dark:bg-gray-800/50">
                  <tr>
                    <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Produto</th>
                    <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">SKU</th>
                    <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Estoque Atual</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {products
                    .filter(p => {
                      const validOrderIds = new Set(orders.filter(o => VALID_SALE_STATUSES.includes(o.status)).map(o => o.id));
                      return !orderItems.some(item => item.product_id === p.id && validOrderIds.has(item.order_id));
                    })
                    .slice(0, 10)
                    .map((p, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                        <td className="px-8 py-4">
                          <p className="text-sm font-bold text-gray-900 dark:text-white">{p.name}</p>
                        </td>
                        <td className="px-8 py-4">
                          <span className="text-xs font-mono text-gray-500">-</span>
                        </td>
                        <td className="px-8 py-4 text-center">
                          <span className="text-sm font-black text-gray-900 dark:text-white">{p.stock_quantity}</span>
                        </td>
                      </tr>
                    ))}
                  {products.length > 0 && products.filter(p => {
                      const validOrderIds = new Set(orders.filter(o => VALID_SALE_STATUSES.includes(o.status)).map(o => o.id));
                      return !orderItems.some(item => item.product_id === p.id && validOrderIds.has(item.order_id));
                    }).length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-8 py-10 text-center text-emerald-600 text-xs font-bold uppercase tracking-widest">
                        {initialProductId ? 'Este produto teve vendas válidas no período!' : 'Todos os produtos tiveram pelo menos uma venda válida!'}
                      </td>
                    </tr>
                  )}
                  {products.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-8 py-10 text-center text-gray-400 text-xs font-bold uppercase tracking-widest">Nenhum produto encontrado.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Inventory Tab Content */}
      {activeTab === 'inventory' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Resumo de Estoque */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
                <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest mb-6">Status de Inventário</h3>
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total de Produtos</p>
                    <p className="text-2xl font-black text-gray-900 dark:text-white">{products.length}</p>
                  </div>
                  <div className="p-4 bg-rose-50 dark:bg-rose-900/10 rounded-xl">
                    <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1">Itens com Estoque Baixo</p>
                    <p className="text-2xl font-black text-rose-600">{stats.lowStockCount}</p>
                  </div>
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl">
                    <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Valor Estimado de Estoque</p>
                    <p className="text-2xl font-black text-blue-600">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                        products.reduce((acc, p) => acc + ((p.stock_quantity || 0) * (p.price || 0)), 0)
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabela de Alerta de Estoque */}
            <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
              <div className="p-8 border-b border-gray-50 dark:border-gray-800 flex justify-between items-center bg-rose-50/30 dark:bg-rose-900/5">
                <div>
                  <h3 className="text-sm font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest">Alertas de Estoque</h3>
                  <p className="text-[10px] text-rose-500/70 font-bold uppercase tracking-widest mt-1">Reposição necessária imediata</p>
                </div>
                <AlertCircle size={24} className="text-rose-500" />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 dark:bg-gray-800/50">
                    <tr>
                      <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Produto</th>
                      <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                      <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Atual</th>
                      <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Mínimo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                    {products
                      .filter(p => p.stock_quantity <= (p.min_stock || 10))
                      .sort((a,b) => a.stock_quantity - b.stock_quantity)
                      .map((p, idx) => (
                        <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                          <td className="px-8 py-4">
                            <p className="text-sm font-bold text-gray-900 dark:text-white">{p.name}</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{p.sku}</p>
                          </td>
                          <td className="px-8 py-4 text-center">
                            <span className={cn(
                              "text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter",
                              p.stock_quantity <= 0 ? "bg-rose-600 text-white" : "bg-rose-100 text-rose-600"
                            )}>
                              {p.stock_quantity <= 0 ? 'Esgotado' : 'Crítico'}
                            </span>
                          </td>
                          <td className="px-8 py-4 text-center">
                            <span className="text-sm font-black text-rose-600">{p.stock_quantity}</span>
                          </td>
                          <td className="px-8 py-4 text-center">
                            <span className="text-xs font-bold text-gray-400">{p.min_stock || 10}</span>
                          </td>
                        </tr>
                      ))}
                    {products.filter(p => p.stock_quantity <= (p.min_stock || 10)).length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-8 py-20 text-center">
                          <CheckCircle size={32} className="text-emerald-200 mx-auto mb-4" />
                          <p className="text-emerald-600 text-xs font-black uppercase tracking-widest">Estoque saudável! Nenhum produto em nível crítico.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
        <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Carregando ambiente...</p>
      </div>
    }>
      <ReportsContent />
    </Suspense>
  );
}
