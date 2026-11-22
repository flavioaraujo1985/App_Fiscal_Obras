import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import * as XLSX from 'xlsx';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export interface ImportedPlanilhaItem {
  id: string;
  codigo: string;
  descricao: string;
  unidade: string;
  quantidadeContratada: number;
  precoUnitario: number;
  quantidadeMedida: number;
  valorTotal: number;
}

export interface ParsedPlanilhaResult {
  fileType: 'XLSX' | 'PDF';
  fileName: string;
  sheetNames?: string[];
  selectedSheet?: string;
  items: ImportedPlanilhaItem[];
  warnings: string[];
}

const KNOWN_UNITS = new Set([
  'm',
  'ml',
  'm²',
  'm2',
  'm³',
  'm3',
  'un',
  'und',
  'unid',
  'unidade',
  'pç',
  'pc',
  'vb',
  'verba',
  'kg',
  't',
  'ton',
  'l',
  'lt',
  'h',
  'hr',
  'hm',
  'hp',
  'dia',
  'mes',
  'mês',
  'cj',
  'conj',
  'gl',
  'km',
  'ha',
  'sc',
  'saco',
  'ch',
  'par',
  'jg',
  'cx',
  'pt',
  'ponto',
  'kmx',
  'm2xmes',
  'm3xkm',
  'txkm',
]);

function normalizeText(value: unknown): string {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeHeader(value: unknown): string {
  return normalizeText(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function parseFlexibleNumber(value: unknown): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }
  const raw = normalizeText(value)
    .replace(/[R$\s%]/gi, '')
    .replace(/[^\d.,-]/g, '');
  if (!raw || raw === '-') return 0;

  const lastComma = raw.lastIndexOf(',');
  const lastDot = raw.lastIndexOf('.');

  let clean = raw;
  if (lastComma !== -1 && lastDot !== -1) {
    if (lastComma > lastDot) {
      // Brazilian format: 1.234,56
      clean = raw.replace(/\./g, '').replace(',', '.');
    } else {
      // International format: 1,234.56
      clean = raw.replace(/,/g, '');
    }
  } else if (lastComma !== -1) {
    const commaCount = (raw.match(/,/g) ?? []).length;
    clean = commaCount > 1 ? raw.replace(/,/g, '') : raw.replace(',', '.');
  } else if (lastDot !== -1) {
    const dotCount = (raw.match(/\./g) ?? []).length;
    if (dotCount > 1) {
      clean = raw.replace(/\./g, '');
    }
  }

  const parsed = Number(clean);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isLikelySummaryRow(codigo: string, descricao: string): boolean {
  const joined = normalizeHeader(`${codigo} ${descricao}`);
  if (!joined) return true;
  const blockedPrefixes = [
    'total geral',
    'subtotal',
    'sub-total',
    'total da planilha',
    'total sem bdi',
    'total com bdi',
    'bdi',
    'resumo',
    'encargos sociais',
  ];
  return blockedPrefixes.some((p) => joined === p || joined.startsWith(`${p} `) || joined.startsWith(`${p}:`));
}

function makeItem(params: {
  idx: number;
  codigo: string;
  descricao: string;
  unidade: string;
  quantidadeContratada: number;
  precoUnitario: number;
  quantidadeMedida?: number;
  valorTotal?: number;
}): ImportedPlanilhaItem {
  let qtd = Math.max(0, Number(params.quantidadeContratada.toFixed(4)));
  let preco = Math.max(0, Number(params.precoUnitario.toFixed(4)));
  const totalInformado = Math.max(0, Number((params.valorTotal ?? 0).toFixed(2)));

  if (preco === 0 && qtd > 0 && totalInformado > 0) {
    preco = Number((totalInformado / qtd).toFixed(4));
  } else if (qtd === 0 && preco > 0 && totalInformado > 0) {
    qtd = Number((totalInformado / preco).toFixed(4));
  }

  const qtdMedida = Math.max(0, Number((params.quantidadeMedida ?? 0).toFixed(4)));
  const valorTotal =
    qtd > 0 && preco > 0 ? Number((qtd * preco).toFixed(2)) : totalInformado;

  return {
    id: `imp-${Date.now()}-${params.idx}-${Math.random().toString(36).slice(2, 6)}`,
    codigo: params.codigo || String(params.idx + 1).padStart(2, '0'),
    descricao: params.descricao,
    unidade: params.unidade || 'un',
    quantidadeContratada: Number(qtd.toFixed(2)),
    precoUnitario: Number(preco.toFixed(2)),
    quantidadeMedida: Number(qtdMedida.toFixed(2)),
    valorTotal,
  };
}

interface ColumnMapping {
  headerRowIdx: number;
  codigoCol: number;
  descricaoCol: number;
  unidadeCol: number;
  qtdCol: number;
  precoUnitCol: number;
  valorTotalCol: number;
  qtdMedidaCol: number;
}

function detectXlsxColumns(rows: unknown[][]): ColumnMapping | null {
  const limit = Math.min(rows.length, 30);
  for (let r = 0; r < limit; r += 1) {
    const row = rows[r] ?? [];
    const headers = row.map(normalizeHeader);

    const findCol = (patterns: RegExp[]) =>
      headers.findIndex((h) => h.length > 0 && patterns.some((p) => p.test(h)));

    const codigoCol = findCol([/^(cod|codigo|item|ref|sinapi|sicro)/, /\bcodigo\b/, /\bitem\b/]);
    const descricaoCol = findCol([
      /^(desc|descricao|servico|especificacao|discriminacao|objeto)/,
      /\bdescricao\b/,
      /\bservico\b/,
    ]);
    const unidadeCol = findCol([/^(un|und|unid|unidade|u\.m\.)/, /\bunidade\b/]);
    const qtdMedidaCol = findCol([
      /(executad|medid|realizad|acumulad.*atual|no periodo|medicao atual|qtd\.?\s*exec|qtd\.?\s*med)/,
    ]);
    const qtdCol = headers.findIndex(
      (h, idx) =>
        idx !== qtdMedidaCol &&
        h.length > 0 &&
        (/(qtd|qtde|quant|quantidade|orcada|contratada|prevista)/.test(h) || h === 'q')
    );
    const precoUnitCol = findCol([
      /(unit|unitario|p\.?\s*unit|v\.?\s*unit|preco\s*unit|valor\s*unit|custo\s*unit)/,
    ]);
    const valorTotalCol = headers.findIndex(
      (h, idx) =>
        idx !== precoUnitCol &&
        h.length > 0 &&
        (/(total|parcial|valor\s*contr|preco\s*total|valor\s*total)/.test(h))
    );

    const score =
      (descricaoCol >= 0 ? 2 : 0) +
      (qtdCol >= 0 ? 1 : 0) +
      (precoUnitCol >= 0 ? 1 : 0) +
      (unidadeCol >= 0 ? 1 : 0) +
      (codigoCol >= 0 ? 1 : 0);

    if (score >= 3 && descricaoCol >= 0) {
      return {
        headerRowIdx: r,
        codigoCol,
        descricaoCol,
        unidadeCol,
        qtdCol,
        precoUnitCol,
        valorTotalCol,
        qtdMedidaCol,
      };
    }
  }
  return null;
}

function isUnitToken(token: string): boolean {
  const clean = normalizeHeader(token).replace(/[.:;()]/g, '');
  return KNOWN_UNITS.has(clean) || KNOWN_UNITS.has(token.trim().toLowerCase());
}

function extractRowHeuristic(cells: string[], idx: number): ImportedPlanilhaItem | null {
  const cleanCells = cells.map(normalizeText).filter(Boolean);
  if (cleanCells.length < 3) return null;

  // Find unit index
  const unitIdx = cleanCells.findIndex((c) => c.length <= 8 && isUnitToken(c));
  const numericIndices: number[] = [];
  cleanCells.forEach((c, i) => {
    if (i === unitIdx) return;
    if (/^[R$\s]*-?[\d.,]+%?$/.test(c) && /\d/.test(c)) {
      numericIndices.push(i);
    }
  });

  if (unitIdx === -1 && numericIndices.length < 2) return null;

  const firstTextIdx = cleanCells.findIndex((c, i) => i !== unitIdx && !numericIndices.includes(i));
  if (firstTextIdx === -1) return null;

  let codigo = '';
  let descParts: string[] = [];

  const textIndicesBeforeNumbers = cleanCells
    .map((c, i) => ({ c, i }))
    .filter(({ i }) => i !== unitIdx && !numericIndices.includes(i) && (unitIdx === -1 || i < unitIdx));

  if (textIndicesBeforeNumbers.length >= 2) {
    codigo = textIndicesBeforeNumbers[0].c;
    descParts = textIndicesBeforeNumbers.slice(1).map((x) => x.c);
  } else if (textIndicesBeforeNumbers.length === 1) {
    const line = textIndicesBeforeNumbers[0].c;
    const m = line.match(/^([A-Za-z0-9./-]{1,20})\s+(.{3,})$/);
    if (m) {
      codigo = m[1];
      descParts = [m[2]];
    } else {
      descParts = [line];
    }
  }

  const descricao = descParts.join(' ').trim();
  if (!descricao || descricao.length < 3 || isLikelySummaryRow(codigo, descricao)) return null;

  const tailNumbers = numericIndices
    .filter((i) => (unitIdx >= 0 ? i > unitIdx : i > firstTextIdx))
    .map((i) => parseFlexibleNumber(cleanCells[i]));

  if (tailNumbers.length === 0) return null;

  const unidade = unitIdx >= 0 ? cleanCells[unitIdx] : 'un';
  let qtd = 0;
  let preco = 0;
  let total = 0;
  let qtdMedida = 0;

  if (tailNumbers.length === 1) {
    qtd = tailNumbers[0];
  } else if (tailNumbers.length === 2) {
    qtd = tailNumbers[0];
    preco = tailNumbers[1];
  } else if (tailNumbers.length === 3) {
    qtd = tailNumbers[0];
    preco = tailNumbers[1];
    total = tailNumbers[2];
  } else {
    // 4+ numbers: check if qtd*preco ~= total in positions [0,1,2] vs [0,2,3]
    const n0 = tailNumbers[0];
    const n1 = tailNumbers[1];
    const n2 = tailNumbers[2];
    const n3 = tailNumbers[3];
    if (Math.abs(n0 * n1 - n2) <= Math.max(1, n2 * 0.05)) {
      qtd = n0;
      preco = n1;
      total = n2;
      qtdMedida = n3;
    } else if (Math.abs(n0 * n2 - n3) <= Math.max(1, n3 * 0.05)) {
      qtd = n0;
      qtdMedida = n1;
      preco = n2;
      total = n3;
    } else {
      qtd = n0;
      preco = n1;
      total = n2;
      qtdMedida = n3;
    }
  }

  if (qtd === 0 && preco === 0 && total === 0) return null;

  return makeItem({
    idx,
    codigo,
    descricao,
    unidade,
    quantidadeContratada: qtd,
    precoUnitario: preco,
    quantidadeMedida: qtdMedida,
    valorTotal: total,
  });
}

export function parseXlsxFromArrayBuffer(
  buffer: ArrayBuffer,
  fileName: string,
  requestedSheet?: string
): ParsedPlanilhaResult {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetNames = workbook.SheetNames;
  const warnings: string[] = [];

  if (sheetNames.length === 0) {
    return {
      fileType: 'XLSX',
      fileName,
      sheetNames: [],
      items: [],
      warnings: ['O arquivo não possui abas válidas.'],
    };
  }

  const extractFromSheet = (sheetName: string): ImportedPlanilhaItem[] => {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) return [];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: '',
      raw: true,
    });

    const mapping = detectXlsxColumns(rows);
    const items: ImportedPlanilhaItem[] = [];

    if (mapping) {
      for (let r = mapping.headerRowIdx + 1; r < rows.length; r += 1) {
        const row = rows[r] ?? [];
        const codigo = mapping.codigoCol >= 0 ? normalizeText(row[mapping.codigoCol]) : '';
        const descricao =
          mapping.descricaoCol >= 0 ? normalizeText(row[mapping.descricaoCol]) : '';
        const unidade =
          mapping.unidadeCol >= 0 ? normalizeText(row[mapping.unidadeCol]) : 'un';
        const qtd = mapping.qtdCol >= 0 ? parseFlexibleNumber(row[mapping.qtdCol]) : 0;
        const preco =
          mapping.precoUnitCol >= 0 ? parseFlexibleNumber(row[mapping.precoUnitCol]) : 0;
        const total =
          mapping.valorTotalCol >= 0 ? parseFlexibleNumber(row[mapping.valorTotalCol]) : 0;
        const qtdMedida =
          mapping.qtdMedidaCol >= 0 ? parseFlexibleNumber(row[mapping.qtdMedidaCol]) : 0;

        if (!descricao || isLikelySummaryRow(codigo, descricao)) continue;
        if (qtd === 0 && preco === 0 && total === 0 && qtdMedida === 0) continue;

        items.push(
          makeItem({
            idx: items.length,
            codigo,
            descricao,
            unidade: unidade || 'un',
            quantidadeContratada: qtd,
            precoUnitario: preco,
            quantidadeMedida: qtdMedida,
            valorTotal: total,
          })
        );
      }
      return items;
    }

    // Fallback heuristic row scanning
    rows.forEach((row) => {
      const cells = (row ?? []).map((c) => normalizeText(c));
      const parsed = extractRowHeuristic(cells, items.length);
      if (parsed) items.push(parsed);
    });
    return items;
  };

  let chosenSheet = requestedSheet && sheetNames.includes(requestedSheet) ? requestedSheet : sheetNames[0];
  let bestItems = extractFromSheet(chosenSheet);

  if (!requestedSheet && sheetNames.length > 1) {
    for (const name of sheetNames.slice(1)) {
      const candidate = extractFromSheet(name);
      if (candidate.length > bestItems.length) {
        chosenSheet = name;
        bestItems = candidate;
      }
    }
  }

  if (bestItems.length === 0) {
    warnings.push(
      'Nenhum item com quantidade e preço foi identificado automaticamente nesta aba. Verifique se a planilha contém colunas de Descrição, Unidade, Quantidade e Preço Unitário.'
    );
  }

  return {
    fileType: 'XLSX',
    fileName,
    sheetNames,
    selectedSheet: chosenSheet,
    items: bestItems,
    warnings,
  };
}

interface PdfToken {
  str: string;
  x: number;
  y: number;
}

function parsePdfLineTokens(tokens: PdfToken[]): string[] {
  if (tokens.length === 0) return [];
  const sorted = [...tokens].sort((a, b) => a.x - b.x);
  const cells: string[] = [];
  let current = sorted[0].str;
  let lastX = sorted[0].x;

  for (let i = 1; i < sorted.length; i += 1) {
    const t = sorted[i];
    // Large horizontal gap separates table columns; small gap joins words inside the same cell
    const gap = t.x - lastX;
    if (gap > 14 && current.trim().length > 0) {
      cells.push(current.trim());
      current = t.str;
    } else {
      current = `${current} ${t.str}`.replace(/\s+/g, ' ');
    }
    lastX = t.x + t.str.length * 3.8;
  }
  if (current.trim()) cells.push(current.trim());
  return cells;
}

function extractNumbersFromLineEnd(line: string): {
  prefix: string;
  unit: string;
  numbers: number[];
} | null {
  const clean = normalizeText(line);
  // Look for pattern ending in numbers: e.g. "01.02.001 Alvenaria ... m² 120,00 45,50 5.460,00"
  const tokens = clean.split(' ');
  if (tokens.length < 4) return null;

  const numbers: number[] = [];
  let i = tokens.length - 1;
  while (i >= 0) {
    const t = tokens[i];
    if (/^(R\$)$/i.test(t)) {
      i -= 1;
      continue;
    }
    if (/^[R$\s]*-?[\d.,]+%?$/.test(t) && /\d/.test(t)) {
      numbers.unshift(parseFlexibleNumber(t));
      i -= 1;
    } else {
      break;
    }
  }

  if (numbers.length < 2) return null;

  let unit = 'un';
  if (i >= 0 && isUnitToken(tokens[i])) {
    unit = tokens[i];
    i -= 1;
  } else {
    // Also check if unit is adjacent inside remaining tokens
    const foundUnitIdx = tokens.slice(0, i + 1).findLastIndex((t) => isUnitToken(t));
    if (foundUnitIdx <= 0) return null;
    unit = tokens[foundUnitIdx];
    const prefix = tokens.slice(0, foundUnitIdx).join(' ');
    return { prefix, unit, numbers };
  }

  const prefix = tokens.slice(0, i + 1).join(' ');
  return { prefix, unit, numbers };
}

export async function parsePdfFromArrayBuffer(
  buffer: ArrayBuffer,
  fileName: string
): Promise<ParsedPlanilhaResult> {
  const warnings: string[] = [];
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
  const pdf = await loadingTask.promise;

  const allRowCells: string[][] = [];
  let totalTextTokens = 0;

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const rawTokens: PdfToken[] = [];

    for (const item of content.items) {
      if ('str' in item && item.str.trim()) {
        const transform = item.transform as number[];
        rawTokens.push({
          str: item.str.trim(),
          x: transform[4] ?? 0,
          y: transform[5] ?? 0,
        });
      }
    }
    totalTextTokens += rawTokens.length;

    // Group tokens by Y coordinate (top to bottom)
    rawTokens.sort((a, b) => b.y - a.y || a.x - b.x);
    const rows: PdfToken[][] = [];
    for (const tk of rawTokens) {
      const lastRow = rows[rows.length - 1];
      if (lastRow && Math.abs(lastRow[0].y - tk.y) <= 4) {
        lastRow.push(tk);
      } else {
        rows.push([tk]);
      }
    }

    for (const row of rows) {
      const cells = parsePdfLineTokens(row);
      if (cells.length > 0) allRowCells.push(cells);
    }
  }

  if (totalTextTokens === 0) {
    return {
      fileType: 'PDF',
      fileName,
      items: [],
      warnings: [
        'Este PDF não contém texto selecionável (parece ser imagem digitalizada). Exporte a planilha em .XLSX ou PDF gerado diretamente do Excel/sistema orçamentário.',
      ],
    };
  }

  const items: ImportedPlanilhaItem[] = [];
  let pendingDescBuffer: string[] = [];

  for (const cells of allRowCells) {
    const heuristic = extractRowHeuristic(cells, items.length);
    if (heuristic) {
      if (pendingDescBuffer.length > 0 && heuristic.descricao.length < 25) {
        heuristic.descricao = `${pendingDescBuffer.join(' ')} ${heuristic.descricao}`.trim();
      }
      pendingDescBuffer = [];
      items.push(heuristic);
      continue;
    }

    const joined = cells.join(' ');
    const lineMatch = extractNumbersFromLineEnd(joined);
    if (lineMatch && lineMatch.prefix.length >= 3) {
      const m = lineMatch.prefix.match(/^([A-Za-z0-9./-]{1,20})\s+(.+)$/);
      const codigo = m ? m[1] : String(items.length + 1).padStart(2, '0');
      const desc = m ? m[2] : lineMatch.prefix;
      if (!isLikelySummaryRow(codigo, desc)) {
        const nums = lineMatch.numbers;
        const qtd = nums[0] ?? 0;
        const preco = nums[1] ?? 0;
        const total = nums[2] ?? 0;
        const qtdMedida = nums.length >= 4 ? nums[3] : 0;
        items.push(
          makeItem({
            idx: items.length,
            codigo,
            descricao: pendingDescBuffer.length > 0 ? `${pendingDescBuffer.join(' ')} ${desc}`.trim() : desc,
            unidade: lineMatch.unit,
            quantidadeContratada: qtd,
            precoUnitario: preco,
            quantidadeMedida: qtdMedida,
            valorTotal: total,
          })
        );
        pendingDescBuffer = [];
        continue;
      }
    }

    // Ignore obvious headers/footers, keep short continuation text lines if needed
    const norm = normalizeHeader(joined);
    if (
      joined.length > 4 &&
      joined.length < 110 &&
      !/^(pagina|contrato|prefeitura|secretaria|cnpj|objeto|codigo|item|descricao|planilha|boletim|fiscal)/.test(
        norm
      ) &&
      !/^[\d.,\sR$-]+$/.test(joined)
    ) {
      pendingDescBuffer = [...pendingDescBuffer.slice(-1), joined];
    } else {
      pendingDescBuffer = [];
    }
  }

  if (items.length === 0) {
    warnings.push(
      'Não foi possível identificar linhas de planilha tabular neste PDF. Você pode usar um arquivo .XLSX ou inserir os itens manualmente.'
    );
  }

  return {
    fileType: 'PDF',
    fileName,
    items,
    warnings,
  };
}

export async function parsePlanilhaFile(file: File): Promise<ParsedPlanilhaResult> {
  const name = file.name.toLowerCase();
  const buffer = await file.arrayBuffer();

  if (name.endsWith('.pdf') || file.type === 'application/pdf') {
    return await parsePdfFromArrayBuffer(buffer, file.name);
  }

  if (
    name.endsWith('.xlsx') ||
    name.endsWith('.xls') ||
    name.endsWith('.csv') ||
    name.endsWith('.ods')
  ) {
    return parseXlsxFromArrayBuffer(buffer, file.name);
  }

  throw new Error('Formato não suportado. Selecione um arquivo .xlsx, .xls, .csv ou .pdf.');
}

export function downloadModeloPlanilhaXlsx(): void {
  const rows = [
    [
      'Código',
      'Descrição',
      'Unidade',
      'Qtd Contratada',
      'Preço Unitário',
      'Qtd Executada',
      'Valor Total Contratado',
    ],
    ['01.01.001', 'Escavação mecanizada de vala em solo de 1ª categoria', 'm³', 250, 42.5, 0, 10625],
    ['01.02.004', 'Concreto estrutural fck 30 MPa bombeado', 'm³', 120, 580.0, 0, 69600],
    ['01.03.008', 'Armação de aço CA-50 diâmetro 10,0 mm', 'kg', 3400, 14.2, 0, 48280],
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    { wch: 14 },
    { wch: 52 },
    { wch: 10 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 22 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Planilha');
  XLSX.writeFile(wb, 'modelo-planilha-medicao-fiscalobra.xlsx');
}

export interface BancoPlanilhaExportRow {
  codigo: string;
  descricao: string;
  unidade: string;
  quantidadeContratada: number;
  precoUnitario: number;
  valorContratado: number;
  quantidadeExecutada: number;
  saldoExecutar: number;
  valorExecutado: number;
  saldoFinanceiro: number;
  percentualExecutado: number;
}

export function exportPlanilhaBancoXlsx(params: {
  contratoNumero: string;
  rows: BancoPlanilhaExportRow[];
}): void {
  const header = [
    'Código',
    'Descrição',
    'Unidade',
    'Qtd Contratada',
    'Preço Unitário (R$)',
    'Valor Contratado (R$)',
    'Qtd Acumulada Executada',
    'Saldo a Executar',
    'Valor Executado (R$)',
    'Saldo Financeiro (R$)',
    '% Executado',
  ];

  const dataRows = params.rows.map((r) => [
    r.codigo,
    r.descricao,
    r.unidade,
    r.quantidadeContratada,
    r.precoUnitario,
    r.valorContratado,
    r.quantidadeExecutada,
    r.saldoExecutar,
    r.valorExecutado,
    r.saldoFinanceiro,
    Number(r.percentualExecutado.toFixed(2)),
  ]);

  const totalContratado = params.rows.reduce((acc, r) => acc + r.valorContratado, 0);
  const totalExecutado = params.rows.reduce((acc, r) => acc + r.valorExecutado, 0);
  const totalSaldo = params.rows.reduce((acc, r) => acc + r.saldoFinanceiro, 0);

  const ws = XLSX.utils.aoa_to_sheet([
    header,
    ...dataRows,
    [
      'TOTAL',
      '',
      '',
      '',
      '',
      Number(totalContratado.toFixed(2)),
      '',
      '',
      Number(totalExecutado.toFixed(2)),
      Number(totalSaldo.toFixed(2)),
      totalContratado > 0 ? Number(((totalExecutado / totalContratado) * 100).toFixed(2)) : 0,
    ],
  ]);

  ws['!cols'] = [
    { wch: 14 },
    { wch: 48 },
    { wch: 10 },
    { wch: 15 },
    { wch: 16 },
    { wch: 18 },
    { wch: 20 },
    { wch: 16 },
    { wch: 18 },
    { wch: 18 },
    { wch: 12 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Banco_Planilha');
  const safeNum = params.contratoNumero.replace(/[^a-zA-Z0-9._-]/g, '_');
  XLSX.writeFile(wb, `planilha-banco-contrato-${safeNum}.xlsx`);
}
