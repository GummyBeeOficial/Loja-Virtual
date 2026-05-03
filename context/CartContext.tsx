'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useToast } from '@/context/ToastContext';

interface CartItem {
  id: string;
  name: string;
  price: number;
  image_url: string;
  quantity: number;
  selectedSize?: string | null;
  selectedColor?: string | null;
  variant_id?: string | null;
  size_id?: string | null;
  stock?: number | null;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: any, quantity: number) => boolean;
  removeFromCart: (productId: string, selectedSize?: string | null, selectedColor?: string | null) => void;
  updateQuantity: (productId: string, quantity: number, selectedSize?: string | null, selectedColor?: string | null) => void;
  clearCart: () => void;
  cartTotal: number;
  cartCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const { addToast } = useToast();

  // Load cart from localStorage on mount
  useEffect(() => {
    const loadCart = () => {
      const savedCart = localStorage.getItem('mareviva_cart');
      if (savedCart) {
        try {
          setCart(JSON.parse(savedCart));
        } catch (e) {
          console.error('Error parsing cart from localStorage', e);
        }
      }
    };
    loadCart();
  }, []);

  // Save cart to localStorage on change
  useEffect(() => {
    localStorage.setItem('mareviva_cart', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (product: any, quantity: number) => {
    const existingItem = cart.find(item => 
      item.id === product.id && 
      item.selectedSize === product.selectedSize && 
      item.selectedColor === product.selectedColor
    );
    
    const currentQuantity = existingItem ? existingItem.quantity : 0;
    const newQuantity = currentQuantity + quantity;

    // Check stock if available
    if (product.stock !== null && product.stock !== undefined && newQuantity > product.stock) {
      addToast('warning', `Desculpe, temos apenas ${product.stock} unidades em estoque deste item.`);
      return false;
    }

    setCart(prevCart => {
      const itemInPrev = prevCart.find(item => 
        item.id === product.id && 
        item.selectedSize === product.selectedSize && 
        item.selectedColor === product.selectedColor
      );

      if (itemInPrev) {
        return prevCart.map(item => 
          (item.id === product.id && 
           item.selectedSize === product.selectedSize && 
           item.selectedColor === product.selectedColor)
            ? { ...item, quantity: item.quantity + quantity } 
            : item
        );
      }

      return [...prevCart, { 
        id: product.id, 
        name: product.name, 
        price: product.price, 
        image_url: product.image_url, 
        quantity,
        selectedSize: product.selectedSize,
        selectedColor: product.selectedColor,
        variant_id: product.variant_id,
        size_id: product.size_id,
        stock: product.stock
      }];
    });

    addToast('success', `${product.name} adicionado ao carrinho!`);
    return true;
  };

  const removeFromCart = (productId: string, selectedSize?: string | null, selectedColor?: string | null) => {
    setCart(prevCart => prevCart.filter(item => 
      !(item.id === productId && 
        item.selectedSize === selectedSize && 
        item.selectedColor === selectedColor)
    ));
  };

  const updateQuantity = (productId: string, quantity: number, selectedSize?: string | null, selectedColor?: string | null) => {
    if (quantity <= 0) {
      removeFromCart(productId, selectedSize, selectedColor);
      return;
    }

    const item = cart.find(i => 
      i.id === productId && 
      i.selectedSize === selectedSize && 
      i.selectedColor === selectedColor
    );

    if (item && item.stock !== null && item.stock !== undefined && quantity > item.stock) {
      addToast('warning', `Desculpe, temos apenas ${item.stock} unidades em estoque deste item.`);
      return;
    }

    setCart(prevCart => {
      return prevCart.map(item => 
        (item.id === productId && 
         item.selectedSize === selectedSize && 
         item.selectedColor === selectedColor) 
          ? { ...item, quantity } 
          : item
      );
    });
  };

  const clearCart = () => {
    setCart([]);
  };

  const cartTotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  const cartCount = cart.reduce((count, item) => count + item.quantity, 0);

  return (
    <CartContext.Provider value={{ 
      cart, 
      addToCart, 
      removeFromCart, 
      updateQuantity, 
      clearCart, 
      cartTotal, 
      cartCount 
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
