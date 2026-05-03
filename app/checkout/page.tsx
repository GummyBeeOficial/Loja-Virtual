'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ProductImage from '@/components/ProductImage';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { ChevronLeft, CreditCard, Truck, ShieldCheck, ArrowRight, CheckCircle2, Loader2, Copy, QrCode, Barcode, Check, Package, Landmark, Settings2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { getPaymentMethods } from '@/lib/payments-unified';

const ICON_MAP: Record<string, any> = {
  credit_card: CreditCard,
  pix: QrCode,
  boleto: Barcode,
  bank_transfer: Landmark,
  gateway: CreditCard,
  qr_code: QrCode,
  barcode: Barcode,
  manual: Landmark
};

// FASE 2: Dados agora carregados do banco (tabela settings)

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, cartTotal, cartCount, clearCart } = useCart();
  const { user } = useAuth();
  const { addToast } = useToast();
  const [paymentSettings, setPaymentSettings] = useState<any>({
    credit_card: { active: true, success_message: 'Seu pagamento foi aprovado com sucesso!' },
    pix: { active: true, key: '000.000.000-00', beneficiary: 'E-commerce Simulado LTDA', instructions: 'Abra o app do seu banco e escaneie o QR Code ou cole a chave PIX.' },
    boleto: { active: true, line: '00190.00009 02705.454051 28582.900002 8 95410000012345', instructions: 'Pague em qualquer banco ou casa lotérica até a data de vencimento.', expiry_days: 3 },
    bank_transfer: { active: false, bank_name: '', account: '', instructions: '' }
  });
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [fullOrderId, setFullOrderId] = useState('');
  const [finalOrderAmount, setFinalOrderAmount] = useState(0);
  const [finalPaymentMethod, setFinalPaymentMethod] = useState('');
  const [copied, setCopied] = useState(false);
  const [simulatingPayment, setSimulatingPayment] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    email: user?.email || '',
    phone: '',
    address: '',
    city: '',
    zipCode: '',
    paymentMethod: 'credit_card'
  });

  const [shippingMethods, setShippingMethods] = useState<any[]>([]);
  const [shippingLoading, setShippingLoading] = useState(true);
  const [shippingMethod, setShippingMethod] = useState('standard');
  const [calculatedShipping, setCalculatedShipping] = useState<any[]>([]);
  const [calculatingShipping, setCalculatingShipping] = useState(false);

  // Estados para Cupom
  const [couponCode, setCouponCode] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);

  const activePaymentMethods = Object.entries(paymentSettings).filter(([_, setting]) => (setting as any).active);
  const selectedShipping = (calculatedShipping.length > 0 ? calculatedShipping : shippingMethods).find(m => m.code === shippingMethod);
  const finalTotal = Math.max(0, (cartTotal - discountAmount) + (selectedShipping?.price || 0));

  const normalizeZip = (zip: string) => {
    return zip.replace(/\D/g, '');
  };

  const calculateShipping = async (zip: string) => {
    const cleanZip = normalizeZip(zip);

    if (cleanZip.length !== 8) return;

    setCalculatingShipping(true);

    try {
      // 1. Buscar os métodos base
      const { data: methods } = await supabase
        .from('shipping_methods')
        .select('*')
        .eq('active', true);

      if (!methods) return;

      const calculated = [];

      // 2. Para cada método, buscar se existe regra específica para o CEP
      for (const method of methods) {
        const { data: rules } = await supabase
          .from('shipping_rules')
          .select('*')
          .eq('shipping_method_id', method.id)
          .eq('active', true)
          .lte('min_zip', cleanZip)
          .gte('max_zip', cleanZip)
          .order('priority', { ascending: false })
          .limit(1);

        if (rules && rules.length > 0) {
          calculated.push({
            ...method,
            price: rules[0].price,
            eta: rules[0].eta
          });
        } else {
          // Fallback para o valor padrão do método
          calculated.push(method);
        }
      }

      setCalculatedShipping(calculated);

      // Sincronizar seleção se o método atual não estiver na lista (raro)
      if (calculated.length > 0 && !calculated.find(m => m.code === shippingMethod)) {
        setShippingMethod(calculated[0].code);
      }

    } catch (err) {
      console.error('Erro ao calcular frete:', err);
    } finally {
      setCalculatingShipping(false);
    }
  };

  useEffect(() => {
    if (formData.zipCode) {
      calculateShipping(formData.zipCode);
    }
  }, [formData.zipCode]);

  useEffect(() => {
    const fetchShippingMethods = async () => {
      try {
        setShippingLoading(true);
        const { data, error } = await supabase
          .from('shipping_methods')
          .select('*')
          .eq('active', true);
        
        if (data) {
          setShippingMethods(data);
          // Garantir que o método padrão exista nos dados retornados
          if (!data.find(m => m.code === 'standard') && data.length > 0) {
            setShippingMethod(data[0].code);
          }
        }
      } catch (err) {
        console.error('Error fetching shipping methods:', err);
      } finally {
        setShippingLoading(false);
      }
    };

    fetchShippingMethods();
  }, []);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const methods = await getPaymentMethods();

        if (methods) {
          setPaymentSettings(methods);
          
          const activeMethods = Object.entries(methods).filter(([_, m]) => (m as any).active);
          
          if (activeMethods.length > 0) {
            // Se o método atual não estiver ativo ou não existir, seleciona o primeiro ativo
            const currentMethodIsActive = methods[formData.paymentMethod]?.active;
            
            if (!currentMethodIsActive) {
              setFormData(prev => ({ ...prev, paymentMethod: activeMethods[0][0] }));
            }
          }
        }
      } catch (err) {
        console.error('Error fetching payment settings:', err);
      } finally {
        setSettingsLoading(false);
      }
    };

    fetchSettings();
  }, []);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error || !data) return;

        setFormData(prev => ({
          ...prev,
          fullName: prev.fullName || data.full_name || '',
          phone: prev.phone || data.phone || '',
          zipCode: prev.zipCode || data.zip_code || '',
          city: prev.city || data.city || '',
          address: prev.address || [
            data.address,
            data.address_number,
            data.neighborhood
          ].filter(Boolean).join(', ')
        }));

      } catch (err) {
        console.error('Erro ao carregar perfil no checkout:', err);
      }
    };

    fetchUserProfile();
  }, [user]);

  // Sync payment status if order is already paid in the database
  useEffect(() => {
    if (fullOrderId && orderSuccess && !paymentConfirmed) {
      const syncStatus = async () => {
        try {
          const { data } = await supabase
            .from('orders')
            .select('status')
            .eq('id', fullOrderId)
            .single();
          
          if (data?.status === 'paid') {
            setPaymentConfirmed(true);
          }
        } catch (err) {
          console.error('[Checkout] Error syncing payment status:', err);
        }
      };
      syncStatus();
    }
  }, [fullOrderId, orderSuccess, paymentConfirmed]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const simulatePayment = async () => {
    if (!fullOrderId || !user || paymentConfirmed) return;

    setSimulatingPayment(true);
    
    try {
      // 1. Update order status to 'paid' with validation
      // Using .select() to confirm the update and get the record back
      const { data, error } = await supabase
        .from('orders')
        .update({ status: 'paid' })
        .eq('id', fullOrderId)
        .eq('user_id', user.id)
        .neq('status', 'paid') // 2. Avoid redundant updates
        .select();

      if (error) throw error;

      // 1. Confirm exactly one order was affected
      if (!data || data.length === 0) {
        // Check if it was already paid (maybe by another tab or race condition)
        const { data: checkOrder } = await supabase
          .from('orders')
          .select('status')
          .eq('id', fullOrderId)
          .single();

        if (checkOrder?.status === 'paid') {
          setPaymentConfirmed(true);
          addToast('info', 'Este pagamento já foi confirmado.');
          return;
        }

        throw new Error('Não foi possível atualizar o status do pedido. Verifique se o pedido existe.');
      }

      // 3. Visual feedback based on real status
      addToast('success', 'Pagamento confirmado com sucesso!');
      setPaymentConfirmed(true);
    } catch (err: any) {
      console.error('[Checkout] Erro ao simular pagamento:', err);
      addToast('error', err.message || 'Falha ao confirmar pagamento. Tente novamente.');
    } finally {
      setSimulatingPayment(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Função para aplicar cupom
  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    
    setCouponLoading(true);
    setCouponError('');

    try {
      const { data: coupon, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', couponCode.trim().toLowerCase())
        .single();

      if (error || !coupon) {
        setCouponError('Cupom inválido ou não encontrado.');
        setCouponApplied(false);
        setDiscountAmount(0);
        return;
      }

      // Validações
      const now = new Date();
      if (!coupon.active) {
        setCouponError('Este cupom não está mais ativo.');
        return;
      }

      if (coupon.expires_at && new Date(coupon.expires_at) < now) {
        setCouponError('Este cupom expirou.');
        return;
      }

      if (cartTotal < Number(coupon.min_purchase)) {
        setCouponError(`Compra mínima para este cupom: R$ ${Number(coupon.min_purchase).toFixed(2)}`);
        return;
      }

      // Cálculo do desconto
      let calculatedDiscount = 0;
      if (coupon.type === 'percentage') {
        calculatedDiscount = (cartTotal * Number(coupon.value)) / 100;
      } else {
        calculatedDiscount = Number(coupon.value);
      }

      // Garantir que desconto não é maior que o total dos produtos
      const finalDiscount = Math.min(calculatedDiscount, cartTotal);
      
      setDiscountAmount(finalDiscount);
      setCouponApplied(true);
      addToast('success', 'Cupom aplicado com sucesso!');
    } catch (err) {
      console.error('Erro ao validar cupom:', err);
      setCouponError('Erro ao validar cupom. Tente novamente.');
    } finally {
      setCouponLoading(false);
    }
  };

  const removeCoupon = () => {
    setCouponApplied(false);
    setDiscountAmount(0);
    setCouponCode('');
    setCouponError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[Checkout] Iniciando submissão do pedido...');
    
    if (!user) {
      console.warn('[Checkout] Usuário não autenticado.');
      alert('Você precisa estar logado para finalizar a compra.');
      router.push('/login?redirect=/checkout');
      return;
    }

    setLoading(true);

    try {
      // 1. Process Order Atomically (Stock + Order + Items)
      console.log('[Checkout] Iniciando processamento atômico do pedido...');
      
      const orderItemsPayload = cart.map(item => ({
        product_id: item.id,
        product_variant_id: item.variant_id || null,
        product_size_id: item.size_id || null,
        variant_label: item.selectedColor || null,
        size_label: item.selectedSize || null,
        quantity: item.quantity,
        price: item.price,
        product_name_snapshot: item.name,
        product_image_snapshot: item.image_url
      }));

      const fullPayload = {
        p_user_id: user.id,
        p_total_amount: finalTotal,
        p_shipping_address: `${formData.address}, ${formData.city}, ${formData.zipCode}`,
        p_payment_method: formData.paymentMethod,
        p_shipping_type: shippingMethod,
        p_shipping_cost: selectedShipping?.price || 0,
        p_coupon_code: couponApplied ? couponCode.trim().toLowerCase() : null,
        p_discount_amount: discountAmount,
        p_items: orderItemsPayload,
        p_zip_code: formData.zipCode
      };

      console.log('[Checkout] Payload completo enviado para RPC:', JSON.stringify(fullPayload, null, 2));

      const { data: orderId, error: checkoutError } = await supabase.rpc('place_order_atomic', fullPayload);

      console.log('[Checkout] Resultado RPC data:', orderId);
      
      if (checkoutError) {
        const errorMessage = checkoutError?.message || 'Sem mensagem';
        const errorDetails = checkoutError?.details || 'Sem detalhes';
        const errorHint = checkoutError?.hint || 'Sem hint';
        const errorCode = checkoutError?.code || 'Sem código';

        console.error('[Checkout] RPC error message:', errorMessage);
        console.error('[Checkout] RPC error details:', errorDetails);
        console.error('[Checkout] RPC error hint:', errorHint);
        console.error('[Checkout] RPC error code:', errorCode);

        // Alert temporário para debug VISÍVEL
        alert(
          `Erro no checkout:\n\n` +
          `Mensagem: ${errorMessage}\n` +
          `Detalhes: ${errorDetails}\n` +
          `Hint: ${errorHint}\n` +
          `Código: ${errorCode}`
        );

        throw { 
          step: 'checkout_atomic', 
          message: errorMessage,
          details: errorDetails,
          hint: errorHint,
          code: errorCode
        };
      }

      console.log('[Checkout] Pedido processado com sucesso. ID:', orderId);

      // 2. Success
      setFullOrderId(orderId);
      setOrderId(orderId.substring(0, 8).toUpperCase());
      setFinalOrderAmount(finalTotal);
      setFinalPaymentMethod(formData.paymentMethod);
      setOrderSuccess(true);
      clearCart();
      console.log('[Checkout] Checkout concluído com sucesso!');
    } catch (err: any) {
      console.error('[Checkout] Erro capturado no catch (detalhado):', {
        step: err.step || 'desconhecido',
        message: err.message || err.toString(),
        details: err.details || 'Sem detalhes',
        hint: err.hint || 'Sem dica',
        code: err.code || 'Sem código',
        fullError: err,
        json: JSON.stringify(err, null, 2)
      });
      
      const stepName = err.step || 'desconhecido';
      const errorMessage = err.message || err.toString() || 'Erro desconhecido';
      const errorDetails = err.details || 'Sem detalhes';
      const errorHint = err.hint || 'Sem dica';
      const errorCode = err.code || 'Sem código';
      
      if (stepName === 'checkout_atomic' && errorMessage.includes('Estoque insuficiente')) {
        alert(`Erro de Estoque: ${errorMessage}\n\nPor favor, revise seu carrinho.`);
      } else {
        alert(
          `Falha no Checkout (Etapa: ${stepName})\n\n` +
          `Mensagem: ${errorMessage}\n` +
          `Detalhes: ${errorDetails}\n` +
          `Código: ${errorCode}\n` +
          `Dica: ${errorHint}`
        );
      }
    } finally {
      setLoading(false);
    }
  };

  if (settingsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={40} className="animate-spin text-[#13daec]" />
          <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Carregando Checkout...</p>
        </div>
      </div>
    );
  }

  if (orderSuccess) {
    const method = finalPaymentMethod;
    const config = paymentSettings?.[method] ?? {};

    return (
      <div className="min-h-screen flex flex-col bg-white dark:bg-gray-900 transition-colors duration-300">
        <Navbar />
        <main className="flex-grow flex flex-col items-center justify-center p-6 pt-32 max-w-4xl mx-auto w-full">
          <div className="w-full bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="p-8 md:p-12 text-center border-b border-gray-50 dark:border-gray-700">
              <div className="w-20 h-20 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center text-green-500 mx-auto mb-6 animate-in zoom-in duration-500">
                <CheckCircle2 size={40} />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white tracking-tighter mb-4">Pedido Realizado!</h2>
              <p className="text-gray-500 dark:text-gray-400 mb-2">
                Obrigado pela sua compra. Seu pedido <span className="font-bold text-gray-900 dark:text-white">#{orderId}</span> foi recebido.
              </p>
            </div>

            <div className="p-8 md:p-12 bg-gray-50/50 dark:bg-gray-800/50">
              {(() => {
                const type = config?.type || 'default';
                
                switch (type) {
                  case 'gateway':
                    return (
                      <div className="max-w-md mx-auto text-center space-y-6">
                        <div className="flex items-center justify-center gap-3 text-blue-600 dark:text-blue-400 mb-2">
                          {React.createElement(ICON_MAP[config.icon_name] || ICON_MAP[type] || CreditCard, { size: 24 })}
                          <span className="font-bold uppercase tracking-widest text-sm">{config.label || method}</span>
                        </div>
                        <p className="text-gray-600 dark:text-gray-300">
                          {config.success_message || 'Seu pagamento foi aprovado com sucesso!'}
                        </p>
                        <div className="pt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
                          <Link href={`/account/orders/${fullOrderId}`} className="inline-block px-10 py-4 bg-[#13daec] text-white font-bold rounded-full uppercase tracking-widest text-sm hover:bg-[#11c5d4] transition-all shadow-lg shadow-[#13daec]/20">
                            Ver Pedido
                          </Link>
                          <Link href="/" className="inline-block px-10 py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold rounded-full uppercase tracking-widest text-sm hover:bg-gray-800 dark:hover:bg-gray-100 transition-all">
                            Voltar para a Loja
                          </Link>
                        </div>
                      </div>
                    );

                  case 'qr_code':
                    return (
                      <div className="max-w-md mx-auto space-y-8">
                        <div className="flex items-center justify-center gap-3 text-teal-600 dark:text-teal-400 mb-2">
                          {React.createElement(ICON_MAP[config.icon_name] || ICON_MAP[type] || QrCode, { size: 24 })}
                          <span className="font-bold uppercase tracking-widest text-sm">{config.label || method}</span>
                        </div>
                        
                        <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center gap-6">
                          <div className="w-48 h-48 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center text-gray-400">
                            <QrCode size={120} strokeWidth={1} />
                          </div>
                          
                          <div className="w-full space-y-2">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Código</p>
                            <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                              <code className="text-xs text-gray-600 dark:text-gray-300 truncate flex-1">{config.key}</code>
                              <button 
                                onClick={() => handleCopy(config.key)}
                                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-500"
                              >
                                {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                              </button>
                            </div>
                          </div>

                          {config.beneficiary && (
                            <div className="text-center space-y-1">
                              <p className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-widest">Beneficiário</p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">{config.beneficiary}</p>
                            </div>
                          )}
                        </div>

                        <div className="text-center space-y-6">
                          {config.instructions && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 italic whitespace-pre-line">
                              {config.instructions}
                            </p>
                          )}
                          
                          <div className="flex flex-col gap-3">
                            <button 
                              onClick={simulatePayment}
                              disabled={simulatingPayment || paymentConfirmed}
                              className={cn(
                                "w-full py-4 rounded-full font-bold uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2",
                                paymentConfirmed 
                                  ? "bg-green-500 text-white" 
                                  : "bg-teal-600 text-white hover:bg-teal-700"
                              )}
                            >
                              {simulatingPayment ? <Loader2 size={16} className="animate-spin" /> : paymentConfirmed ? <Check size={16} /> : null}
                              {simulatingPayment ? 'Processando...' : paymentConfirmed ? 'Pagamento Confirmado' : 'Simular Pagamento'}
                            </button>
                            
                            <div className="flex flex-col sm:flex-row gap-3">
                              <Link href={`/account/orders/${fullOrderId}`} className="flex-1 py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full font-bold uppercase tracking-widest text-[10px] hover:opacity-90 transition-all text-center">
                                Ver Detalhes do Pedido
                              </Link>
                              <Link href="/" className="flex-1 py-4 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-full font-bold uppercase tracking-widest text-[10px] hover:bg-gray-200 dark:hover:bg-gray-700 transition-all text-center">
                                Voltar para a Loja
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>
                    );

                  case 'barcode':
                    return (
                      <div className="max-w-md mx-auto space-y-8">
                        <div className="flex items-center justify-center gap-3 text-orange-600 dark:text-orange-400 mb-2">
                          {React.createElement(ICON_MAP[config.icon_name] || ICON_MAP[type] || Barcode, { size: 24 })}
                          <span className="font-bold uppercase tracking-widest text-sm">{config.label || method}</span>
                        </div>

                        <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-6">
                          <div className="space-y-2">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Linha Digitável</p>
                            <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                              <code className="text-xs text-gray-600 dark:text-gray-300 flex-1 font-mono">{config.line}</code>
                              <button 
                                onClick={() => handleCopy(config.line)}
                                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-500"
                              >
                                {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-center">
                            <div className="space-y-1">
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Vencimento</p>
                              <p className="text-sm font-bold text-gray-900 dark:text-white">
                                {new Date(Date.now() + (config.expiry_days || 3) * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR')}
                              </p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Valor</p>
                              <p className="text-sm font-bold text-gray-900 dark:text-white">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(finalOrderAmount)}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="text-center space-y-6">
                          {config.instructions && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 italic whitespace-pre-line">
                              {config.instructions}
                            </p>
                          )}
                          
                          <div className="flex flex-col gap-3">
                            <button 
                              onClick={simulatePayment}
                              disabled={simulatingPayment || paymentConfirmed}
                              className={cn(
                                "w-full py-4 rounded-full font-bold uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2",
                                paymentConfirmed 
                                  ? "bg-green-500 text-white" 
                                  : "bg-orange-600 text-white hover:bg-orange-700"
                              )}
                            >
                              {simulatingPayment ? <Loader2 size={16} className="animate-spin" /> : paymentConfirmed ? <Check size={16} /> : null}
                              {simulatingPayment ? 'Processando...' : paymentConfirmed ? 'Pagamento Confirmado' : 'Simular Pagamento'}
                            </button>
                            
                            <div className="flex flex-col sm:flex-row gap-3">
                              <Link href={`/account/orders/${fullOrderId}`} className="flex-1 py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full font-bold uppercase tracking-widest text-[10px] hover:opacity-90 transition-all text-center">
                                Ver Detalhes do Pedido
                              </Link>
                              <Link href="/" className="flex-1 py-4 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-full font-bold uppercase tracking-widest text-[10px] hover:bg-gray-200 dark:hover:bg-gray-700 transition-all text-center">
                                Voltar para a Loja
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>
                    );

                  case 'manual':
                    return (
                      <div className="max-w-md mx-auto space-y-8">
                        <div className="flex items-center justify-center gap-3 text-indigo-600 dark:text-indigo-400 mb-2">
                          {React.createElement(ICON_MAP[config.icon_name] || ICON_MAP[type] || Landmark, { size: 24 })}
                          <span className="font-bold uppercase tracking-widest text-sm">{config.label || method}</span>
                        </div>

                        <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-6">
                          <div className="text-center space-y-4">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">Realize o pagamento</h3>
                            
                            <div className="grid grid-cols-1 gap-4 text-left bg-gray-50 dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700">
                              {config.bank_name && (
                                <div className="space-y-1">
                                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Banco / Instituição</p>
                                  <p className="text-sm font-bold text-gray-900 dark:text-white uppercase">{config.bank_name}</p>
                                </div>
                              )}
                              {config.account && (
                                <div className="space-y-1">
                                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Dados da Conta / Beneficiário</p>
                                  <p className="text-sm font-mono font-bold text-gray-900 dark:text-white">{config.account}</p>
                                </div>
                              )}
                              <div className="space-y-1">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Valor</p>
                                <p className="text-sm font-bold text-gray-900 dark:text-white">
                                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(finalOrderAmount)}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="text-center space-y-6">
                          {config.instructions && (
                            <div className="space-y-2">
                              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Instruções</p>
                              <p className="text-sm text-gray-500 dark:text-gray-400 italic whitespace-pre-line">
                                {config.instructions}
                              </p>
                            </div>
                          )}
                          
                          <div className="flex flex-col gap-3">
                            <button 
                              onClick={simulatePayment}
                              disabled={simulatingPayment || paymentConfirmed}
                              className={cn(
                                "w-full py-4 rounded-full font-bold uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2",
                                paymentConfirmed 
                                  ? "bg-green-500 text-white" 
                                  : "bg-indigo-600 text-white hover:bg-indigo-700"
                              )}
                            >
                              {simulatingPayment ? <Loader2 size={16} className="animate-spin" /> : paymentConfirmed ? <Check size={16} /> : null}
                              {simulatingPayment ? 'Processando...' : paymentConfirmed ? 'Pagamento Confirmado' : 'Simular Pagamento'}
                            </button>
                            
                            <div className="flex flex-col sm:flex-row gap-3">
                              <Link href={`/account/orders/${fullOrderId}`} className="flex-1 py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full font-bold uppercase tracking-widest text-[10px] hover:opacity-90 transition-all text-center">
                                Ver Detalhes do Pedido
                              </Link>
                              <Link href="/" className="flex-1 py-4 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-full font-bold uppercase tracking-widest text-[10px] hover:bg-gray-200 dark:hover:bg-gray-700 transition-all text-center">
                                Voltar para a Loja
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>
                    );

                  default:
                    return (
                      <div className="max-w-md mx-auto space-y-8">
                        <div className="flex items-center justify-center gap-3 text-gray-600 dark:text-gray-400 mb-2">
                          {React.createElement(ICON_MAP[config.icon_name] || ICON_MAP[type] || Settings2, { size: 24 })}
                          <span className="font-bold uppercase tracking-widest text-sm">{config.label || method}</span>
                        </div>

                        <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-6">
                          <div className="text-center space-y-4">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">Instruções de Pagamento</h3>
                            <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700">
                              <p className="text-sm text-gray-600 dark:text-gray-300 italic whitespace-pre-line">
                                {config.instructions || 'Aguardando processamento do seu pedido.'}
                              </p>
                            </div>
                            <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Valor do Pedido</p>
                              <p className="text-xl font-bold text-gray-900 dark:text-white">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(finalOrderAmount)}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="pt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
                          <Link href={`/account/orders/${fullOrderId}`} className="w-full sm:w-auto inline-block px-10 py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold rounded-full uppercase tracking-widest text-[10px] hover:opacity-90 transition-all text-center">
                            Ver Detalhes do Pedido
                          </Link>
                          <Link href="/" className="w-full sm:w-auto inline-block px-10 py-4 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 font-bold rounded-full uppercase tracking-widest text-[10px] hover:bg-gray-200 dark:hover:bg-gray-700 transition-all text-center">
                            Voltar para a Loja
                          </Link>
                        </div>
                      </div>
                    );
                }
              })()}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (cartCount === 0) {
    router.push('/cart');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-6 md:px-12 pt-32 pb-20">
        <div className="flex flex-col lg:flex-row gap-12">
          {/* Checkout Form */}
          <div className="flex-grow">
            <Link 
              href="/cart" 
              className="inline-flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-[#13daec] transition-colors mb-8 uppercase tracking-widest"
            >
              <ChevronLeft size={16} />
              Voltar ao Carrinho
            </Link>

            <h1 className="text-4xl font-bold text-gray-900 dark:text-white tracking-tighter mb-12">Finalizar Compra</h1>

            <form onSubmit={handleSubmit} className="space-y-12">
              {/* Shipping Information */}
              <section>
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 bg-gray-900 dark:bg-white rounded-full flex items-center justify-center text-white dark:text-gray-900">
                    <Truck size={20} />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tighter">Informações de Entrega</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white dark:bg-gray-900 p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Nome Completo</label>
                    <input 
                      type="text" 
                      name="fullName"
                      required
                      value={formData.fullName}
                      onChange={handleInputChange}
                      className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl focus:ring-2 focus:ring-[#13daec] transition-all text-gray-900 dark:text-white"
                      placeholder="Como no seu documento"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">E-mail</label>
                    <input 
                      type="email" 
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl focus:ring-2 focus:ring-[#13daec] transition-all text-gray-900 dark:text-white"
                      placeholder="seu@email.com"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Telefone</label>
                    <input 
                      type="tel" 
                      name="phone"
                      required
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl focus:ring-2 focus:ring-[#13daec] transition-all text-gray-900 dark:text-white"
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Endereço</label>
                    <input 
                      type="text" 
                      name="address"
                      required
                      value={formData.address}
                      onChange={handleInputChange}
                      className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl focus:ring-2 focus:ring-[#13daec] transition-all text-gray-900 dark:text-white"
                      placeholder="Rua, número, complemento"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Cidade</label>
                    <input 
                      type="text" 
                      name="city"
                      required
                      value={formData.city}
                      onChange={handleInputChange}
                      className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl focus:ring-2 focus:ring-[#13daec] transition-all text-gray-900 dark:text-white"
                      placeholder="Sua cidade"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">CEP</label>
                    <input 
                      type="text" 
                      name="zipCode"
                      required
                      value={formData.zipCode}
                      onChange={handleInputChange}
                      className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl focus:ring-2 focus:ring-[#13daec] transition-all text-gray-900 dark:text-white"
                      placeholder="00000-000"
                    />
                  </div>
                </div>
              </section>

              {/* Shipping Method Selection */}
              <section>
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 bg-gray-900 dark:bg-white rounded-full flex items-center justify-center text-white dark:text-gray-900">
                    <Truck size={20} />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tighter">Escolha o Envio</h2>
                </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {calculatingShipping ? (
                      <div className="sm:col-span-3 flex flex-col items-center justify-center p-12 bg-gray-50 dark:bg-gray-800/50 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                        <Loader2 size={24} className="animate-spin text-[#13daec] mb-3" />
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Calculando frete para {formData.zipCode}...</span>
                      </div>
                    ) : (calculatedShipping.length > 0 ? calculatedShipping : shippingMethods).length > 0 ? (
                      (calculatedShipping.length > 0 ? calculatedShipping : shippingMethods).map((method) => (
                        <label 
                          key={method.id}
                          className={`
                            relative flex flex-col items-center justify-center p-6 rounded-3xl border-2 cursor-pointer transition-all
                            ${shippingMethod === method.code 
                              ? 'border-[#13daec] bg-[#13daec]/5 text-[#13daec]' 
                              : 'border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-400 dark:text-gray-500 hover:border-gray-200 dark:hover:border-gray-700'}
                          `}
                        >
                          <input 
                            type="radio" 
                            name="shippingMethod" 
                            value={method.code}
                            checked={shippingMethod === method.code}
                            onChange={(e) => setShippingMethod(e.target.value)}
                            className="hidden"
                          />
                          <div className="mb-2">
                            {method.code === 'pickup' ? <Package size={20} /> : <Truck size={20} />}
                          </div>
                          <span className="text-xs font-bold uppercase tracking-widest text-center">{method.label}</span>
                          {method.eta && <span className="text-[10px] font-medium mt-1 opacity-70 italic">{method.eta}</span>}
                          <span className="text-xs font-black mt-2">
                            {Number(method.price) === 0 ? 'Grátis' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(method.price)}
                          </span>
                        </label>
                      ))
                    ) : (
                      <div className="sm:col-span-3 text-center py-8 text-gray-400 text-xs italic">
                        Nenhum método de envio disponível no momento.
                      </div>
                    )}
                  </div>
              </section>

              {/* Payment Method */}
              <section>
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 bg-gray-900 dark:bg-white rounded-full flex items-center justify-center text-white dark:text-gray-900">
                    <CreditCard size={20} />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tighter">Forma de Pagamento</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {activePaymentMethods.length > 0 ? (
                    activePaymentMethods.map(([code, setting]) => {
                      const s = setting as any;
                      const IconComponent = ICON_MAP[s?.icon_name] || ICON_MAP[code] || ICON_MAP[s?.type] || Settings2;
                      
                      return (
                        <label 
                          key={code}
                          className={`
                            relative flex flex-col items-center justify-center p-6 rounded-3xl border-2 cursor-pointer transition-all
                            ${formData.paymentMethod === code 
                              ? 'border-[#13daec] bg-[#13daec]/5 text-[#13daec]' 
                              : 'border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-400 dark:text-gray-500 hover:border-gray-200 dark:hover:border-gray-700'}
                          `}
                        >
                          <input 
                            type="radio" 
                            name="paymentMethod" 
                            value={code}
                            checked={formData.paymentMethod === code}
                            onChange={handleInputChange}
                            className="hidden"
                          />
                          <div className="mb-3">
                            {s.type === 'qr_code' && !s.icon_name ? <div className="font-bold text-xs uppercase">QR</div> : 
                             s.type === 'barcode' && !s.icon_name ? <div className="font-bold text-xs uppercase">BAR</div> :
                             <IconComponent size={20} />}
                          </div>
                          <span className="text-xs font-bold uppercase tracking-widest">{s.label || code}</span>
                        </label>
                      );
                    })
                  ) : (
                    <div className="sm:col-span-3 p-8 bg-red-50 dark:bg-red-900/10 border-2 border-dashed border-red-100 dark:border-red-900/30 rounded-3xl text-center">
                      <p className="text-xs font-bold text-red-500 uppercase tracking-widest">Nenhum método de pagamento disponível no momento.</p>
                    </div>
                  )}
                </div>
              </section>

              <div className="pt-8">
                <button 
                  type="submit"
                  disabled={loading || activePaymentMethods.length === 0}
                  className="w-full bg-[#13daec] text-white py-6 rounded-full font-bold uppercase tracking-widest text-sm hover:bg-[#11c5d4] transition-all flex items-center justify-center gap-3 shadow-lg shadow-[#13daec]/20 disabled:opacity-50 disabled:grayscale"
                >
                  {loading ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      Confirmar Pedido
                      <ArrowRight size={20} />
                    </>
                  )}
                </button>
                
                {activePaymentMethods.length === 0 && (
                  <p className="text-center text-[10px] font-bold text-red-500 uppercase tracking-widest mt-4">
                    Nenhum método de pagamento está disponível no momento.
                  </p>
                )}

                <p className="text-center text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-6 flex items-center justify-center gap-2">
                  <ShieldCheck size={14} className="text-green-500" />
                  Ambiente Seguro e Criptografado
                </p>
              </div>
            </form>
          </div>

          {/* Order Summary Sidebar */}
          <div className="w-full lg:w-96">
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm p-8 border border-gray-100 dark:border-gray-800 sticky top-32">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tighter mb-8">Seu Pedido</h2>
              
              <div className="space-y-6 mb-8 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                {cart.map((item) => (
                  <div key={`${item.id}-${item.variant_id || 'no-variant'}-${item.size_id || 'no-size'}`} className="flex gap-4">
                    <div className="relative w-16 h-20 bg-gray-50 dark:bg-gray-800 rounded-lg overflow-hidden flex-shrink-0">
                      <ProductImage src={item.image_url} alt={item.name} fill className="h-full w-full" />
                    </div>
                    <div className="flex-grow">
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white line-clamp-1">{item.name}</h4>
                      <div className="flex gap-2 text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest">
                        {item.selectedSize && <span>T: {item.selectedSize}</span>}
                        {item.selectedColor && <span>C: {item.selectedColor}</span>}
                        <span>Qtd: {item.quantity}</span>
                      </div>
                      <p className="text-sm font-bold text-[#13daec] mt-1">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price * item.quantity)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Campo de Cupom */}
              <div className="mb-8 pt-6 border-t border-gray-50 dark:border-gray-800">
                <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Cupom de Desconto</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    disabled={couponApplied || couponLoading}
                    placeholder="Digite seu cupom"
                    className="flex-grow px-4 py-3 bg-gray-50 dark:bg-gray-800 border-none rounded-xl text-xs font-bold uppercase tracking-widest focus:ring-2 focus:ring-[#13daec] transition-all text-gray-900 dark:text-white disabled:opacity-50"
                  />
                  {couponApplied ? (
                    <button 
                      type="button"
                      onClick={removeCoupon}
                      className="px-4 py-3 bg-red-50 text-red-500 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-red-100 transition-all"
                    >
                      Remover
                    </button>
                  ) : (
                    <button 
                      type="button"
                      onClick={applyCoupon}
                      disabled={couponLoading || !couponCode.trim()}
                      className="px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:opacity-90 transition-all disabled:opacity-50"
                    >
                      {couponLoading ? <Loader2 size={14} className="animate-spin" /> : 'Aplicar'}
                    </button>
                  )}
                </div>
                {couponError && <p className="text-[10px] text-red-500 font-bold mt-2 uppercase tracking-widest">{couponError}</p>}
                {couponApplied && <p className="text-[10px] text-green-500 font-bold mt-2 uppercase tracking-widest">Cupom aplicado!</p>}
              </div>

              <div className="space-y-4 mb-8 pt-6 border-t border-gray-50 dark:border-gray-800">
                <div className="flex justify-between text-gray-500 dark:text-gray-400">
                  <span className="text-sm font-medium">Subtotal</span>
                  <span className="font-bold">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cartTotal)}
                  </span>
                </div>
                
                {couponApplied && (
                  <div className="flex justify-between text-green-500">
                    <span className="text-sm font-medium">Desconto</span>
                    <span className="font-bold">
                      -{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(discountAmount)}
                    </span>
                  </div>
                )}

                <div className="flex justify-between text-gray-500 dark:text-gray-400">
                  <span className="text-sm font-medium">Frete ({selectedShipping?.label || '...' })</span>
                  <span className={cn(
                    "font-bold uppercase text-xs tracking-widest",
                    (selectedShipping?.price || 0) === 0 ? "text-green-500" : "text-gray-900 dark:text-white"
                  )}>
                    {shippingLoading ? '...' : (selectedShipping?.price || 0) === 0 ? 'Grátis' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedShipping?.price || 0)}
                  </span>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-50 dark:border-gray-800">
                <div className="flex justify-between items-end">
                  <span className="text-sm font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">Total</span>
                  <span className="text-3xl font-bold text-gray-900 dark:text-white">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(finalTotal)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
