'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  Package, 
  Tags, 
  ShoppingCart, 
  Users, 
  Shield,
  BarChart2,
  Image as ImageIcon, 
  Settings, 
  ChevronLeft, 
  Menu,
  LogOut,
  ExternalLink,
  Loader2,
  Truck,
  CreditCard
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { useSiteConfig } from '@/context/SiteConfigContext';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/admin', roles: ['super_admin', 'admin', 'financeiro'] },
  { icon: BarChart2, label: 'Relatórios', href: '/admin/reports', roles: ['super_admin', 'admin', 'financeiro'] },
  { icon: Package, label: 'Produtos', href: '/admin/products', roles: ['super_admin', 'admin', 'estoque'] },
  { icon: Tags, label: 'Categorias', href: '/admin/categories', roles: ['super_admin', 'admin', 'estoque'] },
  { icon: ShoppingCart, label: 'Pedidos', href: '/admin/orders', roles: ['super_admin', 'admin', 'financeiro', 'atendimento'] },
  { icon: Users, label: 'Clientes', href: '/admin/customers', roles: ['super_admin', 'admin'] },
  { icon: Shield, label: 'Usuários', href: '/admin/users', roles: ['super_admin', 'admin'] },
  { icon: Tags, label: 'Cupons', href: '/admin/coupons', roles: ['super_admin', 'admin'] },
  { icon: Truck, label: 'Frete', href: '/admin/shipping', roles: ['super_admin', 'admin'] },
  { icon: CreditCard, label: 'Pagamentos', href: '/admin/payments', roles: ['super_admin', 'admin'] },
  { icon: ImageIcon, label: 'Banners', href: '/admin/banners', roles: ['super_admin', 'admin'] },
  { icon: Settings, label: 'Configurações', href: '/admin/settings', roles: ['super_admin', 'admin'] },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const pathname = usePathname();
  const router = useRouter();
  const { user, role, isStaff, loading, signOut } = useAuth();
  const { config } = useSiteConfig();

  const getRoleLabel = (userRole: string | null) => {
    switch (userRole) {
      case 'super_admin':
      case 'admin':
        return 'Admin';
      case 'estoque':
        return 'Estoque';
      case 'financeiro':
        return 'Financeiro';
      case 'atendimento':
        return 'Atendimento';
      default:
        return 'Admin';
    }
  };

  useEffect(() => {
    if (!loading) {
      if (!isStaff) {
        router.push('/login');
        return;
      }

      // Filter menu items based on user role
      const allowedMenuItems = menuItems.filter(item => role && item.roles.includes(role));

      // Check if current route is allowed for the current role
      const currentMenuItem = menuItems.find(item => 
        pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))
      );

      if (currentMenuItem && role && !currentMenuItem.roles.includes(role)) {
        // Redireciona para a primeira página permitida para este cargo
        if (allowedMenuItems.length > 0) {
          router.push(allowedMenuItems[0].href);
        } else {
          router.push('/login');
        }
      }
    }
  }, [isStaff, loading, router, pathname, role]);

  const handleSignOut = React.useCallback(async () => {
    try {
      await signOut();
      router.push('/login');
    } catch (error) {
      console.error('Erro ao sair:', error);
    }
  }, [signOut, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-[#13daec] mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  if (!isStaff) return null;

  // Filter menu items based on user role
  const filteredMenuItems = menuItems.filter(item => role && item.roles.includes(role));

  return (
    <div className="min-h-screen bg-[#f0f0f1] dark:bg-gray-950 flex transition-colors duration-300">
      {/* Sidebar */}
      <aside 
        className={cn(
          "bg-[#2c3338] dark:bg-gray-900 text-white transition-all duration-300 flex flex-col fixed h-full z-50",
          isSidebarOpen ? "w-64" : "w-16"
        )}
      >
        {/* Sidebar Header */}
        <div className="h-16 flex items-center px-4 bg-[#1d2327] dark:bg-black overflow-hidden">
          {config.logo_url && isSidebarOpen ? (
            <div className="h-8 w-auto flex items-center mr-2">
              <img 
                src={config.logo_url} 
                alt="Logo" 
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
                className="h-full w-auto object-contain max-w-[120px]" 
              />
            </div>
          ) : (
            <div className={cn("font-bold text-xl overflow-hidden whitespace-nowrap transition-all", !isSidebarOpen && "w-0 opacity-0")}>
              {config.site_name}
            </div>
          )}
          <span className={cn("text-gray-400 text-xs font-normal ml-1 transition-all", !isSidebarOpen && "hidden")}>
            {getRoleLabel(role)}
          </span>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="ml-auto p-1 hover:bg-gray-700 dark:hover:bg-gray-800 rounded text-gray-400"
          >
            {isSidebarOpen ? <ChevronLeft size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Sidebar Menu */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {filteredMenuItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center px-4 py-3 text-sm transition-colors group",
                  isActive ? "bg-[#2271b1] text-white" : "text-gray-300 hover:bg-[#32373c] dark:hover:bg-gray-800 hover:text-[#72aee6]"
                )}
              >
                <item.icon size={20} className={cn("flex-shrink-0", isActive ? "text-white" : "text-gray-400 group-hover:text-[#72aee6]")} />
                <span className={cn("ml-3 transition-all duration-300 overflow-hidden whitespace-nowrap", !isSidebarOpen && "w-0 opacity-0")}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-gray-700 dark:border-gray-800">
          <Link 
            href="/" 
            className="flex items-center text-sm text-gray-400 hover:text-white mb-4"
          >
            <ExternalLink size={18} />
            <span className={cn("ml-3 overflow-hidden whitespace-nowrap", !isSidebarOpen && "w-0 opacity-0")}>Ver Site</span>
          </Link>
          <button 
            onClick={handleSignOut}
            className="flex items-center text-sm text-gray-400 hover:text-red-400 w-full"
          >
            <LogOut size={18} />
            <span className={cn("ml-3 overflow-hidden whitespace-nowrap", !isSidebarOpen && "w-0 opacity-0")}>Sair</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={cn(
        "flex-1 transition-all duration-300 min-h-screen flex flex-col",
        isSidebarOpen ? "ml-64" : "ml-16"
      )}>
        {/* Top Bar */}
        <header className="h-12 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center px-6 justify-between sticky top-0 z-40 transition-colors duration-300">
          <div className="text-sm text-gray-900 dark:text-white font-medium">
            {filteredMenuItems.find(item => item.href === pathname || (item.href !== '/admin' && pathname.startsWith(item.href)))?.label || 'Dashboard'}
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-700 dark:text-gray-200">Olá, {user?.email?.split('@')[0]}</span>
            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 flex items-center justify-center text-xs font-bold text-gray-900 dark:text-white">
              {user?.email?.[0].toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-8 flex-1">
          {children}
        </div>

        {/* Admin Footer */}
        <footer className="p-6 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 transition-colors duration-300">
          Obrigado por criar com {config.site_name}. Versão 1.0.0
        </footer>
      </main>
    </div>
  );
}
