import { createClient } from '@supabase/supabase-js';
import { INITIAL_SEED_DATA } from '../data/seedData';
import type { Clima, FiscalDatabase } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

const supabase =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

async function requestJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
    ...options,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Erro HTTP ${response.status}`);
  }
  return (await response.json()) as T;
}

export const api = {
  getDatabase: async (): Promise<FiscalDatabase> => {
    if (!supabase) {
      return requestJson<FiscalDatabase>('/api/db');
    }

    const { data, error } = await supabase
      .from('fiscal_database')
      .select('payload')
      .eq('id', 'principal')
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    const payload = data?.payload as FiscalDatabase | undefined;
    if (!payload || !Array.isArray(payload.contratos)) {
      return structuredClone(INITIAL_SEED_DATA);
    }

    return payload;
  },

  saveDatabase: async (db: FiscalDatabase): Promise<FiscalDatabase> => {
    if (!supabase) {
      return requestJson<FiscalDatabase>('/api/db', {
        method: 'PUT',
        body: JSON.stringify(db),
      });
    }

    const { error } = await supabase.from('fiscal_database').upsert(
      {
        id: 'principal',
        payload: db,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );

    if (error) {
      throw new Error(error.message);
    }

    return db;
  },

  resetDatabase: async (): Promise<FiscalDatabase> => {
    const fresh = structuredClone(INITIAL_SEED_DATA);
    if (!supabase) {
      return requestJson<FiscalDatabase>('/api/reset', {
        method: 'POST',
      });
    }

    const { error } = await supabase.from('fiscal_database').upsert(
      {
        id: 'principal',
        payload: fresh,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );

    if (error) {
      throw new Error(error.message);
    }

    return fresh;
  },

  getClima: (lat: number, lng: number) =>
    requestJson<Clima>(`/api/clima?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`),
};
