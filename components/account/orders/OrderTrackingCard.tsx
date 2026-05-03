'use client';

import { Truck, ExternalLink, Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface OrderTrackingCardProps {
  carrier?: string;
  trackingCode?: string;
  trackingUrl?: string;
  shippedAt?: string;
  deliveredAt?: string;
}

export function OrderTrackingCard({
  carrier,
  trackingCode,
  trackingUrl,
  shippedAt,
  deliveredAt,
}: OrderTrackingCardProps) {
  const [copied, setCopied] = useState(false);

  if (!trackingCode && !carrier) return null;

  const handleCopy = () => {
    if (trackingCode) {
      navigator.clipboard.writeText(trackingCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-2xl p-6 shadow-xl shadow-zinc-200 dark:shadow-none">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-white/10 dark:bg-zinc-900/10 rounded-xl flex items-center justify-center">
          <Truck className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider">Rastreamento</h3>
          <p className="text-xs opacity-60">Acompanhe seu pedido em tempo real</p>
        </div>
      </div>

      <div className="space-y-4">
        {carrier && (
          <div className="flex justify-between items-center py-3 border-b border-white/10 dark:border-zinc-900/10">
            <span className="text-xs opacity-60 uppercase font-bold">Transportadora</span>
            <span className="text-sm font-bold">{carrier}</span>
          </div>
        )}

        {trackingCode && (
          <div className="flex justify-between items-center py-3 border-b border-white/10 dark:border-zinc-900/10">
            <span className="text-xs opacity-60 uppercase font-bold">Código</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono font-bold tracking-wider">{trackingCode}</span>
              <button
                onClick={handleCopy}
                className="p-1.5 hover:bg-white/10 dark:hover:bg-zinc-900/10 rounded-lg transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        )}

        {shippedAt && (
          <div className="flex justify-between items-center py-3 border-b border-white/10 dark:border-zinc-900/10">
            <span className="text-xs opacity-60 uppercase font-bold">Enviado em</span>
            <span className="text-sm font-bold">
              {new Date(shippedAt).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          </div>
        )}

        {deliveredAt && (
          <div className="flex justify-between items-center py-3 border-b border-white/10 dark:border-zinc-900/10">
            <span className="text-xs opacity-60 uppercase font-bold">Entregue em</span>
            <span className="text-sm font-bold">
              {new Date(deliveredAt).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          </div>
        )}
      </div>

      {trackingUrl && (
        <a
          href={trackingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-8 flex items-center justify-center gap-2 w-full bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 py-4 rounded-xl text-sm font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all duration-200"
        >
          Rastrear no site da transportadora
          <ExternalLink className="w-4 h-4" />
        </a>
      )}
    </div>
  );
}
