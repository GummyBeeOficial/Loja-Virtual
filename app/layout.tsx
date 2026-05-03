import type {Metadata} from 'next';
import './globals.css'; // Global styles
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import { SiteConfigProvider } from '@/context/SiteConfigContext';
import { ToastProvider } from '@/context/ToastContext';

export const metadata: Metadata = {
  title: 'Maré Viva - Moda Praia',
  description: 'Loja de moda praia premium com painel administrativo completo.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ToastProvider>
          <AuthProvider>
            <SiteConfigProvider>
              <CartProvider>
                {children}
              </CartProvider>
            </SiteConfigProvider>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
