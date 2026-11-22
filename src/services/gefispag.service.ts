import type {
  Contrato,
  Garantia,
  NaoConformidade,
  ProcessoPagamentoGEFISPAG,
} from '../types';
import {
  calcularDiasRestantes,
  podePagar,
  validarCertidoes,
  validarGarantiaAtiva,
} from '../utils/engineering';

export interface ValidacaoGEFISPAGResultado {
  certidoesValidas: boolean;
  vigenciaValida: boolean;
  garantiaValida: boolean;
  inconformidadesBloqueantes: NaoConformidade[];
  checklistCompleto: boolean;
  aptoParaPagamento: boolean;
}

export const gefispagService = {
  validarProcessoPagamento(params: {
    processo: ProcessoPagamentoGEFISPAG;
    contrato: Contrato;
    garantias: Garantia[];
    ncsContrato: NaoConformidade[];
  }): ValidacaoGEFISPAGResultado {
    const { processo, contrato, garantias, ncsContrato } = params;
    const certidoesValidas = validarCertidoes(processo.certidoes);
    const vigenciaValida = calcularDiasRestantes(contrato.dataFim) >= 0;
    const garantiaValida = validarGarantiaAtiva(garantias.filter((g) => g.contratoId === contrato.id));
    const inconformidadesBloqueantes = ncsContrato.filter(
      (nc) => nc.status !== 'ENCERRADA' && nc.gravidade !== 'BAIXA'
    );
    const checklistCompleto = processo.checklistDocumental
      .filter((i) => i.obrigatorio)
      .every((i) => i.conferido);

    return {
      certidoesValidas,
      vigenciaValida,
      garantiaValida,
      inconformidadesBloqueantes,
      checklistCompleto,
      aptoParaPagamento:
        certidoesValidas &&
        vigenciaValida &&
        garantiaValida &&
        podePagar(ncsContrato) &&
        checklistCompleto,
    };
  },

  calcularRetencoesPadrao(valorBruto: number) {
    const inss = Number((valorBruto * 0.11).toFixed(2));
    const iss = Number((valorBruto * 0.05).toFixed(2));
    const irrf = Number((valorBruto * 0.012).toFixed(2));
    const valorLiquido = Number((valorBruto - inss - iss - irrf).toFixed(2));
    return { inss, iss, irrf, valorLiquido };
  },
};
