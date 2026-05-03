'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface SiteConfig {
  site_name: string;
  site_slogan?: string;
  logo_url?: string;
  primary_color?: string;
  theme?: {
    accent?: string;
    promo_bg?: string;
  };
  footer_text?: string;
  admin_email?: string;
  timezone?: string;
}

interface SiteConfigContextType {
  config: SiteConfig;
  loading: boolean;
  refreshConfig: () => Promise<void>;
}

const DEFAULT_CONFIG: SiteConfig = {
  site_name: 'Maré Viva',
  site_slogan: 'Moda Praia Premium',
  primary_color: '#13daec',
  theme: {
    accent: '#13daec',
    promo_bg: '#13daec'
  },
  footer_text: 'Moda praia brasileira com design contemporâneo e sustentável.'
};

const SiteConfigContext = createContext<SiteConfigContextType | undefined>(undefined);

export function SiteConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<SiteConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);

  const fetchConfig = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'site_config')
        .single();

      if (error) throw error;

      if (data && data.value) {
        const val = data.value;
        const primary = val.primary_color || DEFAULT_CONFIG.primary_color;
        
        setConfig({
          site_name: val.site_name || val.name || DEFAULT_CONFIG.site_name,
          site_slogan: val.site_slogan || DEFAULT_CONFIG.site_slogan,
          logo_url: val.logo_url,
          primary_color: primary,
          theme: {
            accent: val.theme?.accent || primary,
            promo_bg: val.theme?.promo_bg || primary
          },
          footer_text: val.footer_text || DEFAULT_CONFIG.footer_text,
          admin_email: val.admin_email,
          timezone: val.timezone
        });
      }
    } catch (err) {
      console.error('Error fetching site config:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Update document title and CSS variables when config changes
  useEffect(() => {
    if (config.site_name) {
      document.title = `${config.site_name} - Moda Praia`;
    }
    
    const root = document.documentElement;
    if (config.primary_color) {
      root.style.setProperty('--primary-color', config.primary_color);
    }
    
    // Set theme colors with fallback to primary_color
    const accent = config.theme?.accent || config.primary_color;
    const promo = config.theme?.promo_bg || config.primary_color;
    
    if (accent) root.style.setProperty('--accent-color', accent);
    if (promo) root.style.setProperty('--promo-color', promo);
    
  }, [config.site_name, config.primary_color, config.theme]);

  return (
    <SiteConfigContext.Provider value={{ config, loading, refreshConfig: fetchConfig }}>
      {children}
    </SiteConfigContext.Provider>
  );
}

export function useSiteConfig() {
  const context = useContext(SiteConfigContext);
  if (context === undefined) {
    throw new Error('useSiteConfig must be used within a SiteConfigProvider');
  }
  return context;
}
