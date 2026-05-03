'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Edit2, Trash2, Loader2, X, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import ProductImage from '@/components/ProductImage';

import { useAuth } from '@/context/AuthContext';

export default function CategoriesPage() {
  const { role, isStaff, loading: authLoading } = useAuth();
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ name: '', image_url: '' });
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    if (!isStaff || (role !== 'admin' && role !== 'super_admin' && role !== 'estoque')) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) throw error;
      setCategories(data || []);
    } catch (err) {
      console.error('Error fetching categories:', err);
    } finally {
      setLoading(false);
    }
  }, [isStaff, role]);

  useEffect(() => {
    if (isStaff && (role === 'admin' || role === 'super_admin' || role === 'estoque')) {
      fetchCategories();
    }
  }, [isStaff, role, fetchCategories]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Basic validation
    if (file.size > 2 * 1024 * 1024) {
      alert('A imagem deve ter no máximo 2MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      alert('O arquivo deve ser uma imagem');
      return;
    }

    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `category-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('products') // Using the same bucket for simplicity, or create a 'categories' one
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('products')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, image_url: publicUrl }));
    } catch (err) {
      console.error('Error uploading image:', err);
      alert('Erro ao fazer upload da imagem');
    } finally {
      setUploading(false);
    }
  };

  const handleOpenModal = (category: any = null) => {
    if (category) {
      setEditingCategory(category);
      setFormData({ name: category.name, image_url: category.image_url || '' });
    } else {
      setEditingCategory(null);
      setFormData({ name: '', image_url: '' });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingCategory) {
        const { error } = await supabase
          .from('categories')
          .update(formData)
          .eq('id', editingCategory.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('categories')
          .insert([formData]);
        if (error) throw error;
      }
      setIsModalOpen(false);
      fetchCategories();
    } catch (err) {
      console.error('Error saving category:', err);
      alert('Erro ao salvar categoria');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    console.log(`[Admin] Iniciando processo de exclusão DIRETA para a categoria ID: ${id}`);
    
    try {
      setDeletingId(id);
      console.log('[Supabase] Executando DELETE na tabela categories...');
      
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('[Supabase] Erro ao deletar categoria:', error);
        alert(`Erro ao excluir categoria:\n\nCódigo: ${error.code}\nMensagem: ${error.message}\nDetalhes: ${error.details || 'Nenhum'}`);
        return;
      }

      console.log('[Admin] Categoria excluída com sucesso do banco de dados.');
      
      // Atualização Otimista: Remove da lista imediatamente
      setCategories(prev => prev.filter(cat => cat.id !== id));
      console.log('[Admin] Interface atualizada (item removido da lista local).');

    } catch (err: any) {
      console.error('[Admin] Erro inesperado na função handleDelete:', err);
      alert('Ocorreu um erro inesperado ao tentar excluir a categoria.');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredCategories = categories.filter(cat => 
    cat.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (authLoading) return null;
  if (!isStaff || (role !== 'admin' && role !== 'super_admin' && role !== 'estoque')) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Categorias</h1>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-[#2271b1] text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-[#135e96] transition-colors text-sm font-medium"
        >
          <Plus size={18} />
          Adicionar Nova
        </button>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
            <input 
              type="text" 
              placeholder="Pesquisar categorias..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded focus:outline-none focus:border-[#2271b1] text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-900/50 placeholder:text-gray-400 dark:placeholder:text-gray-400"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-300 font-medium uppercase text-xs">
              <tr>
                <th className="px-6 py-3 w-16">Imagem</th>
                <th className="px-6 py-3">Nome</th>
                <th className="px-6 py-3">Slug (ID)</th>
                <th className="px-6 py-3">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-[#2271b1] mx-auto" />
                  </td>
                </tr>
              ) : filteredCategories.length > 0 ? (
                filteredCategories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="w-10 h-10 rounded bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden border border-gray-200 dark:border-gray-700 relative">
                        <ProductImage 
                          src={cat.image_url} 
                          alt={cat.name} 
                          fill
                          className="object-cover" 
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-[#2271b1] dark:text-[#72aee6]">{cat.name}</td>
                    <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{cat.id}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleOpenModal(cat)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-[#2271b1] border border-blue-100 rounded-md transition-all hover:bg-[#2271b1] hover:text-white font-bold text-[10px] uppercase tracking-wider"
                        >
                          <Edit2 size={14} />
                          <span>Editar</span>
                        </button>
                        <button 
                          type="button"
                          disabled={deletingId === cat.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(cat.id);
                          }}
                          className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-md transition-all font-bold text-[10px] uppercase tracking-wider ${
                            deletingId === cat.id 
                              ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' 
                              : 'bg-red-50 text-red-600 border-red-100 hover:bg-red-600 hover:text-white'
                          }`}
                        >
                          {deletingId === cat.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Trash2 size={14} />
                          )}
                          <span>{deletingId === cat.id ? 'Excluindo...' : 'Deletar'}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-gray-500 dark:text-gray-400">
                    Nenhuma categoria encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <h2 className="font-bold text-gray-900 dark:text-white">
                {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome</label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded focus:outline-none focus:border-[#2271b1] text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-950/50 placeholder:text-gray-400 dark:placeholder:text-gray-400"
                  placeholder="Ex: Biquínis"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Imagem da Categoria</label>
                <div className="flex gap-4 items-start">
                  <div className="flex-1">
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={formData.image_url}
                        onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded focus:outline-none focus:border-[#2271b1] text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 placeholder:text-gray-400 dark:placeholder:text-gray-400"
                        placeholder="URL da imagem ou faça upload..."
                      />
                      <label className="cursor-pointer bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 p-2 rounded border border-gray-300 dark:border-gray-700 transition-colors flex items-center justify-center min-w-[40px]">
                        {uploading ? <Loader2 size={18} className="animate-spin text-[#2271b1]" /> : <ImageIcon size={18} className="text-gray-600 dark:text-gray-400" />}
                        <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
                      </label>
                    </div>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 uppercase tracking-widest font-bold">Máx. 2MB (PNG, JPG, WEBP)</p>
                  </div>
                  {formData.image_url && (
                    <div className="w-12 h-12 rounded border border-gray-200 dark:border-gray-700 overflow-hidden relative flex-shrink-0 group">
                      <ProductImage src={formData.image_url} alt="Preview" fill className="object-cover" />
                      <button 
                        type="button"
                        onClick={() => setFormData({ ...formData, image_url: '' })}
                        className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={saving}
                  className="bg-[#2271b1] text-white px-6 py-2 rounded text-sm font-medium hover:bg-[#135e96] transition-colors disabled:opacity-70 flex items-center gap-2"
                >
                  {saving && <Loader2 size={16} className="animate-spin" />}
                  {editingCategory ? 'Atualizar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
