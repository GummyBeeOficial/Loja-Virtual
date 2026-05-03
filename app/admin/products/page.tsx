'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Plus, Search, Filter, Edit2, Trash2, Loader2, BarChart3, TrendingUp, AlertTriangle, Inbox } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import ProductImage from '@/components/ProductImage';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

const VALID_SALE_STATUSES = ['paid', 'processing', 'shipped', 'delivered'];
const DEMAND_STATUSES = ['pending', 'cancelled', 'failed'];

export default function ProductsPage() {
  const { role, isStaff, loading: authLoading } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!isStaff || (role !== 'admin' && role !== 'super_admin' && role !== 'estoque')) return;
    
    try {
      setLoading(true);
      const [productsRes, orderItemsRes, ordersRes] = await Promise.all([
        supabase
          .from('products')
          .select(`
            *,
            categories (
              name
            ),
            product_variants (
              product_sizes (
                stock
              )
            )
          `)
          .order('created_at', { ascending: false }),
        supabase
          .from('order_items')
          .select(`
            quantity,
            price_at_time,
            product_id,
            order_id
          `),
        supabase
          .from('orders')
          .select('id, status')
      ]);
      
      if (productsRes.error) throw productsRes.error;
      if (orderItemsRes.error) throw orderItemsRes.error;
      if (ordersRes.error) throw ordersRes.error;

      // Mapear status dos pedidos para evitar join problemático
      const statusMap: Record<string, string> = {};
      (ordersRes.data || []).forEach((o: any) => {
        statusMap[o.id] = o.status;
      });

      // Anexar status aos itens
      const itemsWithStatus = (orderItemsRes.data || []).map((item: any) => ({
        ...item,
        order_status: statusMap[item.order_id] || 'pending'
      }));

      setProducts(productsRes.data || []);
      setOrderItems(itemsWithStatus);
    } catch (err) {
      console.error('Error fetching products data:', err);
    } finally {
      setLoading(false);
    }
  }, [isStaff, role]);

  useEffect(() => {
    if (isStaff && (role === 'admin' || role === 'super_admin' || role === 'estoque')) {
      fetchData();
    }
  }, [isStaff, role, fetchData]);

  // Inteligência de Produto (Cálculos de Desempenho)
  const productsWithStats = useMemo(() => {
    return products.map(product => {
      const pItems = orderItems.filter(item => item.product_id === product.id);
      
      const salesCount = pItems
        .filter(item => VALID_SALE_STATUSES.includes(item.order_status))
        .reduce((acc, item) => acc + (item.quantity || 0), 0);
        
      const revenue = pItems
        .filter(item => VALID_SALE_STATUSES.includes(item.order_status))
        .reduce((acc, item) => acc + ((item.price_at_time || 0) * (item.quantity || 0)), 0);
        
      const interestCount = pItems
        .filter(item => DEMAND_STATUSES.includes(item.order_status))
        .reduce((acc, item) => acc + (item.quantity || 0), 0);
        
      const attempts = pItems
        .filter(item => DEMAND_STATUSES.includes(item.order_status))
        .length;

      // Cálculo de Estoque Real (Source of Truth: product_sizes)
      const variants = product.product_variants || [];
      const allSizes = variants.flatMap((v: any) => v.product_sizes || []);
      const totalStock = allSizes.length > 0 
        ? allSizes.reduce((acc: number, s: any) => acc + (s.stock || 0), 0)
        : (product.stock_quantity || 0);

      // Status Inteligente
      let primaryStatus = { label: 'Regular', color: 'bg-gray-100 text-gray-500 border-gray-200' };
      let secondaryStatus = null;

      const hasIndividualLowStock = allSizes.some((s: any) => (s.stock || 0) <= 5);
      const isLowStock = hasIndividualLowStock || totalStock <= (product.min_stock || 10);
      const isBestSeller = salesCount >= 10;
      const isHighDemand = interestCount > salesCount && interestCount >= 3;
      const isNoSales = salesCount === 0;

      if (isLowStock) {
        primaryStatus = { label: 'Estoque baixo', color: 'bg-amber-50 text-amber-600 border-amber-100' };
        if (isBestSeller) {
          secondaryStatus = { label: 'Vendendo bem', color: 'bg-emerald-50 text-emerald-600 border-emerald-100' };
        } else if (isHighDemand) {
          secondaryStatus = { label: 'Alta procura', color: 'bg-blue-50 text-blue-600 border-blue-100' };
        }
      } else if (isBestSeller) {
        primaryStatus = { label: 'Vendendo bem', color: 'bg-emerald-50 text-emerald-600 border-emerald-100' };
      } else if (isHighDemand) {
        primaryStatus = { label: 'Alta procura', color: 'bg-blue-50 text-blue-600 border-blue-100' };
      } else if (isNoSales) {
        primaryStatus = { label: 'Sem vendas', color: 'bg-rose-50 text-rose-600 border-rose-100' };
      }

      return {
        ...product,
        stats: {
          salesCount,
          revenue,
          interestCount,
          attempts,
          totalStock,
          primaryStatus,
          secondaryStatus
        }
      };
    });
  }, [products, orderItems]);

  const handleDelete = async (id: string) => {
    if (deletingId) return;
    
    console.log('[Admin] Iniciando processo de exclusão DIRETA para o ID:', id);
    setDeletingId(id);
    
    try {
      const { error, status, statusText } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('[Supabase Error]', error);
        const errorDetail = `FALHA NA EXCLUSÃO: ${error.message}. Isso ocorre se houver vendas vinculadas.`;
        alert(errorDetail);
        setDeletingId(null);
        return;
      }

      setProducts(prev => prev.filter(p => p.id !== id));
    } catch (err: any) {
      console.error('[Runtime Error]', err);
      alert(`ERRO INESPERADO:\n${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const filteredProducts = productsWithStats.filter(product => 
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (authLoading) return null;
  if (!isStaff || (role !== 'admin' && role !== 'super_admin' && role !== 'estoque')) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Produtos</h1>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Gestão inteligente de estoque e performance</p>
        </div>
        <Link 
          href="/admin/products/new" 
          className="bg-[#2271b1] text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-[#135e96] transition-colors text-sm font-bold uppercase tracking-wider shadow-sm shadow-blue-500/20"
        >
          <Plus size={18} />
          Adicionar Novo
        </Link>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="p-6 border-b border-gray-50 dark:border-gray-800 flex flex-col md:flex-row md:items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Pesquisar por nome ou categoria..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50/50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-xl focus:outline-none focus:border-[#2271b1] text-sm text-gray-900 dark:text-white placeholder:text-gray-400"
            />
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-800 rounded-xl text-xs font-bold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors uppercase tracking-widest">
              <Filter size={14} />
              Filtrar
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50 dark:bg-gray-800/30 border-b border-gray-100 dark:border-gray-800">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Produto</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Categoria</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Vendas</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Faturamento</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Interesse</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center justify-center gap-4">
                      <Loader2 className="w-8 h-8 animate-spin text-[#2271b1]" />
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Analizando dados...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredProducts.length > 0 ? (
                filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden border border-gray-100 dark:border-gray-700 relative shrink-0">
                          <ProductImage 
                            src={product.image_url} 
                            alt={product.name} 
                            fill
                            className="object-cover group-hover:scale-110 transition-transform duration-500" 
                          />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900 dark:text-white line-clamp-1">{product.name}</p>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Stock: {product.stats.totalStock}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        {product.categories?.name || 'Geral'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 items-start">
                        <div className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter border",
                          product.stats.primaryStatus.color
                        )}>
                          {product.stats.primaryStatus.label === 'Estoque baixo' && <AlertTriangle size={10} />}
                          {product.stats.primaryStatus.label === 'Vendendo bem' && <TrendingUp size={10} />}
                          {product.stats.primaryStatus.label === 'Alta procura' && <BarChart3 size={10} />}
                          {product.stats.primaryStatus.label === 'Sem vendas' && <Inbox size={10} />}
                          {product.stats.primaryStatus.label}
                        </div>
                        {product.stats.secondaryStatus && (
                          <div className={cn(
                            "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-tighter border opacity-80",
                            product.stats.secondaryStatus.color
                          )}>
                            {product.stats.secondaryStatus.label === 'Vendendo bem' && <TrendingUp size={8} />}
                            {product.stats.secondaryStatus.label === 'Alta procura' && <BarChart3 size={8} />}
                            {product.stats.secondaryStatus.label}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-xs font-black text-gray-900 dark:text-white">{product.stats.salesCount}</span>
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Unid.</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-xs font-black text-gray-900 dark:text-white">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.stats.revenue)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-xs font-black text-blue-500">{product.stats.interestCount}</span>
                        <span className="text-[9px] font-bold text-blue-300 uppercase tracking-widest text-nowrap">Tentativas: {product.stats.attempts}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/reports?tab=products&productId=${product.id}`}
                          title="Ver desempenho em Relatórios"
                          className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        >
                          <BarChart3 size={16} />
                        </Link>
                        <Link 
                          href={`/admin/products/edit/${product.id}`}
                          className="p-2 text-gray-400 hover:text-[#2271b1] hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        >
                          <Edit2 size={16} />
                        </Link>
                        <button 
                          type="button"
                          disabled={deletingId === product.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(product.id);
                          }}
                          className={cn(
                            "p-2 rounded-lg transition-colors",
                            deletingId === product.id 
                              ? 'text-gray-300 cursor-not-allowed' 
                              : 'text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
                          )}
                        >
                          {deletingId === product.id ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <Trash2 size={16} />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center">
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Nenhum produto encontrado.</p>
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
