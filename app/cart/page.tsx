'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ProductImage from '@/components/ProductImage';
import { useCart } from '@/context/CartContext';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, ChevronLeft } from 'lucide-react';

export default function CartPage() {
  const { cart, removeFromCart, updateQuantity, clearCart, cartTotal, cartCount } = useCart();

  if (cartCount === 0) {
    return (
      <div className="min-h-screen flex flex-col bg-white dark:bg-gray-900 transition-colors duration-300">
        <Navbar />
        <main className="flex-grow flex flex-col items-center justify-center p-6 text-center pt-32">
          <div className="w-24 h-24 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center text-gray-300 dark:text-gray-600 mb-6">
            <ShoppingBag size={40} />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tighter mb-4">Seu carrinho está vazio</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-10 max-w-md mx-auto">
            Parece que você ainda não adicionou nenhum produto ao seu carrinho. Explore nossa coleção e encontre o look perfeito para o seu verão.
          </p>
          <Link 
            href="/" 
            className="px-10 py-4 bg-[#13daec] text-white font-bold rounded-full uppercase tracking-widest text-sm hover:bg-[#11c5d4] transition-all flex items-center gap-2"
          >
            Começar a Comprar
            <ArrowRight size={18} />
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-6 md:px-12 pt-32 pb-20">
        <div className="flex flex-col lg:flex-row gap-12">
          {/* Cart Items */}
          <div className="flex-grow">
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white tracking-tighter">Carrinho</h1>
              <div className="flex items-center gap-6">
                <button 
                  onClick={clearCart}
                  className="text-xs font-bold text-red-400 hover:text-red-500 uppercase tracking-widest transition-colors"
                >
                  Limpar Carrinho
                </button>
                <span className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{cartCount} Itens</span>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm overflow-hidden border border-gray-100 dark:border-gray-800">
              <div className="divide-y divide-gray-50 dark:divide-gray-800">
                {cart.map((item) => (
                  <div key={`${item.id}-${item.variant_id || 'no-variant'}-${item.size_id || 'no-size'}`} className="p-6 md:p-8 flex flex-col md:flex-row gap-6 md:items-center">
                    <div className="relative w-24 h-32 md:w-32 md:h-40 bg-gray-50 dark:bg-gray-800 rounded-xl overflow-hidden flex-shrink-0">
                      <ProductImage 
                        src={item.image_url} 
                        alt={item.name}
                        fill
                        className="h-full w-full"
                      />
                    </div>

                    {/* Product Info */}
                    <div className="flex-grow">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{item.name}</h3>
                      <div className="flex flex-wrap gap-4 mb-4">
                        {item.selectedSize && (
                          <p className="text-xs text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest">
                            Tamanho: <span className="text-gray-900 dark:text-white">{item.selectedSize}</span>
                          </p>
                        )}
                        {item.selectedColor && (
                          <p className="text-xs text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest">
                            Cor: <span className="text-gray-900 dark:text-white">{item.selectedColor}</span>
                          </p>
                        )}
                      </div>
                      <p className="text-lg font-bold text-[#13daec]">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price)}
                      </p>
                    </div>

                    {/* Quantity Controls */}
                    <div className="flex items-center gap-4">
                      <div className="flex items-center border border-gray-100 dark:border-gray-700 rounded-full px-3 py-1 bg-gray-50 dark:bg-gray-800">
                        <button 
                          onClick={() => updateQuantity(item.id, item.quantity - 1, item.selectedSize, item.selectedColor)}
                          className="w-8 h-8 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-8 text-center font-bold text-gray-900 dark:text-white">{item.quantity}</span>
                        <button 
                          onClick={() => updateQuantity(item.id, item.quantity + 1, item.selectedSize, item.selectedColor)}
                          className="w-8 h-8 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      
                      <button 
                        onClick={() => removeFromCart(item.id, item.selectedSize, item.selectedColor)}
                        className="p-3 text-gray-300 dark:text-gray-600 hover:text-red-500 transition-colors"
                        title="Remover item"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Link 
              href="/" 
              className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 dark:text-gray-400 hover:text-[#13daec] transition-colors mt-8 uppercase tracking-widest"
            >
              <ChevronLeft size={16} />
              Continuar Comprando
            </Link>
          </div>

          {/* Order Summary */}
          <div className="w-full lg:w-96">
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm p-8 border border-gray-100 dark:border-gray-800 sticky top-32">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tighter mb-8">Resumo do Pedido</h2>
              
              <div className="space-y-4 mb-8">
                <div className="flex justify-between text-gray-500 dark:text-gray-400">
                  <span className="text-sm font-medium">Subtotal</span>
                  <span className="font-bold">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cartTotal)}
                  </span>
                </div>
                <div className="flex justify-between text-gray-500 dark:text-gray-400">
                  <span className="text-sm font-medium">Frete</span>
                  <span className="text-green-500 font-bold uppercase text-xs tracking-widest">Grátis</span>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-50 dark:border-gray-800 mb-10">
                <div className="flex justify-between items-end">
                  <span className="text-sm font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">Total</span>
                  <span className="text-3xl font-bold text-gray-900 dark:text-white">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cartTotal)}
                  </span>
                </div>
              </div>

              <Link 
                href="/checkout"
                className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-5 rounded-full font-bold uppercase tracking-widest text-sm hover:bg-gray-800 dark:hover:bg-gray-100 transition-all flex items-center justify-center gap-3"
              >
                Finalizar Compra
                <ArrowRight size={18} />
              </Link>

              <div className="mt-8 flex flex-col items-center gap-4">
                <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Pagamento Seguro</p>
                <div className="flex gap-3 opacity-30 grayscale items-center dark:invert">
                  <div className="relative h-4 w-12">
                    <Image src="https://cdn.simpleicons.org/visa/gray" alt="Visa" fill className="object-contain" unoptimized />
                  </div>
                  <div className="relative h-6 w-10">
                    <Image src="https://cdn.simpleicons.org/mastercard/gray" alt="Mastercard" fill className="object-contain" unoptimized />
                  </div>
                  <div className="relative h-4 w-16">
                    <Image src="https://cdn.simpleicons.org/paypal/gray" alt="Paypal" fill className="object-contain" unoptimized />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
