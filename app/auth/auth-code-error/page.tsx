'use client';

import React from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowLeft } from 'lucide-react';

export default function AuthCodeErrorPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center p-6 transition-colors duration-300">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 p-8 text-center">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center text-red-600 dark:text-red-400 mx-auto mb-6">
          <AlertCircle size={32} />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Erro na Autenticação</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8">
          Não foi possível confirmar seu e-mail. O link pode ter expirado ou já ter sido utilizado.
        </p>
        <div className="space-y-4">
          <Link 
            href="/login" 
            className="inline-block w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-4 rounded-xl font-bold uppercase tracking-widest text-sm hover:bg-gray-800 dark:hover:bg-gray-100 transition-all"
          >
            Tentar Login
          </Link>
          <Link 
            href="/" 
            className="flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors"
          >
            <ArrowLeft size={18} />
            Voltar para o site
          </Link>
        </div>
      </div>
    </div>
  );
}
