'use client';

import React, { useState, useEffect } from 'react';
import { 
  Package, 
  ShoppingCart, 
  Users, 
  TrendingUp, 
  ArrowUpRight,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import Link from 'next/link';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import ProductImage from '@/components/ProductImage';

// ===============================================================
// SUB-COMPONENTES
// ===============================================================

const StatCard = ({ title, subtitle, value, icon: Icon, color, loading, href }: any) => {
  const CardContent = (
    <div className={cn(
      "bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 transition-all h-full",
      href && "hover:shadow-md hover:border-primary/20 dark:hover:border-primary/30 cursor-pointer group"
    )}>
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500 dark:text-gray-300 font-bold uppercase tracking-widest mb-1">{title}</p>
          {loading ? (
            <div className="h-8 w-24 bg-gray-100 dark:bg-gray-800 animate-pulse rounded mt-2" />
          ) : (
            <>
              <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{value}</h3>
              {subtitle && <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium mt-1">{subtitle}</p>}
            </>
          )}
        </div>
        <div className={cn(
          "p-3 rounded-xl shadow-lg shadow-current/10 transition-transform group-hover:scale-110", 
          color
        )}>
          <Icon size={24} className="text-white" />
        </div>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {CardContent}
      </Link>
    );
  }

  return CardContent;
};

const VALID_SALE_STATUSES = ['paid', 'processing', 'shipped', 'delivered'];

// ===============================================================
// PÁGINA PRINCIPAL
// ===============================================================

export default function AdminDashboard() {
  const { role, isStaff, loading: authLoading } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    paidOrders: 0,
    pendingOrders: 0,
    averageTicket: 0,
    customers: 0,
    recentOrders: [] as any[],
    totalSalesInPeriod: 0,
    recentOrdersCount: 0,
    topProducts: [] as any[],
    lowStock: [] as any[],
    loading: true
  });

  const [chartData, setChartData] = useState<any[]>([]);

  const fetchAllData = React.useCallback(async (isManualRefresh = false) => {
    if (!isStaff || (role !== 'admin' && role !== 'super_admin' && role !== 'financeiro')) return;
    
    if (isManualRefresh) setIsRefreshing(true);
    
    try {
      // Data de 7 dias atrás para filtros
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const sevenDaysAgoISO = sevenDaysAgo.toISOString();

      // 1. Queries de Contagem e Métricas Básicas
      const [
        { count: totalOrders },
        { count: pendingOrders },
        { count: paidOrders },
        { count: customerCount }
      ] = await Promise.all([
        supabase.from('orders').select('*', { count: 'exact', head: true }),
        supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('orders').select('*', { count: 'exact', head: true }).in('status', VALID_SALE_STATUSES),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'user')
      ]);

      // 2. Query de Faturamento Total (Apenas pedidos válidos)
      const { data: allValidOrders } = await supabase
        .from('orders')
        .select('total_amount')
        .in('status', VALID_SALE_STATUSES);

      const totalRevenue = allValidOrders?.reduce((acc, curr) => acc + (Number(curr.total_amount) || 0), 0) || 0;
      const averageTicket = paidOrders && paidOrders > 0 ? totalRevenue / paidOrders : 0;

      // 3. Dados do Gráfico (Apenas últimos 7 dias via Banco)
      const { data: recentValidOrders } = await supabase
        .from('orders')
        .select('total_amount, created_at')
        .in('status', VALID_SALE_STATUSES)
        .gte('created_at', sevenDaysAgoISO);

      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return {
          date: d.toISOString().split('T')[0],
          label: d.toLocaleDateString('pt-BR', { weekday: 'short' }),
          vendas: 0
        };
      }).reverse();

      recentValidOrders?.forEach(order => {
        const orderDate = new Date(order.created_at).toISOString().split('T')[0];
        const dayData = last7Days.find(d => d.date === orderDate);
        if (dayData) dayData.vendas += Number(order.total_amount || 0);
      });
      setChartData(last7Days);

      // 4. Query de Pedidos Recentes (Campos otimizados)
      const { data: recentOrders } = await supabase
        .from('orders')
        .select('id, total_amount, status, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      // 5. Produtos Mais Vendidos (Baseado em itens de pedidos válidos)
      // Buscamos order_items que pertencem a pedidos em VALID_SALE_STATUSES
      const { data: orderItems } = await supabase
        .from('order_items')
        .select(`
          quantity, 
          product_id, 
          products (name, image_url),
          orders!inner (status)
        `)
        .in('orders.status', VALID_SALE_STATUSES);

      const productSales: Record<string, any> = {};
      orderItems?.forEach(item => {
        if (!item.product_id) return;
        const product = Array.isArray(item.products) ? item.products[0] : item.products;
        if (!productSales[item.product_id]) {
          productSales[item.product_id] = {
            id: item.product_id,
            name: product?.name || 'Produto s/ nome',
            image: product?.image_url,
            total: 0
          };
        }
        productSales[item.product_id].total += item.quantity || 0;
      });

      const topProducts = Object.values(productSales)
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);

      // 6. Query de Estoque Baixo (Tratamento robusto de arrays/objetos)
      const { data: lowStockData } = await supabase
        .from('product_sizes')
        .select(`
          id,
          stock,
          size,
          product_variants (
            color_name,
            products (
              name
            )
          )
        `)
        .lte('stock', 5)
        .order('stock', { ascending: true })
        .limit(5);

      const formattedLowStock = lowStockData?.map((item: any) => {
        const variant = Array.isArray(item.product_variants) ? item.product_variants[0] : item.product_variants;
        const product = Array.isArray(variant?.products) ? variant.products[0] : variant?.products;
        
        return {
          id: item.id,
          name: product?.name || 'Produto s/ nome',
          variant: variant?.color_name || 'Padrão',
          size: item.size,
          stock: item.stock
        };
      }) || [];

      setStats({
        totalRevenue,
        totalOrders: totalOrders || 0,
        paidOrders: paidOrders || 0,
        pendingOrders: pendingOrders || 0,
        averageTicket,
        customers: customerCount || 0,
        recentOrders: recentOrders || [],
        totalSalesInPeriod: recentValidOrders?.length || 0,
        recentOrdersCount: recentOrders?.length || 0,
        topProducts,
        lowStock: formattedLowStock,
        loading: false
      });
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Erro ao carregar dashboard:', err);
      setStats(prev => ({ ...prev, loading: false }));
    } finally {
      setIsRefreshing(false);
    }
  }, [isStaff, role]);

  useEffect(() => {
    if (isStaff && (role === 'admin' || role === 'super_admin' || role === 'financeiro')) {
      const timer = setTimeout(() => {
        fetchAllData();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [fetchAllData, isStaff, role]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-emerald-500';
      case 'pending': return 'bg-orange-500';
      case 'processing': return 'bg-blue-500';
      case 'shipped': return 'bg-purple-500';
      case 'delivered': return 'bg-green-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const isBrowser = typeof window !== 'undefined';

  if (authLoading) return null;
  if (!isStaff || (role !== 'admin' && role !== 'super_admin' && role !== 'financeiro')) return null;

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter">Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-300 font-medium">Bem-vindo de volta! Aqui está um resumo geral.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Última atualização</span>
            <span className="text-xs font-bold text-gray-900 dark:text-white">
              {lastUpdated ? lastUpdated.toLocaleTimeString('pt-BR') : '--:--:--'}
            </span>
          </div>
          <button 
            onClick={() => fetchAllData(true)}
            disabled={isRefreshing || stats.loading}
            className="p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all shadow-sm active:scale-95 disabled:opacity-50"
            title="Atualizar dados"
          >
            <Clock className={cn("text-gray-500", isRefreshing && "animate-spin")} size={20} />
          </button>
        </div>
      </div>

      {/* Grid de Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard 
          title="Faturamento Total" 
          subtitle={stats.totalRevenue === 0 && !stats.loading ? "Sem faturamento (nenhum válido)" : "Pedidos: " + VALID_SALE_STATUSES.join(', ')}
          value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.totalRevenue)} 
          icon={TrendingUp} 
          color="bg-emerald-500" 
          loading={stats.loading}
          href="/admin/orders"
        />
        <StatCard 
          title="Total de Pedidos" 
          value={stats.totalOrders} 
          icon={ShoppingCart} 
          color="bg-blue-500" 
          loading={stats.loading}
          href="/admin/orders"
        />
        <StatCard 
          title="Vendas Válidas" 
          value={stats.paidOrders} 
          icon={CheckCircle} 
          color="bg-green-600" 
          loading={stats.loading}
          href="/admin/orders"
        />
        <StatCard 
          title="Pendentes" 
          value={stats.pendingOrders} 
          icon={Clock} 
          color="bg-orange-500" 
          loading={stats.loading}
          href="/admin/orders?status=pending"
        />
        <StatCard 
          title="Ticket Médio" 
          value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.averageTicket)} 
          icon={ArrowUpRight} 
          color="bg-indigo-500" 
          loading={stats.loading}
        />
        <StatCard 
          title="Clientes" 
          value={stats.customers} 
          icon={Users} 
          color="bg-purple-500" 
          loading={stats.loading}
          href="/admin/customers"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Gráfico de Vendas */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">Vendas nos Últimos 7 Dias</h3>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50 dark:bg-gray-800 px-3 py-1 rounded-full">Faturamento Diário</span>
          </div>
          <div className="h-80 w-full min-h-[320px]">
            {stats.loading ? (
              <div className="w-full h-full bg-gray-50 dark:bg-gray-800/50 animate-pulse rounded-xl flex items-center justify-center">
                <Loader2 className="animate-spin text-gray-300" size={40} />
              </div>
            ) : chartData.every(d => d.vendas === 0) ? (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50/50 dark:bg-gray-800/20 rounded-2xl border-2 border-dashed border-gray-100 dark:border-gray-800">
                <TrendingUp size={48} className="text-gray-200 dark:text-gray-700 mb-4" />
                <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Sem vendas nos últimos 7 dias</p>
              </div>
            ) : isBrowser ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" className="dark:opacity-5" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 10, fontWeight: 'bold'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 10, fontWeight: 'bold'}} />
                  <Tooltip 
                    cursor={{fill: '#f9fafb', opacity: 0.1}}
                    contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', backgroundColor: '#111827'}}
                    itemStyle={{color: '#fff', fontSize: '13px', fontWeight: 'bold', padding: '0'}}
                    labelStyle={{color: '#6b7280', fontSize: '10px', marginBottom: '8px', textTransform: 'uppercase', fontWeight: '900', letterSpacing: '0.05em'}}
                    formatter={(value: any) => [new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0)), "Faturamento"]}
                  />
                  <Bar dataKey="vendas" fill="#2271b1" radius={[8, 8, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            ) : null}
          </div>
        </div>

        {/* Alerta de Estoque Baixo */}
        <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">Estoque Baixo {stats.lowStock.length > 0 && `(${stats.lowStock.length})`}</h3>
            <AlertCircle size={20} className={cn("transition-colors", stats.lowStock.length > 0 ? "text-red-500" : "text-gray-300")} />
          </div>
          <div className="space-y-4">
            {stats.loading ? (
              [...Array(3)].map((_, i) => <div key={i} className="h-16 bg-gray-50 dark:bg-gray-800 animate-pulse rounded-xl" />)
            ) : stats.lowStock.length === 0 ? (
              <div className="text-center py-10">
                <CheckCircle size={32} className="text-green-500 mx-auto mb-3 opacity-20" />
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Tudo em dia!</p>
              </div>
            ) : (
              stats.lowStock.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-4 rounded-xl bg-red-50/50 dark:bg-red-900/5 border border-red-100 dark:border-red-900/10">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{item.name}</p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-300 font-bold uppercase">
                      {item.variant} • Tam: {item.size}
                    </p>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-lg font-black text-red-600 dark:text-red-500 leading-none">{item.stock}</p>
                    <p className="text-[8px] uppercase font-black text-red-400">unid.</p>
                  </div>
                </div>
              ))
            )}
          </div>
          <Link 
            href="/admin/products"
            className="w-full mt-6 py-3 text-[10px] font-black uppercase tracking-widest text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors inline-block text-center border border-red-100 dark:border-red-900/20"
          >
            Repor Estoque
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Pedidos Recentes */}
        <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">Pedidos Recentes</h3>
            <Link 
              href="/admin/orders"
              className="text-[10px] font-black uppercase tracking-widest text-[#2271b1] hover:underline"
            >
              Ver todos
            </Link>
          </div>
          <div className="space-y-4">
            {stats.loading ? (
              [...Array(3)].map((_, i) => <div key={i} className="h-14 bg-gray-50 dark:bg-gray-800 animate-pulse rounded-xl" />)
            ) : stats.recentOrders.length === 0 ? (
              <p className="text-center py-10 text-gray-400 text-xs font-bold uppercase tracking-widest">Aguardando primeiros pedidos...</p>
            ) : (
              stats.recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors border border-transparent hover:border-gray-100 dark:hover:border-gray-800 group">
                  <div className="flex items-center gap-4">
                    <div className={cn("w-2 h-2 rounded-full", getStatusColor(order.status))} />
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">#{order.id.substring(0, 8).toUpperCase()}</p>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase">
                        {new Date(order.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm font-black text-gray-900 dark:text-white">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.total_amount)}
                      </p>
                      <span className={cn(
                        "text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter border",
                        VALID_SALE_STATUSES.includes(order.status) ? "text-emerald-600 border-emerald-100 bg-emerald-50 dark:bg-emerald-900/10" : 
                        order.status === 'pending' ? "text-orange-600 border-orange-100 bg-orange-50 dark:bg-orange-900/10" :
                        "text-gray-500 border-gray-100 bg-gray-50 dark:bg-gray-800"
                      )}>
                        {order.status}
                      </span>
                    </div>
                    <Link 
                      href={`/admin/orders/${order.id}`}
                      className="p-2 bg-gray-50 dark:bg-gray-800 rounded-lg text-gray-400 hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <ArrowUpRight size={16} />
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Mais Vendidos */}
        <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">Produtos Mais Vendidos</h3>
            <Link 
              href="/admin/products"
              className="text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:underline"
            >
              Catálogo
            </Link>
          </div>
          <div className="space-y-6">
            {stats.loading ? (
              [...Array(3)].map((_, i) => <div key={i} className="h-14 bg-gray-50 dark:bg-gray-800 animate-pulse rounded-xl" />)
            ) : stats.topProducts.length === 0 ? (
              <div className="text-center py-10">
                <Package size={32} className="text-gray-200 dark:text-gray-700 mx-auto mb-3" />
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Nenhuma venda registrada ainda</p>
                <p className="text-[10px] text-gray-400 mt-1">Comece divulgando seus produtos!</p>
              </div>
            ) : (
              stats.topProducts.map((product) => (
                <div key={product.id} className="flex items-center justify-between group">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 overflow-hidden flex-shrink-0 relative border border-gray-100 dark:border-gray-800">
                      <ProductImage 
                        src={product.image} 
                        alt={product.name} 
                        fill 
                        className="object-cover group-hover:scale-110 transition-transform"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{product.name}</p>
                      <p className="text-[9px] text-gray-400 dark:text-gray-400 font-bold uppercase tracking-tighter">ID: {product.id.substring(0, 8)}</p>
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-lg font-black text-emerald-600 dark:text-emerald-500 leading-none">{product.total}</p>
                    <p className="text-[8px] uppercase font-black text-emerald-400">vendas</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
