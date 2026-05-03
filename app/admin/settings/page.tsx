'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Save, Globe, Palette, Layout, Mail, ShieldCheck, Loader2, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

import { useAuth } from '@/context/AuthContext';
import { useSiteConfig } from '@/context/SiteConfigContext';
import { useToast } from '@/context/ToastContext';

export default function SettingsPage() {
  const { role, isStaff, loading: authLoading } = useAuth();
  const { refreshConfig } = useSiteConfig();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Estado para a aba Geral
  const [generalSettings, setGeneralSettings] = useState({
    site_name: 'Maré Viva',
    site_slogan: 'Moda Praia Premium',
    admin_email: 'contato@mareviva.com.br',
    timezone: 'UTC-3 (São Paulo)'
  });

  // Estado auxiliar para preservar campos de outras abas (Aparência, etc)
  const [fullSiteConfig, setFullSiteConfig] = useState<any>({});

  const fetchSettings = useCallback(async () => {
    if (!isStaff || (role !== 'admin' && role !== 'super_admin')) return;
    
    setLoading(true);
    try {
      // Busca todas as configurações de uma vez
      const { data, error } = await supabase
        .from('settings')
        .select('*');

      if (error) throw error;

      if (data) {
        // Processa Configurações Gerais (site_config)
        const site = data.find(s => s.key === 'site_config');
        if (site) {
          setFullSiteConfig(site.value);
          const newGeneralSettings = {
            site_name: site.value.site_name || site.value.name || 'Maré Viva',
            site_slogan: site.value.site_slogan || 'Moda Praia Premium',
            admin_email: site.value.admin_email || 'contato@mareviva.com.br',
            timezone: site.value.timezone || 'UTC-3 (São Paulo)'
          };
          setGeneralSettings(newGeneralSettings);
        }
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    } finally {
      setLoading(false);
    }
  }, [isStaff, role]);

  useEffect(() => {
    if (isStaff && (role === 'admin' || role === 'super_admin')) {
      fetchSettings();
    }
  }, [isStaff, role, fetchSettings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Salva Configurações Gerais (Mesclando com o que já existe para não perder logo/cores)
      const updatedSiteConfig = {
        ...fullSiteConfig,
        site_name: generalSettings.site_name,
        name: generalSettings.site_name, // Mantém compatibilidade com o campo 'name' original
        site_slogan: generalSettings.site_slogan,
        admin_email: generalSettings.admin_email,
        timezone: generalSettings.timezone,
        primary_color: fullSiteConfig.primary_color,
        theme: {
          ...fullSiteConfig.theme,
          accent: fullSiteConfig.theme?.accent || fullSiteConfig.primary_color,
          promo_bg: fullSiteConfig.theme?.promo_bg || fullSiteConfig.primary_color
        },
        logo_url: fullSiteConfig.logo_url,
        footer_text: fullSiteConfig.footer_text
      };

      const { error: siteError } = await supabase
        .from('settings')
        .upsert({ key: 'site_config', value: updatedSiteConfig });

      if (siteError) {
        throw siteError;
      }

      // Atualiza o estado local do config completo para refletir o que foi salvo
      setFullSiteConfig(updatedSiteConfig);
      
      // Atualiza o contexto global do site
      await refreshConfig();
      
      addToast('success', 'Configurações salvas com sucesso!');
    } catch (err) {
      console.error('Error saving settings:', err);
      addToast('error', 'Erro ao salvar configurações.');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'general', label: 'Geral', icon: Globe },
    { id: 'appearance', label: 'Aparência', icon: Palette },
    { id: 'store', label: 'Loja', icon: Layout },
    { id: 'email', label: 'E-mail', icon: Mail },
    { id: 'security', label: 'Segurança', icon: ShieldCheck },
  ];

  if (authLoading) return null;
  if (!isStaff || (role !== 'admin' && role !== 'super_admin')) return null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Configurações</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Personalize o funcionamento e a aparência do seu site.</p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={handleSave}
            disabled={saving}
            className="bg-[#2271b1] text-white px-6 py-2 rounded font-bold text-sm flex items-center gap-2 hover:bg-[#135e96] transition-colors shadow-sm disabled:opacity-50"
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Tabs Sidebar */}
        <div className="w-full lg:w-64 flex-shrink-0">
          <div className="bg-white dark:bg-gray-900 rounded shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors border-l-4",
                  activeTab === tab.id 
                    ? "bg-blue-50 dark:bg-gray-800 text-[#2271b1] dark:text-[#72aee6] border-[#2271b1]" 
                    : "text-gray-600 dark:text-gray-300 border-transparent hover:bg-gray-50 dark:hover:bg-gray-800"
                )}
              >
                <tab.icon size={18} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Settings Form */}
        <div className="flex-1">
          <div className="bg-white dark:bg-gray-900 p-8 rounded shadow-sm border border-gray-200 dark:border-gray-800 space-y-8">
            {activeTab === 'general' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-800 pb-4">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Configurações Gerais</h3>
                  {loading && <Loader2 size={20} className="animate-spin text-[#2271b1]" />}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-200">Nome do Site</label>
                    <input 
                      type="text" 
                      value={generalSettings.site_name}
                      onChange={(e) => setGeneralSettings({...generalSettings, site_name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded text-sm text-gray-900 dark:text-white bg-transparent focus:ring-1 focus:ring-[#2271b1] outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-200">Slogan do Site</label>
                    <input 
                      type="text" 
                      value={generalSettings.site_slogan}
                      onChange={(e) => setGeneralSettings({...generalSettings, site_slogan: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded text-sm text-gray-900 dark:text-white bg-transparent focus:ring-1 focus:ring-[#2271b1] outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500"
                    />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-200">E-mail de Administração</label>
                    <input 
                      type="email" 
                      value={generalSettings.admin_email}
                      onChange={(e) => setGeneralSettings({...generalSettings, admin_email: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded text-sm text-gray-900 dark:text-white bg-transparent focus:ring-1 focus:ring-[#2271b1] outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500"
                    />
                    <p className="text-[10px] text-gray-400 dark:text-gray-500">Este endereço é usado para fins de administração.</p>
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-200">Fuso Horário</label>
                    <select 
                      value={generalSettings.timezone}
                      onChange={(e) => setGeneralSettings({...generalSettings, timezone: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded text-sm text-gray-900 dark:text-white bg-transparent focus:ring-1 focus:ring-[#2271b1] outline-none"
                    >
                      <option>UTC-3 (São Paulo)</option>
                      <option>UTC-4 (Manaus)</option>
                      <option>UTC-5 (Rio Branco)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-800 pb-4">Aparência do Site</h3>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-200">Cor Principal</label>
                    <div className="flex items-center gap-4">
                      <input 
                        type="color" 
                        value={fullSiteConfig.primary_color || "#13daec"}
                        onChange={(e) => setFullSiteConfig({...fullSiteConfig, primary_color: e.target.value})}
                        className="w-12 h-12 rounded cursor-pointer border-none bg-transparent"
                      />
                      <input 
                        type="text" 
                        value={fullSiteConfig.primary_color || "#13daec"}
                        onChange={(e) => setFullSiteConfig({...fullSiteConfig, primary_color: e.target.value})}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded text-sm text-gray-900 dark:text-white bg-transparent w-32 outline-none focus:ring-1 focus:ring-[#2271b1]"
                        placeholder="#000000"
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500">Esta cor será aplicada em botões, links e elementos de destaque em todo o site.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700 dark:text-gray-200">Cor de Destaque (Accent)</label>
                      <div className="flex items-center gap-4">
                        <input 
                          type="color" 
                          value={fullSiteConfig.theme?.accent || fullSiteConfig.primary_color || "#13daec"}
                          onChange={(e) => setFullSiteConfig({
                            ...fullSiteConfig, 
                            theme: { ...fullSiteConfig.theme, accent: e.target.value }
                          })}
                          className="w-10 h-10 rounded cursor-pointer border-none bg-transparent"
                        />
                        <input 
                          type="text" 
                          value={fullSiteConfig.theme?.accent || fullSiteConfig.primary_color || "#13daec"}
                          onChange={(e) => setFullSiteConfig({
                            ...fullSiteConfig, 
                            theme: { ...fullSiteConfig.theme, accent: e.target.value }
                          })}
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded text-sm text-gray-900 dark:text-white bg-transparent outline-none focus:ring-1 focus:ring-[#2271b1]"
                        />
                      </div>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 italic">Usada para badges, ícones e detalhes secundários.</p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700 dark:text-gray-200">Fundo de Banners (Promo)</label>
                      <div className="flex items-center gap-4">
                        <input 
                          type="color" 
                          value={fullSiteConfig.theme?.promo_bg || fullSiteConfig.primary_color || "#13daec"}
                          onChange={(e) => setFullSiteConfig({
                            ...fullSiteConfig, 
                            theme: { ...fullSiteConfig.theme, promo_bg: e.target.value }
                          })}
                          className="w-10 h-10 rounded cursor-pointer border-none bg-transparent"
                        />
                        <input 
                          type="text" 
                          value={fullSiteConfig.theme?.promo_bg || fullSiteConfig.primary_color || "#13daec"}
                          onChange={(e) => setFullSiteConfig({
                            ...fullSiteConfig, 
                            theme: { ...fullSiteConfig.theme, promo_bg: e.target.value }
                          })}
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded text-sm text-gray-900 dark:text-white bg-transparent outline-none focus:ring-1 focus:ring-[#2271b1]"
                        />
                      </div>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 italic">Cor de fundo para banners promocionais e newsletter.</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-200">Logo do Site (URL)</label>
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 flex items-center justify-center overflow-hidden">
                          {fullSiteConfig.logo_url ? (
                            <img src={fullSiteConfig.logo_url} alt="Preview Logo" className="w-full h-full object-contain" />
                          ) : (
                            <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-bold">Sem Logo</span>
                          )}
                        </div>
                        <input 
                          type="text" 
                          value={fullSiteConfig.logo_url || ""}
                          onChange={(e) => setFullSiteConfig({...fullSiteConfig, logo_url: e.target.value})}
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded text-sm text-gray-900 dark:text-white bg-transparent outline-none focus:ring-1 focus:ring-[#2271b1] placeholder:text-gray-400 dark:placeholder:text-gray-500"
                          placeholder="https://exemplo.com/logo.png"
                        />
                      </div>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 italic">Insira a URL direta da imagem da sua logomarca (PNG, SVG ou JPG).</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-200">Texto do Rodapé</label>
                    <textarea 
                      rows={4}
                      value={fullSiteConfig.footer_text || "Moda praia brasileira com design contemporâneo e sustentável."}
                      onChange={(e) => setFullSiteConfig({...fullSiteConfig, footer_text: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded text-sm text-gray-900 dark:text-white bg-transparent focus:ring-1 focus:ring-[#2271b1] outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500"
                    ></textarea>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'store' && (
              <div className="space-y-6 text-center py-12">
                <Layout size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Loja (Em breve)</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Configurações de estoque e catálogo serão implementadas aqui.</p>
              </div>
            )}

            {activeTab === 'email' && (
              <div className="space-y-6 text-center py-12">
                <Mail size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">E-mail (Em breve)</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Configurações de SMTP e templates de e-mail.</p>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-6 text-center py-12">
                <ShieldCheck size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Segurança (Em breve)</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Políticas de senha e autenticação de dois fatores.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
