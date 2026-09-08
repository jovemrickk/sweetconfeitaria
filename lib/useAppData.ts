'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import type { AppData } from './types';
import { normalizeAppData, seedData } from './seed';
import { getSupabaseClient, isSupabaseConfigured } from './supabase';

const STORAGE_KEY = 'sweet-dreams-gestao-v1';

type CloudStatus = 'local' | 'connecting' | 'saving' | 'synced' | 'error';

function safeParse(raw: string | null): AppData | null {
  if (!raw) return null;
  try {
    return normalizeAppData(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function useAppData() {
  const [data, setData] = useState<AppData>(seedData);
  const [loaded, setLoaded] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [cloudStatus, setCloudStatus] = useState<CloudStatus>('local');
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [cloudReady, setCloudReady] = useState(false);

  const dataRef = useRef(data);
  const applyingRemoteRef = useRef(false);
  const lastCloudJsonRef = useRef<string>('');
  const supabase = useMemo(() => getSupabaseClient(), []);
  const cloudEnabled = isSupabaseConfigured();

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    const local = safeParse(localStorage.getItem(STORAGE_KEY));
    if (local) setData(local);
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Erro ao salvar backup local:', error);
    }
  }, [data, loaded]);

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      setCloudStatus('local');
      return;
    }

    let active = true;

    supabase.auth.getSession().then(({ data: sessionData }) => {
      if (!active) return;
      setUser(sessionData.session?.user ?? null);
      setAuthLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setUser(session?.user ?? null);
      setCloudReady(false);
      setCloudError(null);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (!supabase || !user || !loaded) {
      if (!user) setCloudReady(false);
      return;
    }

    let active = true;
    setCloudStatus('connecting');
    setCloudError(null);

    const loadCloud = async () => {
      const { data: row, error } = await supabase
        .from('sweet_app_state')
        .select('data, updated_at')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!active) return;

      if (error) {
        setCloudError(error.message);
        setCloudStatus('error');
        return;
      }

      if (row?.data && Object.keys(row.data as object).length > 0) {
        const incoming = normalizeAppData(row.data);
        const json = JSON.stringify(incoming);
        lastCloudJsonRef.current = json;
        applyingRemoteRef.current = true;
        setData(incoming);
      } else {
        const localJson = JSON.stringify(dataRef.current);
        const { error: insertError } = await supabase.from('sweet_app_state').upsert({
          user_id: user.id,
          data: dataRef.current,
        });

        if (insertError) {
          setCloudError(insertError.message);
          setCloudStatus('error');
          return;
        }
        lastCloudJsonRef.current = localJson;
      }

      setCloudReady(true);
      setCloudStatus('synced');
    };

    loadCloud();

    const channel = supabase
      .channel(`sweet-state-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sweet_app_state',
          filter: `user_id=eq.${user.id}`,
        },
        payload => {
          if (!active) return;
          const nextRow = payload.new as { data?: AppData };
          if (!nextRow?.data) return;
          const normalized = normalizeAppData(nextRow.data);
          const incomingJson = JSON.stringify(normalized);
          const currentJson = JSON.stringify(dataRef.current);
          lastCloudJsonRef.current = incomingJson;
          if (incomingJson !== currentJson) {
            applyingRemoteRef.current = true;
            setData(normalized);
          }
          setCloudStatus('synced');
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [supabase, user, loaded]);

  useEffect(() => {
    if (!supabase || !user || !loaded || !cloudReady) return;

    const interval = window.setInterval(async () => {
      // Só puxa dados remotos quando não há alteração local pendente.
      const currentJson = JSON.stringify(dataRef.current);
      if (currentJson !== lastCloudJsonRef.current) return;

      const { data: row, error } = await supabase
        .from('sweet_app_state')
        .select('data')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error || !row?.data) return;

      const incoming = normalizeAppData(row.data);
      const incomingJson = JSON.stringify(incoming);
      if (incomingJson !== currentJson) {
        lastCloudJsonRef.current = incomingJson;
        applyingRemoteRef.current = true;
        setData(incoming);
        setCloudStatus('synced');
      }
    }, 5000);

    return () => window.clearInterval(interval);
  }, [supabase, user, loaded, cloudReady]);

  useEffect(() => {
    if (!supabase || !user || !loaded || !cloudReady) return;

    if (applyingRemoteRef.current) {
      applyingRemoteRef.current = false;
      return;
    }

    const nextJson = JSON.stringify(data);
    if (nextJson === lastCloudJsonRef.current) return;

    setCloudStatus('saving');
    const timer = window.setTimeout(async () => {
      const { error } = await supabase.from('sweet_app_state').upsert({
        user_id: user.id,
        data,
      });

      if (error) {
        setCloudError(error.message);
        setCloudStatus('error');
      } else {
        lastCloudJsonRef.current = nextJson;
        setCloudError(null);
        setCloudStatus('synced');
      }
    }, 550);

    return () => window.clearTimeout(timer);
  }, [data, supabase, user, loaded, cloudReady]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) return { error: 'Supabase não configurado.' };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }, [supabase]);

  const signUp = useCallback(async (email: string, password: string) => {
    if (!supabase) return { error: 'Supabase não configurado.', needsConfirmation: false };
    const { data: result, error } = await supabase.auth.signUp({ email, password });
    return {
      error: error?.message ?? null,
      needsConfirmation: Boolean(result.user && !result.session),
    };
  }, [supabase]);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
    setCloudReady(false);
    setCloudStatus('local');
  }, [supabase]);

  const api = useMemo(
    () => ({
      reset: () => setData(seedData),
      exportJson: () => {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `confeitaria-sweet-backup-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      },
      importJson: async (file: File) => {
        const text = await file.text();
        setData(normalizeAppData(JSON.parse(text)));
      },
    }),
    [data],
  );

  return {
    data,
    setData,
    loaded,
    user,
    authLoading,
    cloudEnabled,
    cloudReady,
    cloudStatus,
    cloudError,
    signIn,
    signUp,
    signOut,
    ...api,
  };
}
