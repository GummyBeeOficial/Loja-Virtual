'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ProductImage from '@/components/ProductImage';
import { ShoppingBag, Loader2, Filter, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';

export default function CategoryPage() {
  const { name } = useParams();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        // First get category ID
        const { data: catData } = await supabase
          .from('categories')
          .select('id')
          .ilike('name', decodeURIComponent(name as string))
          .single();

        if (catData) {
          const { data: prodData } = await supabase
            .from('products')
            .select('*')
            .eq('category_id', catData.id);
          
          if (prodData) setProducts(prodData);
        } else {
          // If category not found, maybe it's a generic "all" or just empty
          const { data: allProd } = await supabase.from('products').select('*');
          if (allProd) setProducts(allProd);
        }
      } catch (err) {
        console.error('Error fetching category products:', err);
      } finally {
        setLoading(false);
      }
    };

    if (name) fetchProducts();
  }, [name]);

  const categoryName = decodeURIComponent(name as string).toUpperCase();

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col transition-colors duration-300">
      <Navbar />
      
      <main className="flex-1 pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-8">
            <Link href="/" className="hover:text-[#13daec] transition-colors">Início</Link>
            <ChevronRight size={10} />
            <span className="text-gray-900 dark:text-white">{categoryName}</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div>
              <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white tracking-tighter mb-2">
                {categoryName}
              </h1>
              <p className="text-gray-500 dark:text-gray-400 max-w-xl">
                Explore nossa coleção exclusiva de {categoryName.toLowerCase()} desenhada para realçar sua beleza natural.
              </p>
            </div>
            
            <button className="flex items-center gap-2 px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl text-sm font-bold uppercase tracking-widest hover:bg-gray-800 dark:hover:bg-gray-100 transition-all shadow-lg shadow-black/5">
              <Filter size={18} />
              Filtrar
            </button>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-10 h-10 animate-spin text-[#13daec] mb-4" />
              <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Carregando coleção...</p>
            </div>
          ) : products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {products.map((product) => (
                <div key={product.id} className="group relative">
                  <Link href={`/product/${product.id}`} className="block">
                    <div className="aspect-[3/4] rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-900 relative mb-4">
                      <ProductImage 
                        src={product.image_url} 
                        alt={product.name} 
                        fill
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    </div>
                  </Link>

                  <div className="space-y-1">
                    <div className="flex justify-between items-start">
                      <Link href={`/product/${product.id}`}>
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-tight hover:text-[#13daec] transition-colors">
                          {product.name}
                        </h3>
                      </Link>
                      <button 
                        onClick={() => addToCart(product, 1)}
                        className="p-2 bg-white dark:bg-gray-800 rounded-full shadow-md text-gray-900 dark:text-white hover:bg-[#13daec] hover:text-white transition-all transform hover:scale-110"
                      >
                        <ShoppingBag size={16} />
                      </button>
                    </div>
                    <p className="text-lg font-bold text-[#13daec]">
                      R$ {product.price.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-gray-50 dark:bg-gray-900 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-800">
              <p className="text-gray-500 font-bold uppercase tracking-widest">Nenhum produto encontrado nesta categoria.</p>
              <Link href="/" className="inline-block mt-4 text-[#13daec] font-bold hover:underline">Voltar para o início</Link>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
