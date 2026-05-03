'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ShoppingBag, Search, Menu, X, User, LogOut, LayoutDashboard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { useSiteConfig } from '@/context/SiteConfigContext';
import { supabase } from '@/lib/supabase';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const { user, role, isAdmin, isStaff, signOut } = useAuth();
  const { config } = useSiteConfig();

  const getAdminLabel = (userRole: string | null) => {
    switch (userRole) {
      case 'super_admin':
      case 'admin':
        return 'Painel Admin';
      case 'estoque':
        return 'Painel de Estoque';
      case 'financeiro':
        return 'Painel Financeiro';
      case 'atendimento':
        return 'Painel de Atendimento';
      default:
        return 'Painel Admin';
    }
  };
  const { cartCount } = useCart();

  const handleSignOut = async () => {
    try {
      await signOut();
      setIsProfileMenuOpen(false);
      setIsMobileMenuOpen(false);
      router.push('/');
      router.refresh();
    } catch (error) {
      console.error('Erro ao sair:', error);
    }
  };

  const isHome = pathname === '/';
  const isTransparent = isHome && !isScrolled;
  
  const textColor = isTransparent ? "text-white" : "text-gray-900";
  const navBg = isTransparent 
    ? "bg-black/5 backdrop-blur-[2px] py-6 border-b border-transparent" 
    : "bg-white/80 backdrop-blur-md py-4 shadow-md border-b border-gray-100/10";

  const fetchCategories = async () => {
    const { data } = await supabase.from('categories').select('name').limit(5);
    if (data) setCategories(data);
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    
    const init = async () => {
      await fetchCategories();
    };
    init();
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (isProfileMenuOpen && !target.closest('.profile-menu-container')) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isProfileMenuOpen]);

  return (
    <nav className={cn(
      "fixed top-0 left-0 right-0 z-50 transition-all duration-500 px-6 md:px-12",
      navBg
    )}>
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Mobile Menu Toggle */}
        <button 
          className={cn(
            "md:hidden transition-colors",
            textColor
          )}
          onClick={() => setIsMobileMenuOpen(true)}
        >
          <Menu size={24} />
        </button>

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          {config.logo_url ? (
            <div className="relative h-10 w-auto min-w-[40px] flex items-center">
              <img 
                src={config.logo_url} 
                alt={config.site_name} 
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
                className="h-full w-auto object-contain max-w-[150px] transition-transform group-hover:scale-105"
              />
            </div>
          ) : (
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform">
              {config.site_name?.[0].toUpperCase() || 'M'}
            </div>
          )}
          <span className={cn(
            "text-2xl font-bold tracking-tighter transition-colors",
            textColor
          )}>
            {config.site_name.toUpperCase()}
          </span>
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-8">
          <Link 
            href="/" 
            className={cn(
              "text-sm font-bold uppercase tracking-widest hover:text-primary transition-colors",
              textColor
            )}
          >
            Início
          </Link>
          {categories.map((cat) => (
            <Link 
              key={cat.name} 
              href={`/category/${cat.name.toLowerCase()}`} 
              className={cn(
                "text-sm font-bold uppercase tracking-widest hover:text-primary transition-colors",
                textColor
              )}
            >
              {cat.name}
            </Link>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-6">
          <button className={cn(
            "transition-colors",
            textColor,
            "hover:text-primary"
          )}>
            <Search size={20} />
          </button>
          
          <div className="flex items-center gap-4">
            {user ? (
              <div className="relative profile-menu-container">
                <button 
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className={cn(
                    "flex items-center gap-2 transition-colors",
                    textColor,
                    "hover:text-[#13daec]"
                  )}
                >
                  <User size={20} />
                </button>

                {/* Profile Dropdown */}
                {isProfileMenuOpen && (
                  <div className="absolute right-0 mt-4 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-[70] animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-4 py-2 border-b border-gray-50 mb-1">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Minha Conta</p>
                      <p className="text-xs text-gray-600 truncate">{user.email}</p>
                    </div>
                    
                    <Link 
                      href="/profile" 
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors"
                      onClick={() => setIsProfileMenuOpen(false)}
                    >
                      <User size={16} />
                      Meu perfil
                    </Link>

                    <Link 
                      href="/account/orders" 
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors"
                      onClick={() => setIsProfileMenuOpen(false)}
                    >
                      <ShoppingBag size={16} />
                      Meus pedidos
                    </Link>

                    {isStaff && (
                      <Link 
                        href="/admin" 
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-primary font-bold hover:bg-primary/5 transition-colors"
                        onClick={() => setIsProfileMenuOpen(false)}
                      >
                        <LayoutDashboard size={16} />
                        {getAdminLabel(role)}
                      </Link>
                    )}

                    <button 
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors border-t border-gray-50 mt-1"
                    >
                      <LogOut size={16} />
                      Sair
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link 
                href="/login" 
                className={cn(
                  "flex items-center gap-2 text-sm font-bold uppercase tracking-widest transition-colors",
                  textColor,
                  "hover:text-primary"
                )}
              >
                <User size={20} />
                <span className="hidden sm:inline">Entrar</span>
              </Link>
            )}
            
            <Link 
              href="/cart" 
              className={cn(
                "transition-colors relative",
                textColor,
                "hover:text-primary"
              )}
            >
              <ShoppingBag size={20} />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-primary text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-in zoom-in duration-300">
                  {cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <div className={cn(
        "fixed inset-0 bg-white z-[60] transition-transform duration-500 md:hidden",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 flex justify-between items-center border-b">
          <span className="text-xl font-bold tracking-tighter">{config.site_name.toUpperCase()}</span>
          <button onClick={() => setIsMobileMenuOpen(false)}>
            <X size={24} />
          </button>
        </div>
        <div className="p-8 flex flex-col gap-6">
          <Link 
            href="/" 
            className="text-2xl font-bold uppercase tracking-widest text-gray-800"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Início
          </Link>
          {categories.map((cat) => (
            <Link 
              key={cat.name} 
              href={`/category/${cat.name.toLowerCase()}`} 
              className="text-2xl font-bold uppercase tracking-widest text-gray-800"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {cat.name}
            </Link>
          ))}
          <div className="pt-6 border-t">
            {user ? (
              <div className="space-y-6">
                <Link 
                  href="/profile" 
                  className="block text-2xl font-bold uppercase tracking-widest text-gray-800"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Meu perfil
                </Link>
                <Link 
                  href="/account/orders" 
                  className="block text-2xl font-bold uppercase tracking-widest text-gray-800"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Meus pedidos
                </Link>
                {isStaff && (
                  <Link 
                    href="/admin" 
                    className="block text-2xl font-bold uppercase tracking-widest text-primary"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {getAdminLabel(role)}
                  </Link>
                )}
                <button 
                  onClick={handleSignOut}
                  className="block text-2xl font-bold uppercase tracking-widest text-red-500"
                >
                  Sair
                </button>
              </div>
            ) : (
              <Link 
                href="/login" 
                className="text-2xl font-bold uppercase tracking-widest text-gray-800"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Entrar
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
