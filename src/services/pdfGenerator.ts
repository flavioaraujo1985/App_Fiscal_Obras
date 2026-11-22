import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type {
  Aditivo,
  AssinaturaEletronica,
  AvaliacaoDesempenho,
  ConfiguracoesSistema,
  Contrato,
  DiarioObra,
  FiscalDatabase,
  Garantia,
  Medicao,
  NaoConformidade,
  ProcessoPagamentoGEFISPAG,
  TermoRecebimento,
} from '../types';
import {
  calcularAvaliacaoDesempenho,
  calcularSaldoContrato,
  calcularScoreContratada,
  formatCurrencyBR,
  formatDateBR,
  formatNumberBR,
  toRomanNumeral,
} from '../utils/engineering';
import { formatDateTimeBR } from '../utils/signature';
import { deviceStorage, extractLocalFileId, isLocalFileUrl } from './deviceStorage';

export interface FotoPdfItem {
  id: string;
  url: string;
  categoria: string;
  descricao: string;
  dataHora: string;
  latitude: number;
  longitude: number;
  origem?: string;
  contratoNumero?: string;
}

async function loadImageForPdf(
  url: string
): Promise<{ dataUrl: string; width: number; height: number } | null> {
  if (!url) return null;
  let objectUrlToRevoke: string | null = null;
  try {
    let resolvedSrc = url;
    if (isLocalFileUrl(url)) {
      const stored = await deviceStorage.getFile(extractLocalFileId(url));
      if (!stored) return null;
      objectUrlToRevoke = URL.createObjectURL(stored.blob);
      resolvedSrc = objectUrlToRevoke;
    }

    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.crossOrigin = 'anonymous';
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Falha ao carregar imagem'));
      el.src = resolvedSrc;
    });

    const maxDim = 1100;
    let w = img.naturalWidth || img.width || 800;
    let h = img.naturalHeight || img.height || 600;
    if (w > maxDim || h > maxDim) {
      const ratio = Math.min(maxDim / w, maxDim / h);
      w = Math.round(w * ratio);
      h = Math.round(h * ratio);
    }

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);

    return {
      dataUrl: canvas.toDataURL('image/jpeg', 0.85),
      width: w,
      height: h,
    };
  } catch {
    return null;
  } finally {
    if (objectUrlToRevoke) {
      URL.revokeObjectURL(objectUrlToRevoke);
    }
  }
}

async function drawFotosBlock(
  doc: jsPDF,
  startY: number,
  fotos: FotoPdfItem[],
  tituloSecao = 'REGISTRO FOTOGRÁFICO GEORREFERENCIADO'
): Promise<number> {
  if (fotos.length === 0) return startY;

  let y = startY + 8;
  if (y > 205) {
    doc.addPage();
    y = 20;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(0, 74, 143);
  doc.text(`${tituloSecao} (${fotos.length} registro(s))`, 14, y);
  y += 5;

  const cardW = 182;
  const imgBoxW = 78;
  const imgBoxH = 56;

  for (let idx = 0; idx < fotos.length; idx += 1) {
    const f = fotos[idx];
    const descLines = doc.splitTextToSize(f.descricao || 'Sem observação registrada.', 92);
    const dynamicH = Math.max(66, 38 + descLines.length * 4 + 6);

    if (y + dynamicH > 276) {
      doc.addPage();
      y = 20;
    }

    // Outer card
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(14, y, cardW, dynamicH, 2, 2, 'FD');

    // Photo header bar
    doc.setFillColor(226, 232, 240);
    doc.rect(14, y, cardW, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    const headerLabel = `FOTO ${(idx + 1).toString().padStart(2, '0')} · ${f.categoria}${f.contratoNumero ? ` · Contrato ${f.contratoNumero}` : ''}`;
    doc.text(headerLabel, 17, y + 4.8);

    doc.setFont('courier', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(formatDateTimeBR(f.dataHora), 193, y + 4.8, { align: 'right' });

    // Image box
    const imgX = 17;
    const imgY = y + 10;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(203, 213, 225);
    doc.rect(imgX, imgY, imgBoxW, imgBoxH, 'FD');

    const loaded = await loadImageForPdf(f.url);
    if (loaded) {
      const scale = Math.min((imgBoxW - 2) / loaded.width, (imgBoxH - 2) / loaded.height);
      const drawW = loaded.width * scale;
      const drawH = loaded.height * scale;
      const offsetX = imgX + (imgBoxW - drawW) / 2;
      const offsetY = imgY + (imgBoxH - drawH) / 2;
      doc.addImage(loaded.dataUrl, 'JPEG', offsetX, offsetY, drawW, drawH);
    } else {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text('Imagem não disponível', imgX + imgBoxW / 2, imgY + imgBoxH / 2, {
        align: 'center',
      });
    }

    // Technical details column
    const infoX = 100;
    let infoY = y + 13;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text('ORIGEM / ETAPA:', infoX, infoY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(
      `${f.origem ?? 'Vistoria de Campo'} · ${f.categoria}`,
      infoX,
      infoY + 4
    );
    infoY += 9;

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('DATA / HORA E COORDENADAS GPS:', infoX, infoY);
    doc.setFont('courier', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(
      `${formatDateTimeBR(f.dataHora)} · ${f.latitude.toFixed(5)}, ${f.longitude.toFixed(5)}`,
      infoX,
      infoY + 4
    );
    infoY += 9;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text('DESCRIÇÃO / OBSERVAÇÃO TÉCNICA:', infoX, infoY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(descLines, infoX, infoY + 4);

    y += dynamicH + 5;
  }

  return y;
}

function getLastTableY(doc: jsPDF, fallback = 60): number {
  const withAuto = doc as jsPDF & { lastAutoTable?: { finalY?: number } };
  return withAuto.lastAutoTable?.finalY ?? fallback;
}

function addHeader(
  doc: jsPDF,
  config: ConfiguracoesSistema,
  titulo: string,
  subtitulo: string
): number {
  doc.setFillColor(0, 74, 143);
  doc.rect(0, 0, 210, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('FiscalObra Pro', 14, 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`${config.orgaoNome} · ${config.cidadeUf}`, 14, 16);
  doc.text(config.secretaria, 14, 20.5);

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(titulo, 14, 34);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(71, 85, 105);
  const splitSub = doc.splitTextToSize(subtitulo, 182);
  doc.text(splitSub, 14, 40);

  return 42 + splitSub.length * 4.5;
}

interface SignerField {
  nome: string;
  cargo: string;
  registro?: string;
}

function drawCamposAssinaturaFisica(
  doc: jsPDF,
  startY: number,
  assinaturas: AssinaturaEletronica[],
  fallbackSigners: SignerField[]
): void {
  const signers: SignerField[] =
    assinaturas.length > 0
      ? assinaturas.map((a) => ({ nome: a.nome, cargo: a.cargo, registro: a.registro }))
      : fallbackSigners;

  let y = startY + 10;
  if (y > 232) {
    doc.addPage();
    y = 20;
  }

  doc.setDrawColor(203, 213, 225);
  doc.line(14, y, 196, y);
  y += 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0, 74, 143);
  doc.text('ASSINATURAS', 14, y);
  y += 5;

  const cardW = signers.length === 1 ? 120 : 88;
  const cardH = 30;

  for (let idx = 0; idx < signers.length; idx += 1) {
    const col = signers.length === 1 ? 0 : idx % 2;
    if (col === 0 && y + cardH > 275) {
      doc.addPage();
      y = 20;
    }

    const x = col === 0 ? 14 : 108;
    const s = signers[idx];

    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, y, cardW, cardH, 1.5, 1.5, 'D');

    // Blank space above line for physical pen signature
    doc.setDrawColor(100, 116, 139);
    doc.line(x + 6, y + 17, x + cardW - 6, y + 17);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    const nomeText = doc.splitTextToSize(s.nome, cardW - 10)[0] ?? s.nome;
    doc.text(nomeText, x + cardW / 2, y + 22, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    const desc = s.registro ? `${s.cargo} · ${s.registro}` : s.cargo;
    const descText = doc.splitTextToSize(desc, cardW - 10)[0] ?? desc;
    doc.text(descText, x + cardW / 2, y + 26.5, { align: 'center' });

    if (col === 1 || idx === signers.length - 1 || signers.length === 1) {
      y += cardH + 5;
    }
  }

  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p += 1) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`FiscalObra Pro · Página ${p} de ${pageCount}`, 14, 290);
  }
}

async function saveAndDownloadPdf(doc: jsPDF, fileName: string): Promise<void> {
  const blob = doc.output('blob');
  try {
    await deviceStorage.saveFileToDevice(blob, fileName);
  } catch {
    // Non-fatal if device file index fails; download still proceeds
  }
  doc.save(fileName);
}

export async function gerarPdfBoletimMedicao(params: {
  medicao: Medicao;
  contrato: Contrato;
  config: ConfiguracoesSistema;
  acumuladoPercent: number;
}): Promise<void> {
  const { medicao, contrato, config, acumuladoPercent } = params;
  const doc = new jsPDF();
  const numStr = medicao.numero.toString().padStart(2, '0');

  let y = addHeader(
    doc,
    config,
    `BOLETIM DE MEDIÇÃO Nº ${numStr} — Competência ${medicao.competencia}`,
    `Contrato ${contrato.numero} · ${contrato.contratada} (CNPJ ${contrato.cnpj})`
  );

  const resumoRows: string[][] = [
    ['Objeto', contrato.objeto],
    [
      'Período / Status',
      `${formatDateBR(medicao.dataInicio)} a ${formatDateBR(medicao.dataFim)} · Status: ${medicao.status}`,
    ],
    [
      'Valor Medido / % Contrato',
      `${formatCurrencyBR(medicao.valor)} (${medicao.percentual.toFixed(2)}%) · Acumulado: ${acumuladoPercent.toFixed(1)}%`,
    ],
    ['Fiscal / Gestor', `${contrato.fiscal} (${config.creaFiscal}) · Gestor: ${contrato.gestor}`],
  ];

  if (medicao.notaFiscal?.numero) {
    const nf = medicao.notaFiscal;
    resumoRows.push([
      'Nota Fiscal da Contratada',
      `${nf.numero}${nf.serie ? ` (Série ${nf.serie})` : ''} · Emissão ${formatDateBR(nf.dataEmissao)} · Valor ${formatCurrencyBR(nf.valor)}${nf.chaveAcesso ? ` · Chave: ${nf.chaveAcesso}` : ''}`,
    ]);
  }

  autoTable(doc, {
    startY: y + 2,
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 2.5 },
    headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42] },
    body: resumoRows,
  });

  y = getLastTableY(doc, y + 30) + 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Planilha de Itens Medidos', 14, y);

  autoTable(doc, {
    startY: y + 3,
    theme: 'striped',
    styles: { fontSize: 8, cellPadding: 2.2 },
    headStyles: { fillColor: [0, 74, 143], textColor: [255, 255, 255] },
    head: [['Código', 'Descrição', 'Unid', 'Saldo Ant.', 'Qtd Medida', 'Saldo Atual', 'Unitário', 'Valor Medido']],
    body:
      medicao.itensMedidos.length > 0
        ? medicao.itensMedidos.map((i) => [
            i.codigo,
            i.descricao,
            i.unidade,
            formatNumberBR(i.saldoAnterior),
            formatNumberBR(i.quantidadeMedida),
            formatNumberBR(i.saldoAtual),
            formatCurrencyBR(i.precoUnitario),
            formatCurrencyBR(i.valorMedido),
          ])
        : [['—', 'Nenhum item lançado nesta medição', '—', '—', '—', '—', '—', 'R$ 0,00']],
    foot: [['', '', '', '', '', '', 'TOTAL', formatCurrencyBR(medicao.valor)]],
    footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
  });

  y = getLastTableY(doc, y + 30) + 8;

  if (medicao.memoriasCalculo.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text('Memória de Cálculo', 14, y);

    autoTable(doc, {
      startY: y + 3,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2.2 },
      headStyles: { fillColor: [0, 137, 123], textColor: [255, 255, 255] },
      head: [['Serviço', 'Local', 'Fórmula', 'Resultado']],
      body: medicao.memoriasCalculo.map((mc) => [
        mc.descricao,
        mc.local,
        mc.formula,
        `${formatNumberBR(mc.valor)} ${mc.unidade}`,
      ]),
    });
    y = getLastTableY(doc, y + 24) + 8;
  }

  if (medicao.parecerFiscal) {
    if (y > 240) {
      doc.addPage();
      y = 20;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text('Parecer Técnico do Fiscal', 14, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const lines = doc.splitTextToSize(medicao.parecerFiscal.texto, 182);
    doc.text(lines, 14, y + 6);
    y += 10 + lines.length * 4.5;
    doc.setFontSize(8.5);
    doc.text(
      `Conclusão: ${medicao.parecerFiscal.conclusao} · Emitido por ${medicao.parecerFiscal.fiscal} em ${formatDateBR(medicao.parecerFiscal.data)}`,
      14,
      y
    );
    y += 4;
  }

  if (medicao.fotos.length > 0) {
    y = await drawFotosBlock(
      doc,
      y,
      medicao.fotos.map((f) => ({
        id: f.id,
        url: f.url,
        categoria: f.categoria,
        descricao: f.observacao,
        dataHora: f.dataHora,
        latitude: f.latitude,
        longitude: f.longitude,
        origem: `Medição nº ${numStr}`,
        contratoNumero: contrato.numero,
      })),
      'ANEXO FOTOGRÁFICO DA MEDIÇÃO'
    );
  }

  drawCamposAssinaturaFisica(
    doc,
    y,
    medicao.assinaturas ?? [],
    [
      { nome: contrato.fiscal, cargo: 'Fiscal do Contrato', registro: config.creaFiscal },
      { nome: contrato.gestor, cargo: 'Gestor do Contrato' },
      { nome: contrato.contratada, cargo: 'Contratada', registro: contrato.cnpj },
    ]
  );

  await saveAndDownloadPdf(doc, `boletim-medicao-${numStr}-${contrato.numero}.pdf`);
}

export async function gerarPdfRdo(params: {
  diario: DiarioObra;
  contrato: Contrato;
  config: ConfiguracoesSistema;
}): Promise<void> {
  const { diario, contrato, config } = params;
  const doc = new jsPDF();

  let y = addHeader(
    doc,
    config,
    `RELATÓRIO DIÁRIO DE OBRA (RDO) — ${formatDateBR(diario.data)}`,
    `Contrato ${contrato.numero} · ${contrato.contratada} · Status: ${diario.status}`
  );

  autoTable(doc, {
    startY: y + 2,
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 2.5 },
    body: [
      [
        'Condições Climáticas',
        `${diario.clima.temperatura}°C · Umidade ${diario.clima.umidade}% · Vento ${diario.clima.velocidadeVento} km/h · ${diario.clima.chuva ? 'Com chuva' : 'Sem chuva'}`,
      ],
      ['Observação Climática', diario.clima.observacao],
      ['Relato Geral', diario.observacoes],
    ],
  });

  y = getLastTableY(doc, y + 25) + 7;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('Efetivo e Equipamentos', 14, y);

  autoTable(doc, {
    startY: y + 3,
    theme: 'striped',
    styles: { fontSize: 8.5 },
    headStyles: { fillColor: [0, 74, 143], textColor: [255, 255, 255] },
    head: [['Categoria / Equipamento', 'Tipo', 'Quantidade / Situação']],
    body: [
      ...diario.efetivo.map((e) => [e.categoria, 'Mão de Obra', `${e.quantidade} trabalhador(es)`]),
      ...diario.equipamentos.map((eq) => [
        eq.descricao,
        'Equipamento',
        `${eq.quantidade} un · ${eq.operacional ? 'Operacional' : 'Em Manutenção'}`,
      ]),
    ],
  });

  y = getLastTableY(doc, y + 25) + 7;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('Atividades Executadas e Ocorrências', 14, y);

  autoTable(doc, {
    startY: y + 3,
    theme: 'grid',
    styles: { fontSize: 8.5 },
    headStyles: { fillColor: [0, 137, 123], textColor: [255, 255, 255] },
    head: [['Registro', 'Local / Tipo', 'Avanço / Criticidade']],
    body: [
      ...diario.atividades.map((a) => [a.descricao, a.local, `${a.percentual}% concluído`]),
      ...diario.ocorrencias.map((o) => [o.descricao, `Ocorrência (${o.tipo})`, o.criticidade]),
    ],
  });

  y = getLastTableY(doc, y + 25);

  if (diario.fotos.length > 0) {
    y = await drawFotosBlock(
      doc,
      y,
      diario.fotos.map((f) => ({
        id: f.id,
        url: f.url,
        categoria: f.categoria,
        descricao: f.descricao,
        dataHora: f.dataHora,
        latitude: f.latitude,
        longitude: f.longitude,
        origem: `RDO ${formatDateBR(diario.data)}`,
        contratoNumero: contrato.numero,
      })),
      'ANEXO FOTOGRÁFICO DO RDO'
    );
  }

  const assinaturasRdo: AssinaturaEletronica[] = diario.assinaturas.map((a) => ({
    id: a.id,
    nome: a.nome,
    cargo: a.cargo,
    registro: a.registro,
    dataHora: a.dataHora,
    hash: a.hash ?? '',
  }));

  drawCamposAssinaturaFisica(
    doc,
    y,
    assinaturasRdo,
    [
      { nome: contrato.fiscal, cargo: 'Fiscal do Contrato', registro: config.creaFiscal },
      { nome: contrato.contratada, cargo: 'Engenheiro Residente / Contratada' },
    ]
  );

  await saveAndDownloadPdf(doc, `rdo-${diario.data}-${contrato.numero}.pdf`);
}

export async function gerarPdfNotificacaoNC(params: {
  nc: NaoConformidade;
  contrato: Contrato;
  config: ConfiguracoesSistema;
}): Promise<void> {
  const { nc, contrato, config } = params;
  const doc = new jsPDF();

  let y = addHeader(
    doc,
    config,
    `NOTIFICAÇÃO DE NÃO CONFORMIDADE — ${nc.codigo}`,
    `Contrato ${contrato.numero} · ${contrato.contratada} (CNPJ ${contrato.cnpj})`
  );

  autoTable(doc, {
    startY: y + 2,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3 },
    body: [
      ['Título', nc.titulo],
      ['Origem / Gravidade', `${nc.origem} · Gravidade: ${nc.gravidade} · Status: ${nc.status}`],
      ['Abertura / Prazo Limite', `${formatDateBR(nc.dataRegistro)} · Limite: ${formatDateBR(nc.dataLimite)}`],
      ['Descrição Técnica', nc.descricao],
    ],
  });

  y = getLastTableY(doc, y + 40) + 8;

  if (nc.planoAcao) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text('Plano de Ação Corretiva (5W2H)', 14, y);
    autoTable(doc, {
      startY: y + 3,
      theme: 'grid',
      styles: { fontSize: 8.5 },
      body: [
        ['O que (What)', nc.planoAcao.what],
        ['Por que (Why)', nc.planoAcao.why],
        ['Onde (Where)', nc.planoAcao.where],
        ['Quando (When)', nc.planoAcao.when],
        ['Quem (Who)', nc.planoAcao.who],
        ['Como (How)', nc.planoAcao.how],
        ['Quanto (How Much)', nc.planoAcao.howMuch],
      ],
    });
    y = getLastTableY(doc, y + 40) + 8;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('Histórico de Tramitação', 14, y);
  autoTable(doc, {
    startY: y + 3,
    theme: 'striped',
    styles: { fontSize: 8.5 },
    headStyles: { fillColor: [0, 74, 143], textColor: [255, 255, 255] },
    head: [['Data', 'Responsável', 'Evento']],
    body: nc.historico.map((h) => [formatDateBR(h.data), h.usuario, h.descricao]),
  });

  y = getLastTableY(doc, y + 25);

  drawCamposAssinaturaFisica(
    doc,
    y,
    nc.assinaturas ?? [],
    [
      { nome: contrato.fiscal, cargo: 'Fiscal Notificante', registro: config.creaFiscal },
      { nome: contrato.contratada, cargo: 'Ciência da Contratada', registro: contrato.cnpj },
    ]
  );

  await saveAndDownloadPdf(doc, `notificacao-${nc.codigo}.pdf`);
}

export async function gerarPdfGefispag(params: {
  processo: ProcessoPagamentoGEFISPAG;
  contrato: Contrato;
  medicao?: Medicao;
  config: ConfiguracoesSistema;
}): Promise<void> {
  const { processo, contrato, medicao, config } = params;
  const doc = new jsPDF();

  let y = addHeader(
    doc,
    config,
    `PROCESSO DE PAGAMENTO ${processo.numeroProcesso}`,
    `Contrato ${contrato.numero} · ${contrato.contratada} · NF ${processo.notaFiscal}`
  );

  const nf = processo.notaFiscalInfo ?? medicao?.notaFiscal;
  const nfDesc = nf
    ? `${nf.numero}${nf.serie ? ` (Série ${nf.serie})` : ''} · Emissão ${formatDateBR(nf.dataEmissao)} · Valor ${formatCurrencyBR(nf.valor)}${nf.chaveAcesso ? ` · Chave: ${nf.chaveAcesso}` : ''}`
    : processo.notaFiscal;

  autoTable(doc, {
    startY: y + 2,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 2.8 },
    body: [
      ['Medição / Competência', `Medição nº ${medicao?.numero ?? '—'} · ${processo.competencia}`],
      ['Nota Fiscal da Contratada', nfDesc],
      ['Etapa Atual / Autuação', `${processo.statusWorkflow} · Autuado em ${formatDateBR(processo.dataAutuacao)}`],
      ['Valor Bruto', formatCurrencyBR(processo.valorBruto)],
      [
        'Retenções (INSS / ISS / IRRF)',
        `INSS: ${formatCurrencyBR(processo.retencoes.inss)} · ISS: ${formatCurrencyBR(processo.retencoes.iss)} · IRRF: ${formatCurrencyBR(processo.retencoes.irrf)}`,
      ],
      ['Valor Líquido a Pagar', formatCurrencyBR(processo.valorLiquido)],
    ],
  });

  y = getLastTableY(doc, y + 40) + 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('Checklist Documental e Certidões', 14, y);

  autoTable(doc, {
    startY: y + 3,
    theme: 'striped',
    styles: { fontSize: 8 },
    headStyles: { fillColor: [0, 74, 143], textColor: [255, 255, 255] },
    head: [['Item / Certidão', 'Detalhe', 'Situação']],
    body: [
      ...processo.checklistDocumental.map((c) => [
        c.label,
        c.observacao ?? 'Checklist documental',
        c.conferido ? 'CONFERIDO' : 'PENDENTE',
      ]),
      ...processo.certidoes.map((cert) => [
        cert.nome,
        `${cert.orgao} · Validade ${formatDateBR(cert.validade)}`,
        cert.regular ? 'REGULAR' : 'IRREGULAR',
      ]),
    ],
  });

  y = getLastTableY(doc, y + 40) + 8;
  if (y > 235) {
    doc.addPage();
    y = 20;
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('Pareceres', 14, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const pFiscal = doc.splitTextToSize(
    `Parecer Fiscal (${processo.parecerFiscalAprovado ? 'Atestado' : 'Pendente'}): ${processo.parecerFiscal || '—'}`,
    182
  );
  doc.text(pFiscal, 14, y + 5);
  const y2 = y + 7 + pFiscal.length * 4;
  const pGestor = doc.splitTextToSize(
    `Parecer Gestor (${processo.parecerGestorAprovado ? 'Autorizado' : 'Pendente'}): ${processo.parecerGestor || '—'}`,
    182
  );
  doc.text(pGestor, 14, y2);
  const endParecerY = y2 + pGestor.length * 4;

  drawCamposAssinaturaFisica(
    doc,
    endParecerY,
    processo.assinaturas ?? [],
    [
      { nome: contrato.fiscal, cargo: 'Fiscal Atestante', registro: config.creaFiscal },
      { nome: contrato.gestor, cargo: 'Gestor Autorizador' },
      { nome: contrato.contratada, cargo: 'Contratada / Emissor NF', registro: contrato.cnpj },
    ]
  );

  await saveAndDownloadPdf(doc, `gefispag-${processo.numeroProcesso.replace(/\//g, '-')}.pdf`);
}

export async function gerarPdfTermoRecebimento(params: {
  termo: TermoRecebimento;
  contrato: Contrato;
  config: ConfiguracoesSistema;
}): Promise<void> {
  const { termo, contrato, config } = params;
  const doc = new jsPDF();

  let y = addHeader(
    doc,
    config,
    `TERMO DE RECEBIMENTO ${termo.tipo === 'PROVISORIO' ? 'PROVISÓRIO' : 'DEFINITIVO'} — ${termo.numero}`,
    `Art. 140 da Lei nº 14.133/2021 · Contrato ${contrato.numero}`
  );

  autoTable(doc, {
    startY: y + 4,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3 },
    body: [
      ['Empresa Contratada', `${contrato.contratada} (CNPJ ${contrato.cnpj})`],
      ['Objeto', contrato.objeto],
      ['Data de Emissão / Status', `${formatDateBR(termo.dataEmissao)} · ${termo.status}`],
      ['Fiscal Responsável', termo.fiscalResponsavel],
      ['Gestor Responsável', termo.gestorResponsavel],
      ['Representante da Contratada', termo.representanteContratada],
      ['Parecer & Observações', termo.observacoes],
    ],
  });

  y = getLastTableY(doc, y + 50);

  drawCamposAssinaturaFisica(
    doc,
    y,
    termo.assinaturas ?? [],
    [
      { nome: termo.fiscalResponsavel, cargo: 'Fiscal Responsável', registro: config.creaFiscal },
      { nome: termo.gestorResponsavel, cargo: 'Gestor Responsável' },
      { nome: termo.representanteContratada, cargo: 'Representante da Contratada' },
    ]
  );

  await saveAndDownloadPdf(doc, `termo-${termo.numero.replace(/\//g, '-')}.pdf`);
}

export async function gerarPdfFichaContrato(params: {
  contrato: Contrato;
  aditivos: Aditivo[];
  garantias: Garantia[];
  medicoes: Medicao[];
  ncs: NaoConformidade[];
  config: ConfiguracoesSistema;
}): Promise<void> {
  const { contrato, aditivos, garantias, medicoes, ncs, config } = params;
  const doc = new jsPDF();
  const saldo = calcularSaldoContrato(contrato, aditivos, medicoes);

  let y = addHeader(
    doc,
    config,
    `FICHA DO CONTRATO Nº ${contrato.numero}`,
    `${contrato.contratada} · Processo ${contrato.processo} · ${contrato.municipio}`
  );

  autoTable(doc, {
    startY: y + 2,
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 2.5 },
    body: [
      ['Objeto', contrato.objeto],
      ['Vigência / Status', `${formatDateBR(contrato.dataInicio)} a ${formatDateBR(contrato.dataFim)} · ${contrato.status}`],
      ['Fiscal / Gestor', `${contrato.fiscal} · ${contrato.gestor}`],
      ['Valor Inicial / Aditivos', `${formatCurrencyBR(saldo.valorInicial)} / ${formatCurrencyBR(saldo.totalAditivosValor)}`],
      ['Valor Atual / Executado / Saldo', `${formatCurrencyBR(saldo.valorAtual)} / ${formatCurrencyBR(saldo.executado)} (${saldo.percentual.toFixed(1)}%) / ${formatCurrencyBR(saldo.saldo)}`],
    ],
  });

  y = getLastTableY(doc, y + 36) + 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`Resumo: ${medicoes.length} Medição(ões) · ${aditivos.length} Aditivo(s) · ${garantias.length} Garantia(s) · ${ncs.length} NC(s)`, 14, y);

  if (medicoes.length > 0) {
    autoTable(doc, {
      startY: y + 4,
      theme: 'striped',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [0, 74, 143], textColor: [255, 255, 255] },
      head: [['Medição', 'Competência', 'Nota Fiscal', 'Valor', '%', 'Status']],
      body: medicoes.map((m) => [
        `Nº ${m.numero}`,
        m.competencia,
        m.notaFiscal?.numero ?? '—',
        formatCurrencyBR(m.valor),
        `${m.percentual.toFixed(2)}%`,
        m.status,
      ]),
    });
    y = getLastTableY(doc, y + 30);
  }

  drawCamposAssinaturaFisica(
    doc,
    y,
    contrato.assinaturas ?? [],
    [
      { nome: contrato.fiscal, cargo: 'Fiscal do Contrato', registro: config.creaFiscal },
      { nome: contrato.gestor, cargo: 'Gestor do Contrato' },
      { nome: contrato.contratada, cargo: 'Empresa Contratada', registro: contrato.cnpj },
    ]
  );

  await saveAndDownloadPdf(doc, `ficha-contrato-${contrato.numero}.pdf`);
}

export async function gerarPdfRelatorioExecutivo(params: {
  db: FiscalDatabase;
  contratos: Contrato[];
  ncs: NaoConformidade[];
  tipo: 'CONSOLIDADO' | 'MEDICOES' | 'NCS' | 'AUDITORIA';
}): Promise<void> {
  const { db, contratos, ncs, tipo } = params;
  const doc = new jsPDF();

  const titles: Record<typeof tipo, string> = {
    CONSOLIDADO: 'RELATÓRIO EXECUTIVO DE CONTRATOS',
    MEDICOES: 'RELATÓRIO CONSOLIDADO DE MEDIÇÕES',
    NCS: 'RELATÓRIO DE NÃO CONFORMIDADES',
    AUDITORIA: 'RELATÓRIO DE AUDITORIA ADMINISTRATIVA',
  };

  const y = addHeader(
    doc,
    db.configuracoes,
    titles[tipo],
    `Emitido em ${new Date().toLocaleDateString('pt-BR')} · Fiscal Padrão: ${db.configuracoes.fiscalPadrao}`
  );

  if (tipo === 'CONSOLIDADO') {
    autoTable(doc, {
      startY: y + 3,
      theme: 'striped',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [0, 74, 143], textColor: [255, 255, 255] },
      head: [['Contrato', 'Empresa', 'Valor Atual', 'Executado', 'Saldo', '% Exec.']],
      body: contratos.map((c) => {
        const s = calcularSaldoContrato(c, db.aditivos, db.medicoes);
        return [
          c.numero,
          c.contratada,
          formatCurrencyBR(s.valorAtual),
          formatCurrencyBR(s.executado),
          formatCurrencyBR(s.saldo),
          `${s.percentual.toFixed(1)}%`,
        ];
      }),
    });
  } else if (tipo === 'MEDICOES') {
    const ctrIds = new Set(contratos.map((c) => c.id));
    const meds = db.medicoes.filter((m) => ctrIds.has(m.contratoId));
    autoTable(doc, {
      startY: y + 3,
      theme: 'striped',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [0, 74, 143], textColor: [255, 255, 255] },
      head: [['Boletim', 'Contrato', 'Competência', 'Nota Fiscal', 'Valor', 'Status']],
      body: meds.map((m) => {
        const ctr = db.contratos.find((c) => c.id === m.contratoId);
        return [
          `Nº ${m.numero}`,
          ctr?.numero ?? m.contratoId,
          m.competencia,
          m.notaFiscal?.numero ?? '—',
          formatCurrencyBR(m.valor),
          m.status,
        ];
      }),
    });
  } else if (tipo === 'NCS') {
    const score = calcularScoreContratada(ncs);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text(
      `Abertas: ${ncs.filter((n) => n.status === 'ABERTA').length} · Em Tratamento: ${ncs.filter((n) => n.status === 'EM_TRATAMENTO').length} · Encerradas: ${ncs.filter((n) => n.status === 'ENCERRADA').length} · Score Contratada: ${score}/100`,
      14,
      y + 3
    );
    autoTable(doc, {
      startY: y + 8,
      theme: 'striped',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [0, 74, 143], textColor: [255, 255, 255] },
      head: [['Código', 'Contrato', 'Título', 'Gravidade', 'Prazo', 'Status']],
      body: ncs.map((n) => {
        const ctr = db.contratos.find((c) => c.id === n.contratoId);
        return [
          n.codigo,
          ctr?.numero ?? n.contratoId,
          n.titulo,
          n.gravidade,
          formatDateBR(n.dataLimite),
          n.status,
        ];
      }),
    });
  } else {
    autoTable(doc, {
      startY: y + 3,
      theme: 'striped',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [0, 74, 143], textColor: [255, 255, 255] },
      head: [['Data', 'Usuário', 'Entidade', 'Ação', 'Detalhes']],
      body: db.auditoria.map((a) => [
        formatDateBR(a.data),
        a.usuario,
        a.entidade,
        a.acao,
        a.detalhes,
      ]),
    });
  }

  const lastY = getLastTableY(doc, y + 30);
  drawCamposAssinaturaFisica(
    doc,
    lastY,
    db.assinaturasRelatorios ?? [],
    [
      {
        nome: db.configuracoes.fiscalPadrao,
        cargo: 'Fiscal Responsável',
        registro: db.configuracoes.creaFiscal,
      },
      { nome: db.configuracoes.gestorPadrao, cargo: 'Gestor de Contratos' },
    ]
  );

  await saveAndDownloadPdf(
    doc,
    `relatorio-${tipo.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.pdf`
  );
}

export async function gerarPdfRelatorioFotografico(params: {
  titulo: string;
  subtitulo: string;
  config: ConfiguracoesSistema;
  resumoInfo: Array<[string, string]>;
  fotos: FotoPdfItem[];
  assinaturas?: AssinaturaEletronica[];
  fallbackSigners?: SignerField[];
  fileName: string;
}): Promise<void> {
  const {
    titulo,
    subtitulo,
    config,
    resumoInfo,
    fotos,
    assinaturas = [],
    fallbackSigners = [],
    fileName,
  } = params;

  const doc = new jsPDF();
  let y = addHeader(doc, config, titulo, subtitulo);

  autoTable(doc, {
    startY: y + 2,
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 2.5 },
    body: [
      ...resumoInfo,
      ['Total de Registros Fotográficos', `${fotos.length} imagem(ns) georreferenciada(s)`],
      ['Data de Emissão do Relatório', formatDateTimeBR(new Date().toISOString())],
    ],
  });

  y = getLastTableY(doc, y + 32);

  if (fotos.length === 0) {
    y += 10;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(71, 85, 105);
    doc.text('Nenhuma fotografia registrada para os critérios selecionados.', 14, y);
    y += 6;
  } else {
    y = await drawFotosBlock(doc, y, fotos, 'REGISTROS FOTOGRÁFICOS DETALHADOS');
  }

  drawCamposAssinaturaFisica(
    doc,
    y,
    assinaturas,
    fallbackSigners.length > 0
      ? fallbackSigners
      : [
          {
            nome: config.fiscalPadrao,
            cargo: 'Fiscal Responsável',
            registro: config.creaFiscal,
          },
          { nome: config.gestorPadrao, cargo: 'Gestor de Contratos' },
        ]
  );

  await saveAndDownloadPdf(doc, fileName);
}

export async function gerarPdfAvaliacaoDesempenho(params: {
  avaliacao: AvaliacaoDesempenho;
  medicao: Medicao;
  contrato: Contrato;
  aditivos: Aditivo[];
  config: ConfiguracoesSistema;
}): Promise<void> {
  const { avaliacao, medicao, contrato, aditivos, config } = params;
  const doc = new jsPDF();

  const navy: [number, number, number] = [27, 54, 93];
  const headerIce: [number, number, number] = [220, 230, 241];
  const borderDark: [number, number, number] = [30, 41, 59];

  const calc = calcularAvaliacaoDesempenho(avaliacao.itens, avaliacao.mediaAnterior);
  const numAvaliacaoStr = medicao.numero.toString().padStart(2, '0');
  const dataAvaliacaoStr = formatDateBR(medicao.dataFim);

  const aditivosContrato = aditivos
    .filter((a) => a.contratoId === contrato.id)
    .sort((a, b) => a.numero - b.numero);
  const ultimoAditivo = aditivosContrato[aditivosContrato.length - 1];
  const numeroAditivoStr = ultimoAditivo
    ? `${toRomanNumeral(ultimoAditivo.numero)} TERMO ADITIVO`
    : '—';
  const valorAditivos = aditivosContrato
    .filter((a) => a.tipo === 'VALOR')
    .reduce((acc, a) => acc + a.valor, 0);

  const marginX = 10;
  const totalW = 190;
  let y = 10;

  // 1. Top Header Banner (Logo/Org box + Title Banner + Nº & Data)
  const leftW = 34;
  const rightW = 44;
  const centerW = totalW - leftW - rightW;
  const bannerH = 20;

  doc.setDrawColor(...borderDark);
  doc.setLineWidth(0.3);

  // Left org badge box
  doc.setFillColor(255, 255, 255);
  doc.rect(marginX, y, leftW, bannerH, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...navy);
  const orgLines = doc.splitTextToSize(config.orgaoNome || 'FiscalObra', leftW - 4);
  doc.text(orgLines.slice(0, 3), marginX + leftW / 2, y + 8, { align: 'center' });

  // Center dark-navy banner
  doc.setFillColor(...navy);
  doc.rect(marginX + leftW, y, centerW, bannerH, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(255, 255, 255);
  doc.text('AVALIAÇÃO DE DESEMPENHO DE', marginX + leftW + centerW / 2, y + 8.5, {
    align: 'center',
  });
  doc.text('PRESTADORES DE SERVIÇOS', marginX + leftW + centerW / 2, y + 14.5, {
    align: 'center',
  });

  // Right Nº & Data box
  const numColW = 19;
  const dateColW = rightW - numColW;
  const rightX = marginX + leftW + centerW;
  doc.setFillColor(...headerIce);
  doc.rect(rightX, y, numColW, 6, 'FD');
  doc.rect(rightX + numColW, y, dateColW, 6, 'FD');
  doc.setFillColor(255, 255, 255);
  doc.rect(rightX, y + 6, numColW, bannerH - 6, 'FD');
  doc.rect(rightX + numColW, y + 6, dateColW, bannerH - 6, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...navy);
  doc.text('Nº:', rightX + numColW / 2, y + 4.2, { align: 'center' });
  doc.text('Data:', rightX + numColW + dateColW / 2, y + 4.2, { align: 'center' });

  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(numAvaliacaoStr, rightX + numColW / 2, y + 14.5, { align: 'center' });
  doc.setFontSize(8.5);
  doc.text(dataAvaliacaoStr, rightX + numColW + dateColW / 2, y + 14.5, { align: 'center' });

  y += bannerH + 2;

  // 2. Identification & Contract Metadata Grid
  const labelStyle = {
    fillColor: headerIce,
    textColor: navy,
    fontStyle: 'bold' as const,
    fontSize: 7.2,
    cellPadding: { top: 1.4, right: 1.8, bottom: 1.4, left: 1.8 },
  };
  const valStyle = {
    fillColor: [255, 255, 255] as [number, number, number],
    textColor: [15, 23, 42] as [number, number, number],
    fontStyle: 'bold' as const,
    fontSize: 7.5,
    cellPadding: { top: 1.4, right: 1.8, bottom: 1.4, left: 1.8 },
  };

  autoTable(doc, {
    startY: y,
    margin: { left: marginX, right: marginX },
    tableWidth: totalW,
    theme: 'grid',
    styles: {
      lineColor: borderDark,
      lineWidth: 0.25,
      valign: 'middle',
      overflow: 'linebreak',
    },
    columnStyles: {
      0: { cellWidth: 28 },
      1: { cellWidth: 26 },
      2: { cellWidth: 20 },
      3: { cellWidth: 24 },
      4: { cellWidth: 20 },
      5: { cellWidth: 24 },
      6: { cellWidth: 18 },
      7: { cellWidth: 30 },
    },
    body: [
      [
        { content: 'DIRETORIA:', styles: labelStyle },
        { content: avaliacao.diretoria || '—', styles: valStyle },
        { content: 'REGIONAL:', styles: labelStyle },
        { content: avaliacao.regional || '—', styles: valStyle },
        { content: 'GERÊNCIA:', styles: labelStyle },
        { content: avaliacao.gerencia || '—', styles: valStyle },
        { content: 'UNID.:', styles: labelStyle },
        { content: avaliacao.unidade || '—', styles: valStyle },
      ],
      [
        { content: 'Razão social:', styles: labelStyle },
        { content: contrato.contratada, colSpan: 4, styles: valStyle },
        { content: 'CNPJ:', styles: labelStyle },
        { content: contrato.cnpj, colSpan: 2, styles: { ...valStyle, halign: 'center' } },
      ],
      [
        { content: 'Endereço:', styles: labelStyle },
        { content: avaliacao.endereco || '—', colSpan: 4, styles: valStyle },
        { content: 'BAIRRO:', styles: labelStyle },
        { content: avaliacao.bairro || '—', colSpan: 2, styles: valStyle },
      ],
      [
        { content: 'Cidade:', styles: labelStyle },
        { content: avaliacao.cidade || contrato.municipio || '—', colSpan: 2, styles: valStyle },
        { content: 'CEP:', styles: labelStyle },
        { content: avaliacao.cep || '—', styles: { ...valStyle, halign: 'center' } },
        { content: 'Telefone:', styles: labelStyle },
        { content: avaliacao.telefone || '—', colSpan: 2, styles: { ...valStyle, halign: 'center' } },
      ],
      [
        { content: 'Nº Contrato / AES:', styles: labelStyle },
        { content: contrato.numero, colSpan: 2, styles: valStyle },
        { content: 'Valor R$:', styles: labelStyle },
        { content: formatNumberBR(contrato.valorInicial), colSpan: 2, styles: { ...valStyle, halign: 'right' } },
        { content: 'Início da obra:', styles: { ...labelStyle, halign: 'center' } },
        { content: 'Término da obra:', styles: { ...labelStyle, halign: 'center' } },
      ],
      [
        { content: 'Nº Aditivo:', styles: labelStyle },
        { content: numeroAditivoStr, colSpan: 2, styles: valStyle },
        { content: 'Valor R$:', styles: labelStyle },
        {
          content: aditivosContrato.length > 0 ? formatNumberBR(valorAditivos) : '0,00',
          colSpan: 2,
          styles: { ...valStyle, halign: 'right' },
        },
        { content: formatDateBR(contrato.dataInicio), styles: { ...valStyle, halign: 'center' } },
        { content: formatDateBR(contrato.dataFim), styles: { ...valStyle, halign: 'center' } },
      ],
      [
        { content: 'Nº Boletim Med.:', styles: labelStyle },
        { content: String(medicao.numero), colSpan: 2, styles: { ...valStyle, halign: 'center' } },
        { content: 'Valor R$:', styles: labelStyle },
        {
          content: formatNumberBR(medicao.valor),
          colSpan: 2,
          styles: { ...valStyle, halign: 'right' },
        },
        { content: 'Objeto do Contrato ou AES:', colSpan: 2, styles: labelStyle },
      ],
      [
        {
          content: contrato.objeto,
          colSpan: 8,
          styles: {
            ...valStyle,
            fontStyle: 'normal',
            fontSize: 7.5,
            cellPadding: { top: 2.2, right: 2.2, bottom: 2.5, left: 2.2 },
          },
        },
      ],
    ],
  });

  y = getLastTableY(doc, y + 50) + 2.5;

  // 3. Tópicos / Obra Evaluation Matrix Table
  autoTable(doc, {
    startY: y,
    margin: { left: marginX, right: marginX },
    tableWidth: totalW,
    theme: 'grid',
    styles: {
      lineColor: borderDark,
      lineWidth: 0.25,
      fontSize: 7.8,
      textColor: [15, 23, 42],
      valign: 'middle',
      cellPadding: { top: 1.8, right: 2, bottom: 1.8, left: 2 },
    },
    headStyles: {
      fillColor: navy,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { cellWidth: 72, halign: 'left' },
      1: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
      2: { cellWidth: 25, halign: 'center' },
      3: { cellWidth: 25, halign: 'center' },
      4: { cellWidth: 25, halign: 'center' },
      5: { cellWidth: 25, halign: 'right', fontStyle: 'bold' },
    },
    head: [
      [
        { content: 'TÓPICOS / OBRA', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
        { content: 'Peso', styles: { fontSize: 7.5 } },
        { content: 'BOM', styles: { fontSize: 8 } },
        { content: 'REGULAR', styles: { fontSize: 8 } },
        { content: 'RUIM', styles: { fontSize: 8 } },
        { content: 'Nota', styles: { fontSize: 8 } },
      ],
      [
        { content: String(calc.somaPesos), styles: { fontSize: 7.5 } },
        { content: '75', styles: { fontSize: 7.5 } },
        { content: '50', styles: { fontSize: 7.5 } },
        { content: '0', styles: { fontSize: 7.5 } },
        { content: '(B+R+Ru)×Peso', styles: { fontSize: 6.5 } },
      ],
    ],
    body: calc.itensCalculados.map((it) => {
      const bomTxt =
        it.bom !== 0 || it.conceitoSelecionado === 'BOM' ? formatNumberBR(it.bom, it.bom % 1 === 0 ? 0 : 2) : '';
      const regTxt =
        it.regular !== 0 || it.conceitoSelecionado === 'REGULAR'
          ? formatNumberBR(it.regular, it.regular % 1 === 0 ? 0 : 2)
          : '';
      const ruimTxt =
        it.ruim !== 0 || it.conceitoSelecionado === 'RUIM'
          ? formatNumberBR(it.ruim, it.ruim % 1 === 0 ? 0 : 2)
          : '';
      return [
        it.titulo,
        String(it.peso),
        bomTxt,
        regTxt,
        ruimTxt,
        formatNumberBR(it.notaFinal),
      ];
    }),
  });

  y = getLastTableY(doc, y + 48) + 2;

  // 4. Média Anterior (MA) | Nota Média no Período (NMA) | Média Atual Acumulada (MAA)
  autoTable(doc, {
    startY: y,
    margin: { left: marginX, right: marginX },
    tableWidth: totalW,
    theme: 'grid',
    styles: {
      lineColor: borderDark,
      lineWidth: 0.25,
      halign: 'center',
      valign: 'middle',
      cellPadding: { top: 1.6, right: 2, bottom: 1.6, left: 2 },
    },
    columnStyles: {
      0: { cellWidth: 63.34 },
      1: { cellWidth: 63.33 },
      2: { cellWidth: 63.33 },
    },
    body: [
      [
        { content: 'Média Anterior (MA)', styles: { ...labelStyle, halign: 'center' } },
        { content: 'Nota Média no Período (NMA)', styles: { ...labelStyle, halign: 'center' } },
        { content: 'Média Atual Acumulada (MAA)', styles: { ...labelStyle, halign: 'center' } },
      ],
      [
        {
          content: avaliacao.mediaAnterior !== null ? formatNumberBR(avaliacao.mediaAnterior) : '—',
          styles: { ...valStyle, halign: 'center', fontSize: 9.5 },
        },
        {
          content: formatNumberBR(calc.nma),
          styles: { ...valStyle, halign: 'center', fontSize: 9.5 },
        },
        {
          content: formatNumberBR(calc.maa),
          styles: { ...valStyle, halign: 'center', fontSize: 9.5 },
        },
      ],
    ],
  });

  y = getLastTableY(doc, y + 14) + 2;

  // 5. Compliance Question & Observations Box
  const complianceH = 9;
  doc.setDrawColor(...borderDark);
  doc.setFillColor(255, 255, 255);
  doc.rect(marginX, y, totalW, complianceH, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('Quanto ao contrato: Deixou de cumprir alguma cláusula do contrato?', marginX + 2.5, y + 5.8);

  // Sim* checkbox
  const simX = marginX + 124;
  doc.setFontSize(8);
  doc.text('Sim*', simX, y + 5.8);
  doc.rect(simX + 9, y + 2, 7, 5, 'D');
  if (avaliacao.descumpriuClausula) {
    doc.setFont('helvetica', 'bold');
    doc.text('X', simX + 12.5, y + 5.8, { align: 'center' });
  }

  // Não checkbox
  const naoX = marginX + 156;
  doc.text('Não', naoX, y + 5.8);
  doc.rect(naoX + 9, y + 2, 7, 5, 'D');
  if (!avaliacao.descumpriuClausula) {
    doc.setFont('helvetica', 'bold');
    doc.text('X', naoX + 12.5, y + 5.8, { align: 'center' });
  }

  y += complianceH;

  // OBSERVAÇÕES header + body
  doc.setFillColor(...headerIce);
  doc.rect(marginX, y, totalW, 5.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...navy);
  doc.text('OBSERVAÇÕES:', marginX + 2.5, y + 4);
  y += 5.5;

  const obsText = avaliacao.observacoes?.trim() || 'Sem observações adicionais registradas.';
  const obsLines = doc.splitTextToSize(obsText, totalW - 6);
  const obsBoxH = Math.max(24, obsLines.length * 4 + 10);

  if (y + obsBoxH + 46 > 286) {
    doc.addPage();
    y = 14;
  }

  doc.setFillColor(255, 255, 255);
  doc.rect(marginX, y, totalW, obsBoxH, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(obsLines, marginX + 2.5, y + 4.8);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6.8);
  doc.setTextColor(71, 85, 105);
  doc.text('* Informar no campo de observações.', marginX + 2.5, y + obsBoxH - 2);
  y += obsBoxH + 2;

  // 6. Physical Signatures Footer (4 columns matching template)
  const sigHeaderH = 6;
  const sigBodyH = 34;
  const colWidths = [52, 52, 52, 34];
  const avList = [
    avaliacao.avaliadores[0] ?? {
      papel: 'Fiscal avaliador 01',
      nome: contrato.fiscal,
      cargoRegistro: config.creaFiscal || 'Fiscal do Contrato',
      matricula: '',
      portaria: '',
    },
    avaliacao.avaliadores[1] ?? {
      papel: 'Fiscal avaliador 02',
      nome: '',
      cargoRegistro: '',
      matricula: '',
      portaria: '',
    },
    avaliacao.avaliadores[2] ?? {
      papel: 'Gestor avaliador 03',
      nome: contrato.gestor,
      cargoRegistro: 'Gestor do Contrato',
      matricula: '',
      portaria: '',
    },
  ];

  let curX = marginX;
  for (let i = 0; i < 4; i += 1) {
    const w = colWidths[i];
    doc.setFillColor(...headerIce);
    doc.rect(curX, y, w, sigHeaderH, 'FD');
    doc.setFillColor(255, 255, 255);
    doc.rect(curX, y + sigHeaderH, w, sigBodyH, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(...navy);
    const title = i < 3 ? `${avList[i].papel}:` : 'Data:';
    doc.text(title, curX + w / 2, y + 4.2, { align: 'center' });

    if (i < 3) {
      const av = avList[i];
      // Blank pen-signature line above name & description
      doc.setDrawColor(100, 116, 139);
      doc.line(curX + 4, y + sigHeaderH + 14, curX + w - 4, y + sigHeaderH + 14);

      doc.setFont('helvetica', 'bolditalic');
      doc.setFontSize(7.3);
      doc.setTextColor(15, 23, 42);
      if (av.nome.trim()) {
        const nomeWrapped = doc.splitTextToSize(av.nome, w - 4);
        doc.text(nomeWrapped[0] ?? av.nome, curX + w / 2, y + sigHeaderH + 18.5, {
          align: 'center',
        });
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(51, 65, 85);
      let lineY = y + sigHeaderH + 22.5;
      if (av.cargoRegistro.trim()) {
        const cr = doc.splitTextToSize(av.cargoRegistro, w - 4);
        doc.text(cr[0] ?? av.cargoRegistro, curX + w / 2, lineY, { align: 'center' });
        lineY += 3.3;
      }
      if (av.matricula.trim()) {
        doc.text(`Matrícula ${av.matricula}`, curX + w / 2, lineY, { align: 'center' });
        lineY += 3.3;
      }
      if (av.portaria.trim()) {
        const pt = doc.splitTextToSize(av.portaria, w - 4);
        doc.text(pt[0] ?? av.portaria, curX + w / 2, lineY, { align: 'center' });
      }
    } else {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text(dataAvaliacaoStr, curX + w / 2, y + sigHeaderH + 18, { align: 'center' });
    }

    curX += w;
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `FiscalObra Pro · Avaliação de Desempenho nº ${numAvaliacaoStr} · Boletim de Medição ${medicao.numero}`,
    marginX,
    291
  );

  await saveAndDownloadPdf(
    doc,
    `avaliacao-desempenho-bm-${numAvaliacaoStr}-${contrato.numero}.pdf`
  );
}
