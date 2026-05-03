'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Instagram, Facebook, Twitter, Mail, Phone, MapPin } from 'lucide-react';
import { useSiteConfig } from '@/context/SiteConfigContext';

export default function Footer() {
  const { config } = useSiteConfig();

  return (
    <footer className="bg-gray-900 text-white pt-20 pb-10 px-6 md:px-12">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
        {/* Brand */}
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            {config.logo_url ? (
              <div className="relative h-10 w-auto flex items-center">
                <img 
                  src={config.logo_url} 
                  alt={config.site_name} 
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                  className="h-full w-auto object-contain max-w-[150px]"
                />
              </div>
            ) : (
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold text-xl">
                {config.site_name?.[0].toUpperCase() || 'M'}
              </div>
            )}
            <span className="text-2xl font-bold tracking-tighter">{config.site_name.toUpperCase()}</span>
          </div>
          <p className="text-gray-400 text-sm leading-relaxed">
            {config.footer_text || "Moda praia brasileira com design contemporâneo e sustentável. Criamos peças que celebram a beleza natural e o espírito livre do verão."}
          </p>
          <div className="flex gap-4">
            <Link href="#" className="w-10 h-10 rounded-full border border-gray-700 flex items-center justify-center hover:bg-accent hover:border-accent transition-all">
              <Instagram size={18} />
            </Link>
            <Link href="#" className="w-10 h-10 rounded-full border border-gray-700 flex items-center justify-center hover:bg-accent hover:border-accent transition-all">
              <Facebook size={18} />
            </Link>
            <Link href="#" className="w-10 h-10 rounded-full border border-gray-700 flex items-center justify-center hover:bg-accent hover:border-accent transition-all">
              <Twitter size={18} />
            </Link>
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <h4 className="text-lg font-bold mb-6 uppercase tracking-widest">Navegação</h4>
          <ul className="space-y-4 text-sm text-gray-400">
            <li><Link href="/" className="hover:text-accent transition-colors">Início</Link></li>
            <li><Link href="/category/biquíni" className="hover:text-accent transition-colors">Biquínis</Link></li>
            <li><Link href="/category/maiô" className="hover:text-accent transition-colors">Maiôs</Link></li>
            <li><Link href="/category/saída de praia" className="hover:text-accent transition-colors">Saídas de Praia</Link></li>
            <li><Link href="/category/acessórios" className="hover:text-accent transition-colors">Acessórios</Link></li>
          </ul>
        </div>

        {/* Customer Service */}
        <div>
          <h4 className="text-lg font-bold mb-6 uppercase tracking-widest">Ajuda</h4>
          <ul className="space-y-4 text-sm text-gray-400">
            <li><Link href="/profile" className="hover:text-accent transition-colors">Minha Conta</Link></li>
            <li><Link href="/profile" className="hover:text-accent transition-colors">Rastrear Pedido</Link></li>
            <li><Link href="/profile" className="hover:text-accent transition-colors">Trocas e Devoluções</Link></li>
            <li><Link href="/profile" className="hover:text-accent transition-colors">Guia de Tamanhos</Link></li>
            <li><Link href="/profile" className="hover:text-accent transition-colors">Política de Privacidade</Link></li>
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h4 className="text-lg font-bold mb-6 uppercase tracking-widest">Contato</h4>
          <ul className="space-y-4 text-sm text-gray-400">
            <li className="flex items-center gap-3">
              <MapPin size={18} className="text-accent" />
              <span>Rua das Palmeiras, 123 - Rio de Janeiro, RJ</span>
            </li>
            <li className="flex items-center gap-3">
              <Phone size={18} className="text-accent" />
              <span>(21) 99999-9999</span>
            </li>
            <li className="flex items-center gap-3">
              <Mail size={18} className="text-accent" />
              <span>{config.admin_email || "contato@mareviva.com.br"}</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto pt-10 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center gap-6">
        <p className="text-xs text-gray-500">
          © {new Date().getFullYear()} {config.site_name}. Todos os direitos reservados.
        </p>
        <div className="flex gap-4 grayscale opacity-50 items-center">
          <div className="relative h-4 w-12">
            <Image src="https://cdn.simpleicons.org/visa/white" alt="Visa" fill className="object-contain" unoptimized />
          </div>
          <div className="relative h-4 w-12">
            <Image src="https://cdn.simpleicons.org/mastercard/white" alt="Mastercard" fill className="object-contain" unoptimized />
          </div>
          <div className="relative h-4 w-12">
            <Image src="https://cdn.simpleicons.org/paypal/white" alt="PayPal" fill className="object-contain" unoptimized />
          </div>
        </div>
      </div>
    </footer>
  );
}
