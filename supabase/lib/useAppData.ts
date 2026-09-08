'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RealtimeChannel, Session } from '@supabase/supabase-js';
import type { AppData } from './types';
import { seedData } from './seed';
import { supabase, supabaseConfigured } from './supabase';

const STORAGE_KEY = 'sweet-dreams-gestao-v1';

type CloudStatus = 'local' | 'connecting' | 'synced' | 'saving' | 'error';

export function useAppData() {
  const [data, setData] = useState<AppData>(seedData);
  const [loaded, setLoaded] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [cloudStatus, setCloudStatus] = useState<CloudStatus>(supabaseConfigured ? 'connecting' : 'local');
  const [authError, setAuthError] = useState('');

  const cloudHydrated = useRef(false);
  const skipNextCloudSave = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sempre mantém um backup local. Se o Supabase ainda não estiver configurado,
  // esse backup continua sendo a fonte principal de dados.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setData(JSON.parse(raw));
    } catch (error) {
      console.error('Erro ao carregar backup local:', error);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Erro ao salvar backup local:', error);
    }
  }, [data]);

  // Inicializa autenticação e sincronização cloud.
  useEffect(() => {
    const client = supabase;
    if (!supabaseConfigured || !client) {
      setCloudStatus('local');
      setLoaded(true);
      return;
    }

    let active = true;
    let channel: RealtimeChannel | null = null;

    const hydrate = async (nextSession: Session | null) => {
      if (!active) return;
      setSession(nextSession);
      cloudHydrated.current = false;

      if (channel) {
        await client.removeChannel(channel);
        channel = null;
      }

      if (!nextSession) {
        setCloudStatus('connecting');
        setLoaded(true);
        return;
      }

      setCloudStatus('connecting');

      const userId = nextSession.user.id;
      const { data: row, error } = await client
        .from('sweet_app_state')
        .select('data, updated_at')
        .eq('user_id', userId)
        .maybeSingle();

      if (!active) return;

      if (error) {
        console.error('Erro ao carregar dados da nuvem:', error);
        setCloudStatus('error');
        setLoaded(true);
        return;
      }

      if (row?.data && Object.keys(row.data).length > 0) {
        skipNextCloudSave.current = true;
        setData(row.data as AppData);
      } else {
        // Primeira conexão: sobe o que já existe no navegador para não perder dados.
        const raw = localStorage.getItem(STORAGE_KEY);
        const localData = raw ? (JSON.parse(raw) as AppData) : seedData;
        const { error: insertError } = await client.from('sweet_app_state').upsert({
          user_id: userId,
          data: localData,
        });
        if (insertError) {
          console.error('Erro ao criar estado na nuvem:', insertError);
          setCloudStatus('error');
          setLoaded(true);
          return;
        }
        setData(localData);
      }

      cloudHydrated.current = true;
      setCloudStatus('synced');
      setLoaded(true);

      // Atualiza este aparelho quando o outro celular/PC salvar algo.
      channel = client
        .channel(`sweet-state-${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'sweet_app_state',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            const next = payload.new?.data as AppData | undefined;
            if (!next) return;
            skipNextCloudSave.current = true;
            setData(next);
            setCloudStatus('synced');
          },
        )
        .subscribe();
    };

    client.auth.getSession().then(({ data: authData }) => hydrate(authData.session));

    const { data: listener } = client.auth.onAuthStateChange((_event, nextSession) => {
      hydrate(nextSession);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
      if (channel) client.removeChannel(channel);
    };
  }, []);

  // Salva alterações do app no Supabase com debounce.
  useEffect(() => {
    if (!supabaseConfigured || !supabase || !session || !cloudHydrated.current) return;

    if (skipNextCloudSave.current) {
      skipNextCloudSave.current = false;
      return;
    }

    if (saveTimer.current) clearTimeout(saveTimer.current);
    setCloudStatus('saving');

    saveTimer.current = setTimeout(async () => {
      const { error } = await supabase.from('sweet_app_state').upsert({
        user_id: session.user.id,
        data,
      });

      if (error) {
        console.error('Erro ao salvar na nuvem:', error);
        setCloudStatus('error');
      } else {
        setCloudStatus('synced');
      }
    }, 650);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [data, session]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) return false;
    setAuthError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setAuthError(error.message);
      return false;
    }
    return true;
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    if (!supabase) return false;
    setAuthError('');
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setAuthError(error.message);
      return false;
    }
    return true;
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setSession(null);
    cloudHydrated.current = false;
    setCloudStatus('connecting');
  }, []);

  const api = useMemo(
    () => ({
      reset: () => setData(seedData),
      exportJson: () => {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sweet-dreams-backup-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      },
      importJson: async (file: File) => {
        const text = await file.text();
        setData(JSON.parse(text));
      },
    }),
    [data],
  );

  return {
    data,
    setData,
    loaded,
    session,
    cloudEnabled: supabaseConfigured,
    cloudStatus,
    authError,
    signIn,
    signUp,
    signOut,
    ...api,
  };
}
