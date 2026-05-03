'use client';

import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';

export function EmptyOrdersState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
      <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4">
        <ShoppingBag className="w-8 h-8 text-zinc-400" />
      </div>
      <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
        Você ainda não tem pedidos
      </h3>
      <p className="text-zinc-500 dark:text-zinc-400 max-w-xs mb-8">
        Que tal dar uma olhada em nossas novidades e encontrar algo especial para você?
      </p>
      <Link href="/products">
        <button className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 px-8 py-4 rounded-xl text-base font-medium transition-all duration-200 shadow-lg shadow-zinc-200 dark:shadow-none">
          Começar a Comprar
        </button>
      </Link>
    </div>
  );
}
