'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ProductImage from '@/components/ProductImage';
import { ShoppingBag, ArrowRight, Star, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { useCart } from '@/context/CartContext';
import { useSiteConfig } from '@/context/SiteConfigContext';

export default function HomePage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<any[]>([]);
  const [activeBanner, setActiveBanner] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();
  const { config } = useSiteConfig();
  const [addingId, setAddingId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddToCart = async (e: React.MouseEvent, product: any) => {
    e.preventDefault();
    e.stopPropagation();
    if (addingId === product.id) return;
    
    setAddingId(product.id);
    const success = addToCart(product, 1);
    
    if (success) {
      // Keep "Adicionado!" state for 2 seconds
      setTimeout(() => setAddingId(null), 2000);
    } else {
      setAddingId(null);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .limit(4);
      
      if (categoriesError) throw categoriesError;
      setCategories(categoriesData || []);

      // Fetch featured products
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .limit(8);
      
      if (productsError) throw productsError;
      setFeaturedProducts(productsData || []);

      // Fetch active banner
      const { data: bannerData, error: bannerError } = await supabase
        .from('banners')
        .select('*')
        .eq('is_active', true)
        .order('order', { ascending: true })
        .limit(1)
        .single();
      
      if (!bannerError && bannerData) {
        setActiveBanner(bannerData);
      }

    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fallback banner data if none is active in DB
  const heroBanner = activeBanner || {
    title: "A ESSÊNCIA DO MAR EM VOCÊ",
    subtitle: "Coleção Verão 2026",
    description: "Descubra nossa nova coleção inspirada nas cores vibrantes do oceano e no conforto absoluto para os seus dias de sol.",
    image_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuD19G-mGHu2qaLS-G3C-Uf0F70ORDXuEMMqRw_R1q5lN8xwWOit-s_NlKiQLdy4wolUi4bqsytRxw2QecW11gh-fmGYUWlxxVPTUMhD73Ic9L0jipky1SEZZ2oz5q63MUyr4OJ1BJe2xCF6ZIrt7IZjYpjk-FXSHwM4UD15lG7puKGAOFJyNievGZfzZYo1MKYOdZ3uYRb9lsvYLs0pDAa0JucmkDIDsTUV4zj4sxdybZVT7kQIrHNOubaWz5dysIHYBajyhaTIZy93",
    button_text: "Comprar Agora",
    link_url: "/category/todos"
  };

  return (
    <div className="min-h-screen bg-white font-sans">
      <Navbar />

      {/* Hero Section */}
      <section className="relative h-screen flex items-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <ProductImage 
            src={heroBanner.image_url} 
            alt={heroBanner.title} 
            fill
            className="object-cover object-top"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent"></div>
          <div className="absolute inset-0 bg-black/10"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 w-full">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-2xl"
          >
            <span className="text-white text-sm font-bold uppercase tracking-[0.3em] mb-4 block">
              {config.site_slogan || heroBanner.subtitle}
            </span>
            <h1 className="text-6xl md:text-8xl font-bold text-white leading-[0.9] mb-8 tracking-tighter uppercase">
              {heroBanner.title.split('<br />').map((line: string, i: number) => (
                <React.Fragment key={i}>
                  {line}
                  {i < heroBanner.title.split('<br />').length - 1 && <br />}
                </React.Fragment>
              ))}
            </h1>
            <p className="text-white/80 text-lg mb-10 max-w-md leading-relaxed">
              {heroBanner.description || "Descubra nossa nova coleção inspirada nas cores vibrantes do oceano e no conforto absoluto para os seus dias de sol."}
            </p>
            <div className="flex flex-wrap gap-4">
              <Link 
                href={heroBanner.link_url || "/category/todos"} 
                className="bg-primary text-white px-8 py-4 rounded-full font-bold uppercase tracking-widest text-sm hover:bg-primary/90 transition-all flex items-center gap-2 group"
              >
                {heroBanner.button_text || "Comprar Agora"}
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <button 
                onClick={() => document.getElementById('categories')?.scrollIntoView({ behavior: 'smooth' })}
                className="bg-white/10 backdrop-blur-md border border-white/30 text-white px-8 py-4 rounded-full font-bold uppercase tracking-widest text-sm hover:bg-white/20 transition-all"
              >
                Ver Coleção
              </button>
            </div>
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/50">
          <span className="text-[10px] uppercase tracking-widest font-bold">Scroll</span>
          <div className="w-[1px] h-12 bg-gradient-to-b from-white/50 to-transparent"></div>
        </div>
      </section>

      {/* Categories Grid */}
      <section id="categories" className="py-24 px-6 md:px-12 max-w-7xl mx-auto">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-accent" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {categories.length > 0 ? categories.map((cat, i) => (
              <Link key={cat.id} href={`/category/${cat.name.toLowerCase()}`}>
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="group relative h-80 rounded-2xl overflow-hidden cursor-pointer shadow-lg"
                >
                  <ProductImage 
                    src={cat.image_url} 
                    alt={cat.name} 
                    fill
                    className="h-full w-full group-hover:scale-110 transition-transform duration-700" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                  <div className="absolute bottom-6 left-6">
                    <h3 className="text-white text-xl font-bold uppercase tracking-widest">{cat.name}</h3>
                    <span className="text-white/70 text-xs font-bold uppercase tracking-widest flex items-center gap-2 mt-1">
                      Ver Produtos <ArrowRight size={14} />
                    </span>
                  </div>
                </motion.div>
              </Link>
            )) : (
              <div className="col-span-full text-center py-10 text-gray-400">
                Nenhuma categoria encontrada.
              </div>
            )}
          </div>
        )}
      </section>

      {/* Featured Products */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
            <div>
              <span className="text-primary text-xs font-bold uppercase tracking-[0.3em] mb-2 block">
                Destaques
              </span>
              <h2 className="text-4xl font-bold tracking-tighter text-gray-900">
                QUERIDINHOS DA ESTAÇÃO
              </h2>
            </div>
            <Link href="/category/todos" className="text-sm font-bold uppercase tracking-widest text-gray-500 hover:text-accent transition-colors flex items-center gap-2">
              Ver todos os produtos <ArrowRight size={18} />
            </Link>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-10 h-10 animate-spin text-accent" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {featuredProducts.length > 0 ? featuredProducts.map((product) => (
                <div key={product.id} className="group relative">
                  <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-gray-100 mb-4 group/card shadow-sm">
                    <ProductImage 
                      src={product.image_url} 
                      alt={product.name} 
                      fill
                      className="h-full w-full group-hover:scale-110 transition-transform duration-700" 
                    />
                    
                    {/* Hover Actions */}
                    <div className="absolute bottom-4 left-4 right-4 flex flex-col gap-2 translate-y-12 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 z-20">
                      <Link 
                        href={`/product/${product.id}`}
                        className="bg-white text-gray-900 py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-lg flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors relative z-30"
                      >
                        Ver Detalhes
                      </Link>
                      <button 
                        onClick={(e) => handleAddToCart(e, product)}
                        disabled={addingId === product.id}
                        className={cn(
                          "py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-lg flex items-center justify-center gap-2 transition-all relative z-30",
                          addingId === product.id 
                            ? "bg-green-500 text-white" 
                            : "bg-primary text-white hover:bg-primary/90"
                        )}
                      >
                        {addingId === product.id ? (
                          <>Adicionado!</>
                        ) : (
                          <>
                            <ShoppingBag size={14} />
                            Adicionar
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  
                  <h3 className="font-bold text-gray-900 mb-1">
                    <Link href={`/product/${product.id}`} className="hover:text-accent transition-colors after:absolute after:inset-0 after:z-10">
                      {product.name}
                    </Link>
                  </h3>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 font-medium">R$ {Number(product.price).toFixed(2)}</span>
                    <div className="flex items-center gap-1 text-orange-400">
                      <Star size={12} fill="currentColor" />
                      <span className="text-xs font-bold text-gray-400">4.9</span>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="col-span-full text-center py-10 text-gray-400">
                  Nenhum produto em destaque.
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Newsletter */}
      <section className="py-24 px-6 md:px-12">
        <div className="max-w-5xl mx-auto bg-promo rounded-[2rem] p-12 md:p-20 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl"></div>
          
          <div className="relative z-10">
            <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tighter mb-6">
              GANHE 10% OFF NA PRIMEIRA COMPRA
            </h2>
            <p className="text-white/80 text-lg mb-10 max-w-xl mx-auto">
              Assine nossa newsletter e receba novidades exclusivas, lançamentos e promoções em primeira mão.
            </p>
            <form className="flex flex-col md:flex-row gap-4 max-w-lg mx-auto">
              <input 
                type="email" 
                placeholder="Seu melhor e-mail" 
                className="flex-1 px-6 py-4 rounded-full bg-white/20 border border-white/30 text-white placeholder:text-white/60 focus:outline-none focus:bg-white/30 transition-all"
              />
              <button className="bg-white text-promo px-10 py-4 rounded-full font-bold uppercase tracking-widest text-sm hover:bg-gray-100 transition-all">
                Inscrever
              </button>
            </form>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
