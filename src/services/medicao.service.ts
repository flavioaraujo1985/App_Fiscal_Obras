import type { Contrato, Garantia, Medicao, NaoConformidade } from '../types';
import {
  calcularDiasRestantes,
  percentualExecutado,
  podeMedir,
  podePagar,
  validarGarantiaAtiva,
  validarQuantidade,
} from '../utils/engineering';

export const medicaoService = {
  validarItemMedicao(contratado: number, saldoAnterior: number, quantidadeAtual: number) {
    const executadoAnterior = Math.max(0, contratado - saldoAnterior);
    return validarQuantidade(contratado, executadoAnterior, quantidadeAtual);
  },

  verificarRequisitosAprovacao(params: {
    contrato: Contrato;
    garantias: Garantia[];
    ncs: NaoConformidade[];
    medicao: Medicao;
    totalExecutadoContrato: number;
  }) {
    const { contrato, garantias, ncs, medicao, totalExecutadoContrato } = params;
    const vigenciaOk = calcularDiasRestantes(contrato.dataFim) >= 0;
    const saldoOk = totalExecutadoContrato <= contrato.valorAtual + 0.01;
    const garantiaOk = validarGarantiaAtiva(garantias.filter((g) => g.contratoId === contrato.id));
    const ncsMedirOk = podeMedir(ncs.filter((n) => n.contratoId === contrato.id));
    const ncsPagarOk = podePagar(ncs.filter((n) => n.contratoId === contrato.id));
    const itensOk = medicao.itensMedidos.some((i) => i.quantidadeMedida > 0);

    return {
      vigenciaOk,
      saldoOk,
      garantiaOk,
      ncsMedirOk,
      ncsPagarOk,
      itensOk,
      aptoAprovar: vigenciaOk && saldoOk && ncsMedirOk && itensOk,
    };
  },

  percentualAcumuladoContrato(contrato: Contrato, medicoes: Medicao[]): number {
    const total = medicoes
      .filter((m) => m.contratoId === contrato.id && m.status !== 'REJEITADA' && m.status !== 'RASCUNHO')
      .reduce((acc, m) => acc + m.valor, 0);
    return percentualExecutado(contrato.valorAtual, total);
  },
};
