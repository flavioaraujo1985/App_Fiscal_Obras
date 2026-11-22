import type { Clima, FiscalDatabase } from '../types';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
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
  getDatabase: () => request<FiscalDatabase>('/api/db'),
  saveDatabase: (db: FiscalDatabase) =>
    request<FiscalDatabase>('/api/db', {
      method: 'PUT',
      body: JSON.stringify(db),
    }),
  resetDatabase: () =>
    request<FiscalDatabase>('/api/reset', {
      method: 'POST',
    }),
  getClima: (lat: number, lng: number) =>
    request<Clima>(`/api/clima?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`),
};
