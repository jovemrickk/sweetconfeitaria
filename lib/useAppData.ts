'use client';

import { useEffect, useMemo, useState } from 'react';
import type { AppData } from './types';
import { seedData } from './seed';

const STORAGE_KEY = 'sweet-dreams-gestao-v1';

export function useAppData() {
  const [data, setData] = useState<AppData>(seedData);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);

      if (raw) {
        setData(JSON.parse(raw));
      }
    } catch (error) {
      console.error('Erro ao carregar dados locais:', error);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!loaded) return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Erro ao salvar dados locais:', error);
    }
  }, [data, loaded]);

  const api = useMemo(
    () => ({
      reset: () => {
        setData(seedData);
      },

      exportJson: () => {
        const blob = new Blob([JSON.stringify(data, null, 2)], {
          type: 'application/json',
        });

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');

        a.href = url;
        a.download = `sweet-dreams-backup-${new Date()
          .toISOString()
          .slice(0, 10)}.json`;

        document.body.appendChild(a);
        a.click();
        a.remove();

        URL.revokeObjectURL(url);
      },

      importJson: async (file: File) => {
        const text = await file.text();
        const parsed = JSON.parse(text) as AppData;

        setData(parsed);
      },
    }),
    [data],
  );

  return {
    data,
    setData,
    loaded,
    ...api,
  };
}
