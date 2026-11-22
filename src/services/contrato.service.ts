import type { Aditivo, Contrato, Documento, EtapaCronograma, Garantia } from '../types';
import { calcularChecklistContrato, calcularDiasRestantes, valorAtualizado } from '../utils/engineering';

export const contratoService = {
  calcularValorAtual(contrato: Contrato, aditivos: Aditivo[]): number {
    const valores = aditivos
      .filter((a) => a.contratoId === contrato.id && a.tipo === 'VALOR')
      .map((a) => a.valor);
    return valorAtualizado(contrato.valorInicial, valores);
  },

  calcularProgressoFisico(etapas: EtapaCronograma[]): number {
    if (etapas.length === 0) return 0;
    const totalPeso = etapas.reduce((acc, e) => acc + e.percentual, 0);
    if (totalPeso <= 0) return 0;
    const ponderado = etapas.reduce((acc, e) => acc + (e.percentual * e.executado) / 100, 0);
    return Number(((ponderado / totalPeso) * 100).toFixed(1));
  },

  obterSituacaoVigencia(dataFim: string) {
    const dias = calcularDiasRestantes(dataFim);
    return {
      diasRestantes: dias,
      vencido: dias < 0,
      critico: dias <= 15,
      alerta: dias > 15 && dias <= 30,
    };
  },

  resumirChecklist(contrato: Contrato) {
    return calcularChecklistContrato(contrato.checklist);
  },

  filtrarPorContrato<T extends { contratoId: string }>(lista: T[], contratoId: string): T[] {
    return lista.filter((item) => item.contratoId === contratoId);
  },

  agruparDocumentosPorTipo(documentos: Documento[]): Record<string, number> {
    return documentos.reduce<Record<string, number>>((acc, doc) => {
      acc[doc.tipo] = (acc[doc.tipo] ?? 0) + 1;
      return acc;
    }, {});
  },

  garantiaVigente(garantias: Garantia[]): Garantia | undefined {
    return garantias.find((g) => calcularDiasRestantes(g.fim) >= 0);
  },
};
