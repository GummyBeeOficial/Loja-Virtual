'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { useToast } from './ToastContext';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: string | null;
  isAdmin: boolean;
  isStaff: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  role: null,
  isAdmin: false,
  isStaff: false,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  // Helper para formatar erros do Supabase de forma legível
  const logAuthError = (context: string, error: any) => {
    if (!error) return;
    
    const errorDetails = {
      message: error.message || 'Sem mensagem',
      code: error.code || 'Sem código',
      details: error.details || 'Sem detalhes',
      hint: error.hint || 'Sem dica',
      status: error.status || 'N/A'
    };

    console.error(`AuthContext: ${context}`, errorDetails);
  };

  useEffect(() => {
    let isMounted = true;
    const supabase = createClient();

    const handleAuthStateChange = async (currentSession: Session | null) => {
      if (!isMounted) return;
      
      setLoading(true);
      
      try {
        setSession(currentSession);
        const currentUser = currentSession?.user ?? null;
        setUser(currentUser);

        if (currentUser && isSupabaseConfigured()) {
          try {
            // Usamos maybeSingle para evitar erro de "no rows" se o profile ainda não existir
            const { data, error } = await supabase
              .from('profiles')
              .select('role')
              .eq('id', currentUser.id)
              .maybeSingle();

            if (error) {
              logAuthError('Erro ao buscar profile', error);
              setRole('user'); // Fallback seguro
            } else if (data) {
              setRole(data.role || 'user');
            } else {
              // Caso o profile não exista na tabela public.profiles
              console.warn('AuthContext: Profile não encontrado para o usuário:', currentUser.id);
              setRole('user');
            }
          } catch (profileError) {
            console.error('AuthContext: Exceção ao buscar profile:', profileError);
            setRole('user');
          }
        } else {
          setRole(currentUser ? 'user' : null);
        }
      } catch (authError) {
        console.error('AuthContext: Erro geral na mudança de estado de auth:', authError);
        setUser(null);
        setSession(null);
        setRole(null);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    // Busca inicial da sessão
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleAuthStateChange(session);
    }).catch(err => {
      logAuthError('Erro ao obter sessão inicial', err);
      if (isMounted) setLoading(false);
    });

    // Listener de mudanças de autenticação
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      handleAuthStateChange(session);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    const supabase = createClient();
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) {
        logAuthError('Erro ao sair', error);
        addToast('error', 'Erro ao sair da conta.');
      } else {
        addToast('info', 'Você saiu da sua conta.');
      }
      
      setRole(null);
      setUser(null);
      setSession(null);
    } catch (error) {
      console.error('AuthContext: Exceção ao sair:', error);
      addToast('error', 'Erro inesperado ao sair.');
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = role === 'admin' || role === 'super_admin';
  const isStaff = role !== null && role !== 'user';

  return (
    <AuthContext.Provider value={{ user, session, role, isAdmin, isStaff, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
