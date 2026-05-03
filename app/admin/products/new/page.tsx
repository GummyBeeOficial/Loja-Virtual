'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Image as ImageIcon, Loader2, X, Upload, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import ProductImage from '@/components/ProductImage';

import { useAuth } from '@/context/AuthContext';

export default function AdminProductsNewPage() {
  const { role, isStaff, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category_id: '',
    image_url: '',
    variants: [] as any[] 
  });

  const [globalSizes, setGlobalSizes] = useState<{ size: string, stock: number }[]>([]);
  const [newGlobalSize, setNewGlobalSize] = useState({ size: '', stock: 0 });

  const ALLOWED_SIZES = ['XPP', 'PP', 'P', 'M', 'G', 'GG', 'XGG'];

  const [newVariant, setNewVariant] = useState({
    variant_name: '',
    color_name: '',
    color_hex: '#000000',
    image_url: ''
  });

  const [uploadingVariant, setUploadingVariant] = useState(false);

  const hasPendingVariant = () => {
    return (
      (newVariant.color_name && newVariant.color_name.trim() !== '') ||
      (newVariant.variant_name && newVariant.variant_name.trim() !== '') ||
      (newVariant.image_url && newVariant.image_url.trim() !== '')
    );
  };

  const addVariant = () => {
    if (!newVariant.color_name) {
      alert('O nome da cor/variação é obrigatório');
      return;
    }

    setFormData(prev => ({
      ...prev,
      variants: [...prev.variants, { ...newVariant }]
    }));
    
    setNewVariant({
      variant_name: '',
      color_name: '',
      color_hex: '#000000',
      image_url: ''
    });
  };

  const removeVariant = (index: number) => {
    setFormData(prev => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== index)
    }));
  };

  const addGlobalSize = () => {
    if (!newGlobalSize.size) return;

    // Impedir duplicados
    if (globalSizes.some(s => s.size === newGlobalSize.size)) {
      alert('Este tamanho já foi adicionado.');
      return;
    }

    setGlobalSizes(prev => [...prev, { ...newGlobalSize }]);
    setNewGlobalSize({ size: '', stock: 0 });
  };

  const removeGlobalSize = (size: string) => {
    setGlobalSizes(prev => prev.filter(s => s.size !== size));
  };

  const handleVariantImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1 * 1024 * 1024) {
      alert('A imagem da variação deve ter no máximo 1MB');
      return;
    }

    try {
      setUploadingVariant(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `var-${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `product-variations/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('products')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('products')
        .getPublicUrl(filePath);

      setNewVariant(prev => ({ ...prev, image_url: publicUrl }));
    } catch (err) {
      console.error('Error uploading variation image:', err);
      alert('Erro ao fazer upload da imagem da variação');
    } finally {
      setUploadingVariant(false);
    }
  };

  const fetchCategories = useCallback(async () => {
    if (!isStaff || (role !== 'admin' && role !== 'super_admin' && role !== 'estoque')) return;
    const { data } = await supabase.from('categories').select('*').order('name');
    setCategories(data || []);
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
      const filePath = `product-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('products')
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Validação: Verifica se há variações pendentes não confirmadas
    if (hasPendingVariant()) {
      alert('Por favor, confirme ou descarte a variação em andamento antes de salvar o produto.');
      setLoading(false);
      return;
    }

    if (globalSizes.length === 0) {
      alert('Por favor, adicione pelo menos um tamanho ao produto.');
      setLoading(false);
      return;
    }

    try {
      // 1. Salvar Produto Principal
      const priceValue = parseFloat(formData.price.toString().replace(',', '.'));
      const { data: product, error: pError } = await supabase
        .from('products')
        .insert([{
          name: formData.name,
          description: formData.description,
          price: isNaN(priceValue) ? 0 : priceValue,
          category_id: formData.category_id || null,
          image_url: formData.image_url
        }])
        .select()
        .single();

      if (pError) {
        throw new Error(`Erro ao criar produto: ${pError.message}\nDetalhes: ${JSON.stringify(pError)}`);
      }

      if (!product) {
        throw new Error('Erro crítico: Produto não foi retornado após a criação.');
      }

      // 2. Salvar Variações
      for (const variant of formData.variants) {
        const variantPayload = {
          product_id: product.id,
          variant_name: variant.variant_name || '',
          color_name: variant.color_name,
          color_hex: variant.color_hex,
          image_url: variant.image_url || ''
        };

        const { data: vData, error: vError } = await supabase
          .from('product_variants')
          .insert([variantPayload])
          .select();

        if (vError) {
          throw new Error(`Erro ao criar variação (${variant.color_name}): ${vError.message}\nDetalhes: ${JSON.stringify(vError)}`);
        }
        
        const insertedVariant = vData && vData[0];
        if (!insertedVariant) {
          throw new Error(`Erro crítico: Variação (${variant.color_name}) não retornada após insert.`);
        }

        // 3. Salvar Tamanhos Globais para esta Variação
        if (globalSizes.length > 0) {
          const sizesPayload = globalSizes.map((s: any) => ({
            product_variant_id: insertedVariant.id,
            size: s.size,
            stock: parseInt(s.stock.toString()) || 0
          }));

          const { error: sError } = await supabase
            .from('product_sizes')
            .insert(sizesPayload);

          if (sError) {
            throw new Error(`Erro ao criar tamanhos para ${variant.color_name}: ${sError.message}\nDetalhes: ${JSON.stringify(sError)}`);
          }
        }
      }

      // 4. FINALIZAÇÃO: Redirecionar
      router.push('/admin/products');
    } catch (err: any) {
      console.error('Erro completo no salvamento:', err);
      alert(`FALHA CRÍTICA NO SALVAMENTO:\n\n${err.message || 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) return null;
  if (!isStaff || (role !== 'admin' && role !== 'super_admin' && role !== 'estoque')) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <form id="product-form" onSubmit={handleSubmit} className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin/products" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
              <ArrowLeft size={20} className="text-gray-600 dark:text-gray-300" />
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Novo Produto</h1>
          </div>
          <button 
            type="submit"
            disabled={loading}
            className="bg-[#2271b1] text-white px-6 py-2 rounded flex items-center gap-2 hover:bg-[#135e96] transition-colors text-sm font-medium disabled:opacity-70"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            Salvar Produto
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">Nome do Produto</label>
              <input 
                type="text" 
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2.5 bg-white dark:bg-gray-950 border border-gray-300 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2271b1]/20 focus:border-[#2271b1] text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-all"
                placeholder="Ex: Biquíni Tropical Palms"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">Descrição Detalhada</label>
              <textarea 
                rows={8}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2.5 bg-white dark:bg-gray-950 border border-gray-300 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2271b1]/20 focus:border-[#2271b1] text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 resize-none transition-all"
                placeholder="Descreva os detalhes, materiais e diferenciais do produto..."
              ></textarea>
            </div>
          </div>

          {/* Imagem Principal do Produto */}
          <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-800 dark:text-white uppercase text-xs tracking-wider">Imagem Principal do Produto</h2>
              <span className="text-[10px] text-gray-400 dark:text-gray-400 font-medium">ESTA IMAGEM APARECERÁ NA VITRINE PRINCIPAL</span>
            </div>
            <div className="border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl p-8 text-center space-y-4 bg-gray-50/30 dark:bg-gray-800/20">
              {formData.image_url ? (
                <div className="relative w-full max-w-[200px] aspect-square mx-auto bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
                  <ProductImage 
                    src={formData.image_url} 
                    alt="Preview Principal" 
                    fill
                    className="w-full h-full" 
                  />
                  <button 
                    type="button"
                    onClick={() => setFormData({ ...formData, image_url: '' })}
                    className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full shadow-lg z-10 hover:bg-red-600 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="py-4">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3">
                    {uploading ? <Loader2 size={32} className="text-[#2271b1] animate-spin" /> : <ImageIcon size={32} className="text-gray-400 dark:text-gray-400" />}
                  </div>
                  <div>
                    <label className="cursor-pointer text-[#2271b1] font-bold hover:underline text-sm">
                      Clique para enviar a imagem principal
                      <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
                    </label>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 uppercase font-semibold">PNG, JPG ou WEBP (Máx. 2MB)</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-bold text-gray-800 dark:text-white uppercase text-xs tracking-wider">Tamanhos Gerais do Produto</h2>
              <span className="text-[10px] text-gray-400 dark:text-gray-400 font-medium">ESTES TAMANHOS SERÃO APLICADOS A TODAS AS VARIAÇÕES</span>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800/50 p-5 rounded-xl border border-gray-100 dark:border-gray-800 mb-6">
              <div className="space-y-4 mb-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Selecione o Tamanho *</label>
                  <div className="flex flex-wrap gap-2">
                    {ALLOWED_SIZES.map(size => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setNewGlobalSize({ ...newGlobalSize, size })}
                        className={`min-w-[45px] px-3 py-2 rounded-lg text-xs font-bold border transition-all ${
                          newGlobalSize.size === size
                            ? 'bg-[#2271b1] text-white border-[#2271b1] shadow-md'
                            : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-800 hover:border-[#2271b1]'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="flex gap-3 items-end">
                  <div className="w-32">
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Estoque</label>
                    <input 
                      type="number"
                      placeholder="0"
                      value={newGlobalSize.stock || ''}
                      onChange={(e) => setNewGlobalSize({ ...newGlobalSize, stock: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#2271b1]"
                    />
                  </div>
                  <button 
                    type="button"
                    onClick={addGlobalSize}
                    className="px-6 py-2 bg-[#2271b1] text-white rounded-lg text-xs font-bold hover:bg-[#135e96] transition-colors h-[38px] flex-1 md:flex-none"
                  >
                    Adicionar Tamanho
                  </button>
                </div>
              </div>

              {/* Lista de tamanhos globais */}
              <div className="flex flex-wrap gap-2">
                {globalSizes.length > 0 ? (
                  [...globalSizes]
                    .sort((a, b) => ALLOWED_SIZES.indexOf(a.size) - ALLOWED_SIZES.indexOf(b.size))
                    .map((s, idx) => (
                    <span key={idx} className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-xs font-bold text-gray-700 dark:text-gray-200 shadow-sm">
                      {s.size} — {s.stock} em estoque
                      <button type="button" onClick={() => removeGlobalSize(s.size)} className="text-red-400 hover:text-red-600 ml-1">
                        <X size={14} />
                      </button>
                    </span>
                  ))
                ) : (
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 italic">Nenhum tamanho adicionado ainda. Adicione os tamanhos que este produto terá.</p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-bold text-gray-800 dark:text-white uppercase text-xs tracking-wider">Variações (Cores e Estampas)</h2>
              <span className="text-[10px] text-gray-400 dark:text-gray-400 font-medium">ADICIONE AS CORES DISPONÍVEIS</span>
            </div>

            {/* Form para Nova Variação */}
            <div className="bg-gray-50 dark:bg-gray-800/50 p-5 rounded-xl border border-gray-100 dark:border-gray-800 mb-6 space-y-4">
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200">Adicionar Nova Variação</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Nome da Cor/Estampa *</label>
                  <input 
                    type="text"
                    value={newVariant.color_name}
                    onChange={(e) => setNewVariant({ ...newVariant, color_name: e.target.value })}
                    placeholder="Ex: Azul Marinho, Floral Rosa"
                    className="w-full px-3 py-2 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#2271b1]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Nome da Variação (Opcional)</label>
                  <input 
                    type="text"
                    value={newVariant.variant_name}
                    onChange={(e) => setNewVariant({ ...newVariant, variant_name: e.target.value })}
                    placeholder="Ex: Coleção Verão"
                    className="w-full px-3 py-2 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#2271b1]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Cor Hex</label>
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      value={newVariant.color_hex}
                      onChange={(e) => setNewVariant({ ...newVariant, color_hex: e.target.value })}
                      className="flex-1 px-3 py-2 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#2271b1]"
                    />
                    <input 
                      type="color"
                      value={newVariant.color_hex}
                      onChange={(e) => setNewVariant({ ...newVariant, color_hex: e.target.value })}
                      className="w-10 h-9 p-1 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Imagem da Variação</label>
                  <div className="relative">
                    <label className="flex items-center justify-center w-full h-9 border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-gray-950 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
                      {uploadingVariant ? (
                        <Loader2 size={16} className="animate-spin text-gray-400" />
                      ) : newVariant.image_url ? (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded overflow-hidden relative">
                            <ProductImage src={newVariant.image_url} alt="Var" fill className="w-full h-full" />
                          </div>
                          <span className="text-[10px] text-green-600 font-bold">IMAGEM OK</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-gray-400 dark:text-gray-400">
                          <Upload size={16} />
                          <span className="text-[10px] font-bold uppercase">Upload</span>
                        </div>
                      )}
                      <input type="file" className="hidden" accept="image/*" onChange={handleVariantImageUpload} disabled={uploadingVariant} />
                    </label>
                  </div>
                </div>
              </div>

              <button 
                type="button"
                onClick={addVariant}
                className="w-full py-3 bg-[#2271b1] text-white rounded-lg text-xs font-bold hover:bg-[#135e96] transition-colors flex items-center justify-center gap-2"
              >
                <Plus size={16} />
                Confirmar e Adicionar Variação ao Produto
              </button>
            </div>

            {/* Lista de Variações Adicionadas */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-800 dark:text-white border-b dark:border-gray-800 pb-2">Variações Adicionadas ({formData.variants.length})</h3>
              {formData.variants.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {formData.variants.map((variant, idx) => (
                    <div key={idx} className="flex items-start justify-between p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl group hover:border-[#2271b1]/30 transition-all">
                      <div className="flex gap-4">
                        <div className="w-16 h-16 rounded-lg overflow-hidden relative border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 flex-shrink-0">
                          {variant.image_url ? (
                            <ProductImage src={variant.image_url} alt={variant.color_name} fill className="w-full h-full" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: variant.color_hex }}>
                              <span className="text-[10px] font-bold text-white mix-blend-difference uppercase">{variant.color_name.charAt(0)}</span>
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-gray-800 dark:text-white text-sm">{variant.color_name}</p>
                          {variant.variant_name && <p className="text-[10px] text-gray-400 dark:text-gray-400 uppercase font-medium">{variant.variant_name}</p>}
                        </div>
                      </div>
                      <button 
                        type="button"
                        onClick={() => removeVariant(idx)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-800">
                  <p className="text-xs text-gray-400 dark:text-gray-400 italic">Nenhuma variação adicionada ainda.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Content */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="p-5 border-b border-gray-50 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20">
              <h2 className="font-bold text-gray-800 dark:text-white text-sm uppercase tracking-wider">Preço e Organização</h2>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">Preço de Venda (R$)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-400 dark:text-gray-400 text-sm">R$</span>
                  <input 
                    type="number" 
                    step="0.01"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-950 border border-gray-300 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2271b1]/20 focus:border-[#2271b1] text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-all"
                    placeholder="0,00"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">Categoria</label>
                <select 
                  required
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  className="w-full px-4 py-2 bg-white dark:bg-gray-950 border border-gray-300 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2271b1]/20 focus:border-[#2271b1] text-sm text-gray-900 dark:text-white transition-all cursor-pointer"
                >
                  <option value="">Selecionar categoria</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  </div>
);
}
