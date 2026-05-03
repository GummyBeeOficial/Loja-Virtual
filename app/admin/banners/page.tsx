'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Edit2, Trash2, Eye, EyeOff, Loader2, X, Upload, Save, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import ProductImage from '@/components/ProductImage';
import { createClient } from '@/lib/supabase/client';

import { useAuth } from '@/context/AuthContext';

export default function BannersPage() {
  const { role, isStaff, loading: authLoading } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const [banners, setBanners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<any>(null);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    image_url: '',
    link_url: '/category/todos',
    is_active: true,
    order: 0
  });

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchBanners = React.useCallback(async () => {
    if (!isStaff || (role !== 'admin' && role !== 'super_admin' && role !== 'estoque')) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('banners')
        .select('*')
        .order('order', { ascending: true });
      
      if (error) throw error;
      setBanners(data || []);
    } catch (err: any) {
      console.error('Error fetching banners:', err.message || err);
    } finally {
      setLoading(false);
    }
  }, [supabase, isStaff, role]);

  useEffect(() => {
    if (isStaff && (role === 'admin' || role === 'super_admin' || role === 'estoque')) {
      fetchBanners();
    }
  }, [isStaff, role, fetchBanners]);

  const handleOpenModal = (banner: any = null) => {
    if (banner) {
      setEditingBanner(banner);
      setFormData({
        title: banner.title || '',
        subtitle: banner.subtitle || '',
        image_url: banner.image_url || '',
        link_url: banner.link_url || '/category/todos',
        is_active: banner.is_active ?? true,
        order: banner.order || 0
      });
    } else {
      setEditingBanner(null);
      setFormData({
        title: '',
        subtitle: '',
        image_url: '',
        link_url: '/category/todos',
        is_active: true,
        order: 0
      });
    }
    setIsModalOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `banners/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('products') // Using existing 'products' bucket for simplicity, or create 'banners'
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('products')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, image_url: publicUrl }));
    } catch (err) {
      console.error('Error uploading image:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        title: formData.title,
        subtitle: formData.subtitle,
        image_url: formData.image_url,
        link_url: formData.link_url,
        is_active: formData.is_active,
        order: formData.order
      };

      if (editingBanner) {
        const { error } = await supabase
          .from('banners')
          .update(payload)
          .eq('id', editingBanner.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('banners')
          .insert([payload]);
        if (error) throw error;
      }

      setIsModalOpen(false);
      fetchBanners();
    } catch (err: any) {
      console.error('Error saving banner:', err.message || err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('banners')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setBanners(prev => prev.filter(b => b.id !== id));
      setDeletingId(null);
    } catch (err: any) {
      console.error('Error deleting banner:', err.message || err);
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (banner: any) => {
    try {
      const { error } = await supabase
        .from('banners')
        .update({ is_active: !banner.is_active })
        .eq('id', banner.id);
      if (error) throw error;
      fetchBanners();
    } catch (err: any) {
      console.error('Error toggling status:', err.message || err);
    }
  };

  if (authLoading) return null;
  if (!isStaff || (role !== 'admin' && role !== 'super_admin' && role !== 'estoque')) return null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Banners</h1>
          <p className="text-sm text-gray-500 dark:text-gray-300">Gerencie os banners da página inicial.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-[#2271b1] text-white px-4 py-2 rounded font-bold text-sm flex items-center gap-2 hover:bg-[#135e96] transition-colors shadow-sm"
        >
          <Plus size={18} />
          Adicionar Banner
        </button>
      </div>

      {loading && banners.length === 0 ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-[#2271b1]" />
        </div>
      ) : (
        <div className="space-y-4">
          {banners.length > 0 ? banners.map((banner, index) => (
            <div key={banner.id} className="bg-white dark:bg-gray-900 rounded shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col md:flex-row">
              <div className="w-full md:w-64 h-40 bg-gray-100 dark:bg-gray-800 flex-shrink-0 relative">
                <ProductImage 
                  src={banner.image_url} 
                  alt={banner.title} 
                  fill
                  className="object-cover" 
                />
              </div>
              <div className="flex-1 p-6 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">{banner.title}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-300 mt-1">{banner.subtitle}</p>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleOpenModal(banner)}
                        className="p-2 text-gray-400 hover:text-[#2271b1] transition-colors"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => toggleStatus(banner)}
                        className={cn("p-2 transition-colors", banner.is_active ? "text-green-500 hover:text-green-600" : "text-gray-400 hover:text-gray-500")}
                      >
                        {banner.is_active ? <Eye size={18} /> : <EyeOff size={18} />}
                      </button>
                      
                      {deletingId === banner.id ? (
                        <div className="flex items-center gap-1 bg-red-50 rounded-lg px-2 py-1 border border-red-100 animate-in fade-in zoom-in duration-200">
                          <span className="text-[10px] font-bold text-red-600 uppercase">Excluir?</span>
                          <button 
                            onClick={() => handleDelete(banner.id)}
                            className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                            title="Confirmar exclusão"
                          >
                            <Trash2 size={14} />
                          </button>
                          <button 
                            onClick={() => setDeletingId(null)}
                            className="p-1 text-gray-400 hover:bg-gray-100 rounded transition-colors"
                            title="Cancelar"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => setDeletingId(banner.id)}
                          className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                          title="Excluir banner"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className={cn("w-2 h-2 rounded-full", banner.is_active ? "bg-green-500" : "bg-gray-300")} />
                    <span className="text-xs text-gray-500 dark:text-gray-300">{banner.is_active ? 'Ativo' : 'Inativo'}</span>
                  </div>
                  <span className="text-xs text-gray-400 dark:text-gray-400">Link: {banner.link_url}</span>
                </div>
              </div>
            </div>
          )) : (
            <div className="bg-white dark:bg-gray-900 p-12 text-center border border-dashed border-gray-300 dark:border-gray-800 rounded-lg">
              <p className="text-gray-500 dark:text-gray-400">Nenhum banner cadastrado.</p>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-900 z-10">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {editingBanner ? 'Editar Banner' : 'Novo Banner'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Título</label>
                    <input 
                      type="text" 
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-4 py-2 bg-white dark:bg-gray-950/50 border border-gray-300 dark:border-gray-800 rounded focus:outline-none focus:border-[#2271b1] text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-400"
                      placeholder="Ex: Coleção Verão 2026"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subtítulo</label>
                    <input 
                      type="text" 
                      value={formData.subtitle}
                      onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                      className="w-full px-4 py-2 bg-white dark:bg-gray-950/50 border border-gray-300 dark:border-gray-800 rounded focus:outline-none focus:border-[#2271b1] text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-400"
                      placeholder="Ex: Descubra as novas tendências"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Link do Banner</label>
                    <input 
                      type="text" 
                      value={formData.link_url}
                      onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                      className="w-full px-4 py-2 bg-white dark:bg-gray-950/50 border border-gray-300 dark:border-gray-800 rounded focus:outline-none focus:border-[#2271b1] text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-400"
                      placeholder="Ex: /category/bikinis"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ordem de Exibição</label>
                    <input 
                      type="number" 
                      value={formData.order}
                      onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-800 rounded focus:outline-none focus:border-[#2271b1] text-sm text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Imagem do Banner</label>
                  <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-4 text-center space-y-4 h-full flex flex-col justify-center bg-gray-50 dark:bg-gray-800">
                    {formData.image_url ? (
                      <div className="relative aspect-video w-full">
                        <ProductImage 
                          src={formData.image_url} 
                          alt="Preview" 
                          fill
                          className="rounded-lg object-cover" 
                        />
                        <button 
                          type="button"
                          onClick={() => setFormData({ ...formData, image_url: '' })}
                          className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-lg z-10"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto">
                          {uploading ? <Loader2 size={24} className="text-[#2271b1] animate-spin" /> : <Upload size={24} className="text-gray-400" />}
                        </div>
                        <div>
                          <label className="cursor-pointer text-[#2271b1] font-medium hover:underline text-sm">
                            Fazer upload
                            <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
                          </label>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-[#2271b1] focus:ring-[#2271b1] border-gray-300 dark:border-gray-700 rounded"
                />
                <label htmlFor="is_active" className="text-sm font-medium text-gray-700 dark:text-gray-300">Banner Ativo</label>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 dark:border-gray-800">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2 border border-gray-300 dark:border-gray-800 rounded text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={loading || uploading}
                  className="bg-[#2271b1] text-white px-8 py-2 rounded font-bold text-sm hover:bg-[#135e96] transition-colors disabled:opacity-70 flex items-center gap-2"
                >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  Salvar Banner
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-100 p-4 rounded text-sm text-blue-700">
        <p className="font-bold mb-1">Dica:</p>
        <p>Use imagens com proporção 16:9 e resolução mínima de 1920x1080 para melhores resultados nos banners principais.</p>
      </div>
    </div>
  );
}
