'use client';

import React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AccountSectionCardProps {
  id: string;
  title: string;
  icon: React.ReactNode;
  isActive: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  comingSoon?: boolean;
}

export function AccountSectionCard({ 
  id, 
  title, 
  icon, 
  isActive, 
  onToggle, 
  children,
  comingSoon = false
}: AccountSectionCardProps) {
  return (
    <div 
      className={cn(
        "bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm transition-all duration-300",
        comingSoon ? "opacity-70 grayscale-[0.5]" : ""
      )}
    >
      <button 
        onClick={comingSoon ? undefined : onToggle}
        disabled={comingSoon}
        className={cn(
          "w-full flex items-center justify-between p-6 transition-colors",
          comingSoon ? "cursor-not-allowed" : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
        )}
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-gray-600 dark:text-gray-400">
            {icon}
          </div>
          <div className="text-left">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              {title}
              {comingSoon && (
                <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full uppercase tracking-widest font-black">
                  Em breve
                </span>
              )}
            </h2>
          </div>
        </div>
        {!comingSoon && (
          <ChevronDown 
            size={20} 
            className={cn(
              "text-gray-400 transition-transform duration-300",
              isActive ? "rotate-180" : ""
            )} 
          />
        )}
      </button>
      
      <div className={cn(
        "px-6 overflow-hidden transition-all duration-300 ease-in-out",
        isActive ? "max-h-[1000px] pb-8 opacity-100" : "max-h-0 opacity-0"
      )}>
        <div className="border-t border-gray-50 dark:border-gray-800 pt-6">
          {children}
        </div>
      </div>
    </div>
  );
}
