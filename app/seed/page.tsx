'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, CheckCircle2, AlertCircle, Database } from 'lucide-react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function SeedPage() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const runSeed = async () => {
    try {
      setStatus('loading');
      setMessage('Limpando dados antigos (opcional)...');

      // 1. Handle Categories
      setMessage('Verificando categorias existentes...');
      const { data: existingCats } = await supabase.from('categories').select('*');
      const existingNames = (existingCats || []).map(c => c.name);

      const categoriesToInsert = [
        { name: 'Biquíni', image_url: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?q=80&w=800&auto=format&fit=crop' },
        { name: 'Maiô', image_url: 'https://images.unsplash.com/photo-1583316174775-bd6dc0e9f298?q=80&w=800&auto=format&fit=crop' },
        { name: 'Saída de Praia', image_url: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?q=80&w=800&auto=format&fit=crop' }
      ];

      if (categoriesToInsert.length > 0) {
        setMessage('Atualizando categorias...');
        const { error: catError } = await supabase
          .from('categories')
          .upsert(categoriesToInsert, { onConflict: 'name' });
        if (catError) throw catError;
      }

      // Fetch all categories to get IDs
      const { data: allCats, error: fetchCatError } = await supabase.from('categories').select('*');
      if (fetchCatError) throw fetchCatError;

      const catMap: Record<string, string> = {};
      allCats?.forEach(cat => {
        catMap[cat.name] = cat.id;
      });

      // 2. Handle Products
      setMessage('Verificando produtos existentes...');
      const { data: existingProds } = await supabase.from('products').select('name');
      const existingProdNames = (existingProds || []).map(p => p.name);

      const productsToInsert = [
        {
          name: 'Biquíni Tropical Palms',
          description: 'Biquíni com estampa tropical exclusiva, tecido de alta qualidade com proteção UV50+.',
          price: 189.90,
          category_id: catMap['Biquíni'],
          image_url: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?q=80&w=800&auto=format&fit=crop'
        },
        {
          name: 'Biquíni Azul Sereno',
          description: 'Conjunto clássico em tom azul pastel, confortável e elegante para todos os tipos de corpo.',
          price: 159.90,
          category_id: catMap['Biquíni'],
          image_url: 'https://images.unsplash.com/photo-1583316174775-bd6dc0e9f298?q=80&w=800&auto=format&fit=crop'
        },
        {
          name: 'Maiô Elegance Black',
          description: 'Maiô preto sofisticado com decote em V e detalhes em dourado. Perfeito para o resort.',
          price: 229.90,
          category_id: catMap['Maiô'],
          image_url: 'https://images.unsplash.com/photo-1597196177403-44d2966d7547?q=80&w=800&auto=format&fit=crop'
        },
        {
          name: 'Maiô Sunset Gradient',
          description: 'Maiô com degradê inspirado no pôr do sol. Tecido brilhante e resistente ao cloro.',
          price: 249.90,
          category_id: catMap['Maiô'],
          image_url: 'https://images.unsplash.com/photo-1596450514735-24821de9e931?q=80&w=800&auto=format&fit=crop'
        },
        {
          name: 'Saída de Praia Rendada',
          description: 'Saída de praia curta em renda branca delicada. Ajuste na cintura para melhor caimento.',
          price: 129.90,
          category_id: catMap['Saída de Praia'],
          image_url: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?q=80&w=800&auto=format&fit=crop'
        },
        {
          name: 'Saída de Praia Longa Floral',
          description: 'Saída de praia longa e fluida com estampa floral vibrante. Ideal para passeios à beira-mar.',
          price: 199.90,
          category_id: catMap['Saída de Praia'],
          image_url: 'https://images.unsplash.com/photo-1590602846989-e99596d2a6ee?q=80&w=800&auto=format&fit=crop'
        }
      ];

      if (productsToInsert.length > 0) {
        setMessage('Atualizando produtos...');
        const { error: prodError } = await supabase
          .from('products')
          .upsert(productsToInsert, { onConflict: 'name' });
        if (prodError) throw prodError;
      }

      setStatus('success');
      setMessage('Banco de dados populado com sucesso! Você já pode voltar para a Home.');
    } catch (err: any) {
      console.error('Seed error:', err);
      setStatus('error');
      setMessage(`Erro ao popular banco: ${err.message || 'Erro desconhecido'}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <main className="flex-grow flex items-center justify-center p-6 pt-32">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center border border-gray-100">
          <div className="w-20 h-20 bg-[#13daec]/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Database className="text-[#13daec]" size={40} />
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-4 tracking-tighter">
            Configuração Inicial
          </h1>
          
          <p className="text-gray-500 mb-8 leading-relaxed">
            Clique no botão abaixo para inserir as categorias e produtos de teste no seu banco de dados Supabase.
          </p>

          {status === 'idle' && (
            <button 
              onClick={runSeed}
              className="w-full bg-gray-900 text-white py-4 rounded-full font-bold uppercase tracking-widest text-sm hover:bg-gray-800 transition-all flex items-center justify-center gap-2"
            >
              Popular Banco de Dados
            </button>
          )}

          {status === 'loading' && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <Loader2 className="animate-spin text-[#13daec]" size={40} />
              </div>
              <p className="text-sm font-medium text-gray-600 animate-pulse">{message}</p>
            </div>
          )}

          {status === 'success' && (
            <div className="space-y-6">
              <div className="flex justify-center text-green-500">
                <CheckCircle2 size={60} />
              </div>
              <p className="text-green-600 font-medium">{message}</p>
              <Link 
                href="/"
                className="block w-full bg-[#13daec] text-white py-4 rounded-full font-bold uppercase tracking-widest text-sm hover:bg-[#11c5d4] transition-all"
              >
                Voltar para a Home
              </Link>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-6">
              <div className="flex justify-center text-red-500">
                <AlertCircle size={60} />
              </div>
              <p className="text-red-600 font-medium">{message}</p>
              <button 
                onClick={runSeed}
                className="w-full bg-gray-900 text-white py-4 rounded-full font-bold uppercase tracking-widest text-sm hover:bg-gray-800 transition-all"
              >
                Tentar Novamente
              </button>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
