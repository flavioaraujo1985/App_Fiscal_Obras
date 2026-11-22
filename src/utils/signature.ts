import type { AssinaturaEletronica } from '../types';

export async function gerarHashAssinatura(payload: string): Promise<string> {
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const encoded = new TextEncoder().encode(payload);
      const digest = await crypto.subtle.digest('SHA-256', encoded);
      const hex = Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase();
      return `FOP-${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}`;
    }
  } catch {
    // Fallback deterministic hash below
  }

  let acc = 2166136261;
  for (let i = 0; i < payload.length; i += 1) {
    acc ^= payload.charCodeAt(i);
    acc = Math.imul(acc, 16777619);
  }
  const part = (acc >>> 0).toString(16).toUpperCase().padStart(8, '0');
  const ts = Date.now().toString(16).toUpperCase().slice(-8);
  return `FOP-${part.slice(0, 4)}-${part.slice(4, 8)}-${ts.slice(0, 4)}-${ts.slice(4, 8)}`;
}

export async function criarAssinaturaEletronica(params: {
  nome: string;
  cargo: string;
  registro?: string;
  documentoRef: string;
  assinaturaImagem?: string;
}): Promise<AssinaturaEletronica> {
  const dataHora = new Date().toISOString();
  const base = `${params.documentoRef}|${params.nome.trim()}|${params.cargo.trim()}|${params.registro ?? ''}|${dataHora}`;
  const hash = await gerarHashAssinatura(base);
  return {
    id: `sig-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    nome: params.nome.trim(),
    cargo: params.cargo.trim(),
    registro: params.registro?.trim() || undefined,
    dataHora,
    hash,
    assinaturaImagem: params.assinaturaImagem,
  };
}

export function formatDateTimeBR(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}
