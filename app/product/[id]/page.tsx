'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ProductImage from '@/components/ProductImage';
import { ShoppingBag, ChevronLeft, Loader2, Star, ShieldCheck, Truck, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/context/ToastContext';
import { cn } from '@/lib/utils';

export default function ProductDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const { addToCart } = useCart();
  const { addToast } = useToast();
  const [product, setProduct] = useState<any>(null);
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const [selectedVariant, setSelectedVariant] = useState<any | null>(null);
  const [selectedSize, setSelectedSize] = useState<any | null>(null);

  // Debug logs for selection changes
  useEffect(() => {
    if (product) {
      console.log('Product Variants:', product.product_variants);
      console.log('Current Selected Variant:', selectedVariant);
      console.log('Current Selected Variant Sizes:', selectedVariant?.product_sizes);
      console.log('Current Selected Size Object:', selectedSize);
    }
  }, [product, selectedVariant, selectedSize]);

  const fetchProduct = React.useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          categories(name),
          product_variants (
            *,
            product_sizes (*)
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      
      setProduct(data);
      
      // Debug logs
      console.log('Full Product Data:', data);
      console.log('Product Variants:', data.product_variants);
      
      // Set default selections if available
      if (data.product_variants && data.product_variants.length > 0) {
        const firstVariant = data.product_variants[0];
        console.log('Setting initial variant:', firstVariant);
        setSelectedVariant(firstVariant);
        
        if (firstVariant.product_sizes && firstVariant.product_sizes.length > 0) {
          const firstSizeObj = firstVariant.product_sizes[0];
          console.log('Setting initial size object:', firstSizeObj);
          setSelectedSize(firstSizeObj);
        } else {
          setSelectedSize(null);
        }
      }

      // Fetch related products
      if (data.category_id) {
        const { data: related } = await supabase
          .from('products')
          .select('*')
          .eq('category_id', data.category_id)
          .neq('id', id)
          .limit(4);
        
        setRelatedProducts(related || []);
      }
    } catch (err) {
      console.error('Error fetching product:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchProduct();
    }
  }, [id, fetchProduct]);

  const handleAddToCart = async () => {
    if (product) {
      if (isAdding || addedToCart) return;

      // Validate selections
      const hasVariants = product.product_variants && product.product_variants.length > 0;
      
      if (hasVariants) {
        if (selectedVariant && selectedVariant.product_sizes?.length > 0 && !selectedSize) {
          addToast('warning', 'Por favor, selecione um tamanho');
          return;
        }
      } else if (product.sizes && product.sizes.length > 0 && !selectedSize) {
        addToast('warning', 'Por favor, selecione um tamanho');
        return;
      }

      setIsAdding(true);
      
      // Artificial delay for better UX
      await new Promise(resolve => setTimeout(resolve, 600));

      const success = addToCart({
        ...product,
        selectedVariant: selectedVariant ? {
          id: selectedVariant.id,
          name: selectedVariant.color_name,
          variant_name: selectedVariant.variant_name,
          color_hex: selectedVariant.color_hex,
          image_url: selectedVariant.image_url
        } : null,
        selectedColor: selectedVariant?.color_name || null,
        selectedSize: selectedSize?.size || selectedSize,
        variant_id: selectedVariant?.id || null,
        size_id: selectedSize?.id || null,
        stock: selectedSize?.stock || null,
        // Use variant image if available, otherwise product image
        image_url: selectedVariant?.image_url || product.image_url
      }, quantity);

      setIsAdding(false);
      
      if (success) {
        setAddedToCart(true);
        setTimeout(() => setAddedToCart(false), 3000);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <Navbar />
        <div className="flex-grow flex items-center justify-center">
          <Loader2 className="w-12 h-12 animate-spin text-[#13daec]" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <Navbar />
        <div className="flex-grow flex flex-col items-center justify-center p-6 text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Produto não encontrado</h2>
          <p className="text-gray-600 mb-8">O produto que você está procurando não existe ou foi removido.</p>
          <Link 
            href="/" 
            className="px-8 py-3 bg-[#13daec] text-white font-bold rounded-full hover:bg-[#11c5d4] transition-colors"
          >
            Voltar para a Loja
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-6 md:px-12 pt-32 pb-20">
        {/* Breadcrumbs / Back button */}
        <button 
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-[#13daec] transition-colors mb-8 uppercase tracking-widest"
        >
          <ChevronLeft size={16} />
          Voltar
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
          <div className="relative aspect-[3/4] bg-gray-50 rounded-2xl overflow-hidden group shadow-lg">
            <ProductImage 
              src={selectedVariant?.image_url || product.image_url} 
              alt={product.name}
              fill
              className="h-full w-full transition-transform duration-700 group-hover:scale-105"
            />
          </div>

          {/* Product Info */}
          <div className="flex flex-col">
            <div className="mb-8">
              <p className="text-[#13daec] font-bold text-xs uppercase tracking-[0.2em] mb-2">
                {product.categories?.name || 'Coleção'}
              </p>
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tighter mb-4">
                {product.name}
              </h1>
              <div className="flex items-center gap-4 mb-6">
                <div className="flex text-yellow-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={16} fill="currentColor" />
                  ))}
                </div>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                  (12 Avaliações)
                </span>
              </div>
              <p className="text-3xl font-bold text-gray-900">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price)}
              </p>
            </div>

            <div className="prose prose-sm text-gray-600 mb-10 max-w-none">
              <p className="leading-relaxed">
                {product.description || 'Nenhuma descrição disponível para este produto.'}
              </p>
            </div>

            {/* Size & Color Selection */}
            <div className="space-y-8 mb-10">
              {product.product_variants && product.product_variants.length > 0 && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xs font-bold uppercase tracking-widest text-gray-400">
                      Variação: <span className="text-gray-900">{selectedVariant?.color_name || ''}</span>
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    {product.product_variants.map((variant: any) => (
                      <button
                        key={variant.id}
                        onClick={() => {
                          console.log('Selected Variant changed to:', variant);
                          console.log('New Variant Sizes:', variant.product_sizes);
                          setSelectedVariant(variant);
                          // Select first size of new variant if available
                          if (variant.product_sizes && variant.product_sizes.length > 0) {
                            setSelectedSize(variant.product_sizes[0]);
                          } else {
                            setSelectedSize(null);
                          }
                        }}
                        className={cn(
                          "relative group transition-all duration-300",
                          selectedVariant?.id === variant.id 
                            ? "scale-110" 
                            : "hover:scale-105"
                        )}
                        title={variant.color_name}
                      >
                        <div className={cn(
                          "w-12 h-12 rounded-full border-2 overflow-hidden flex items-center justify-center transition-all",
                          selectedVariant?.id === variant.id 
                            ? "border-[#13daec] ring-4 ring-[#13daec]/10" 
                            : "border-gray-100 hover:border-gray-200"
                        )}>
                          {variant.image_url ? (
                            <div className="w-full h-full relative">
                              <ProductImage src={variant.image_url} alt={variant.color_name} fill className="object-cover" />
                            </div>
                          ) : variant.color_hex ? (
                            <div 
                              className="w-full h-full" 
                              style={{ backgroundColor: variant.color_hex }}
                            />
                          ) : (
                            <span className="text-[10px] font-bold text-gray-500 uppercase">{variant.color_name?.substring(0, 2)}</span>
                          )}
                        </div>
                        
                        {/* Selected Indicator */}
                        {selectedVariant?.id === variant.id && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#13daec] rounded-full border-2 border-white flex items-center justify-center">
                            <CheckCircle2 size={10} className="text-white" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {selectedVariant?.product_sizes && selectedVariant.product_sizes.length > 0 && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Tamanho</span>
                    <button className="text-[10px] font-bold uppercase tracking-widest text-[#13daec] underline">Guia de Medidas</button>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {selectedVariant.product_sizes.map((s: any) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          console.log('Size clicked object:', s);
                          setSelectedSize(s);
                        }}
                        disabled={s.stock <= 0}
                        className={cn(
                          "min-w-[50px] h-12 px-4 flex items-center justify-center rounded-xl border-2 font-bold text-sm transition-all",
                          selectedSize?.id === s.id 
                            ? "border-[#13daec] bg-[#13daec]/5 text-[#13daec]" 
                            : "border-gray-100 text-gray-400 hover:border-gray-200",
                          s.stock <= 0 && "opacity-50 cursor-not-allowed bg-gray-50 border-gray-100 line-through"
                        )}
                      >
                        {s.size}
                        {s.stock <= 5 && s.stock > 0 && (
                          <span className="ml-2 text-[8px] text-orange-500 uppercase">Últimas {s.stock}</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Fallback for simple products without variations */}
              {(!product.product_variants || product.product_variants.length === 0) && product.sizes && product.sizes.length > 0 && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Tamanho</span>
                    <button className="text-[10px] font-bold uppercase tracking-widest text-[#13daec] underline">Guia de Medidas</button>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {product.sizes.map((size: string) => (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        className={cn(
                          "min-w-[50px] h-12 px-4 flex items-center justify-center rounded-xl border-2 font-bold text-sm transition-all",
                          selectedSize === size 
                            ? "border-[#13daec] bg-[#13daec]/5 text-[#13daec]" 
                            : "border-gray-100 text-gray-400 hover:border-gray-200"
                        )}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Add to Cart Section */}
            <div className="space-y-6 mb-12">
              <div className="flex items-center gap-4">
                <div className="flex items-center border border-gray-200 rounded-full px-4 py-2">
                  <button 
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-900"
                  >
                    -
                  </button>
                  <span className="w-12 text-center font-bold text-gray-900">{quantity}</span>
                  <button 
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-900"
                  >
                    +
                  </button>
                </div>
                
                <button 
                  onClick={handleAddToCart}
                  disabled={isAdding || addedToCart}
                  className={cn(
                    "flex-grow py-4 px-8 rounded-full font-bold uppercase tracking-widest flex items-center justify-center gap-3 transition-all transform active:scale-95",
                    addedToCart 
                      ? "bg-green-500 text-white" 
                      : isAdding
                        ? "bg-gray-400 text-white cursor-not-allowed"
                        : "bg-gray-900 text-white hover:bg-gray-800"
                  )}
                >
                  {isAdding ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Adicionando...
                    </>
                  ) : addedToCart ? (
                    <>
                      <CheckCircle2 size={20} />
                      Adicionado!
                    </>
                  ) : (
                    <>
                      <ShoppingBag size={20} />
                      Adicionar ao Carrinho
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Features/Trust */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-10 border-t border-gray-100">
              <div className="flex flex-col items-center text-center gap-2">
                <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-800">
                  <Truck size={18} />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Entrega Rápida</p>
              </div>
              <div className="flex flex-col items-center text-center gap-2">
                <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-800">
                  <ShieldCheck size={18} />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Compra Segura</p>
              </div>
              <div className="flex flex-col items-center text-center gap-2">
                <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-800">
                  <RefreshCw size={18} />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Troca Grátis</p>
              </div>
            </div>
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="mt-32">
            <h2 className="text-3xl font-bold text-gray-900 tracking-tighter mb-12">Você também pode gostar</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {relatedProducts.map((related) => (
                <Link 
                  key={related.id} 
                  href={`/product/${related.id}`}
                  className="group"
                >
                  <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-gray-50 mb-4 shadow-sm">
                    <ProductImage 
                      src={related.image_url} 
                      alt={related.name} 
                      fill
                      className="h-full w-full group-hover:scale-110 transition-transform duration-700" 
                    />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-1 group-hover:text-[#13daec] transition-colors">{related.name}</h3>
                  <p className="text-gray-500 font-medium">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(related.price)}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
