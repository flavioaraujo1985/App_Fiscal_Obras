import {
  Check,
  Database,
  Download,
  FileSpreadsheet,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useState } from 'react';
import ImportPlanilhaModal from '../../components/ImportPlanilhaModal';
import {
  downloadModeloPlanilhaXlsx,
  exportPlanilhaBancoXlsx,
} from '../../services/spreadsheetImporter';
import { useFiscalStore } from '../../store/useFiscalStore';
import type { Contrato, ItemContrato } from '../../types';
import { formatCurrencyBR, formatDateBR, formatNumberBR } from '../../utils/engineering';

export default function PlanilhaBaseTab({ contrato }: { contrato: Contrato }) {
  const {
    db,
    addItemContrato,
    updateItemContrato,
    deleteItemContrato,
    importPlanilhaContrato,
    pushToast,
  } = useFiscalStore();

  const [busca, setBusca] = useState('');
  const [importOpen, setImportOpen] = useState(false);

  // Add item form
  const [itemCodigo, setItemCodigo] = useState('');
  const [itemDesc, setItemDesc] = useState('');
  const [itemUnid, setItemUnid] = useState('m²');
  const [itemQtd, setItemQtd] = useState('');
  const [itemPreco, setItemPreco] = useState('');

  // Inline edit state
  const [editId, setEditId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{
    codigo: string;
    descricao: string;
    unidade: string;
    quantidade: string;
    precoUnitario: string;
  }>({ codigo: '', descricao: '', unidade: '', quantidade: '', precoUnitario: '' });

  const itensContrato = db.itensContrato.filter((i) => i.contratoId === contrato.id);
  const medicoesValidas = db.medicoes.filter(
    (m) => m.contratoId === contrato.id && m.status !== 'REJEITADA'
  );

  // Compute live accumulated execution per item from all non-rejected measurements
  const rowsComCalculo = itensContrato.map((ic) => {
    const qtdExecutada = Number(
      medicoesValidas
        .flatMap((m) => m.itensMedidos)
        .filter((im) => im.itemContratoId === ic.id)
        .reduce((acc, im) => acc + im.quantidadeMedida, 0)
        .toFixed(2)
    );
    const saldoExecutar = Number(Math.max(0, ic.quantidade - qtdExecutada).toFixed(2));
    const valorExecutado = Number((qtdExecutada * ic.precoUnitario).toFixed(2));
    const saldoFinanceiro = Number(Math.max(0, ic.valorTotal - valorExecutado).toFixed(2));
    const percentual =
      ic.quantidade > 0 ? Math.min(100, (qtdExecutada / ic.quantidade) * 100) : 0;

    return {
      ic,
      qtdExecutada,
      saldoExecutar,
      valorExecutado,
      saldoFinanceiro,
      percentual,
    };
  });

  const rowsFiltradas = rowsComCalculo.filter(({ ic }) => {
    if (!busca.trim()) return true;
    const q = busca.toLowerCase();
    return (
      ic.codigo.toLowerCase().includes(q) ||
      ic.descricao.toLowerCase().includes(q) ||
      ic.unidade.toLowerCase().includes(q)
    );
  });

  const totalContratado = rowsComCalculo.reduce((acc, r) => acc + r.ic.valorTotal, 0);
  const totalExecutado = rowsComCalculo.reduce((acc, r) => acc + r.valorExecutado, 0);
  const totalSaldo = Math.max(0, totalContratado - totalExecutado);
  const percGeral = totalContratado > 0 ? (totalExecutado / totalContratado) * 100 : 0;

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemCodigo.trim() || !itemDesc.trim()) return;
    await addItemContrato({
      contratoId: contrato.id,
      codigo: itemCodigo.trim(),
      descricao: itemDesc.trim(),
      unidade: itemUnid.trim() || 'un',
      quantidade: Number(itemQtd.replace(',', '.')) || 0,
      precoUnitario: Number(itemPreco.replace(',', '.')) || 0,
    });
    setItemCodigo('');
    setItemDesc('');
    setItemQtd('');
    setItemPreco('');
  };

  const startEdit = (ic: ItemContrato) => {
    setEditId(ic.id);
    setEditDraft({
      codigo: ic.codigo,
      descricao: ic.descricao,
      unidade: ic.unidade,
      quantidade: String(ic.quantidade),
      precoUnitario: String(ic.precoUnitario),
    });
  };

  const saveEdit = async () => {
    if (!editId) return;
    await updateItemContrato(editId, {
      codigo: editDraft.codigo.trim(),
      descricao: editDraft.descricao.trim(),
      unidade: editDraft.unidade.trim() || 'un',
      quantidade: Number(editDraft.quantidade.replace(',', '.')) || 0,
      precoUnitario: Number(editDraft.precoUnitario.replace(',', '.')) || 0,
    });
    setEditId(null);
  };

  const handleExportarBanco = () => {
    exportPlanilhaBancoXlsx({
      contratoNumero: contrato.numero,
      rows: rowsComCalculo.map(({ ic, qtdExecutada, saldoExecutar, valorExecutado, saldoFinanceiro, percentual }) => ({
        codigo: ic.codigo,
        descricao: ic.descricao,
        unidade: ic.unidade,
        quantidadeContratada: ic.quantidade,
        precoUnitario: ic.precoUnitario,
        valorContratado: ic.valorTotal,
        quantidadeExecutada: qtdExecutada,
        saldoExecutar,
        valorExecutado,
        saldoFinanceiro,
        percentualExecutado: percentual,
      })),
    });
    pushToast('success', 'Planilha banco de dados exportada em .xlsx com saldos atualizados.');
  };

  return (
    <div className="space-y-6">
      {/* Database Header Summary */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-[#004A8F] shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Banco de Dados da Planilha Orçamentária ({itensContrato.length} itens)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {contrato.planilhaOrigem ? (
                  <>
                    Fonte ativa: <strong className="text-slate-700">{contrato.planilhaOrigem.nomeArquivo}</strong> ({contrato.planilhaOrigem.formato}) · Importada em {formatDateBR(contrato.planilhaOrigem.dataImportacao)}
                  </>
                ) : (
                  'Todas as medições e cálculos de saldo utilizam esta planilha como base oficial de preços e quantidades.'
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 no-print">
            <button
              type="button"
              onClick={downloadModeloPlanilhaXlsx}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Modelo (.xlsx)</span>
            </button>
            <button
              type="button"
              disabled={itensContrato.length === 0}
              onClick={handleExportarBanco}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#004A8F] bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 disabled:opacity-40"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar Banco (.xlsx)</span>
            </button>
            <button
              type="button"
              onClick={() => setImportOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#00897B] rounded-md hover:bg-[#007367]"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Importar Planilha (XLSX / PDF)</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3 border-t border-slate-100 text-sm">
          <div>
            <div className="text-xs text-slate-500">Valor Total da Planilha</div>
            <div className="font-mono font-bold text-slate-900 mt-0.5">
              {formatCurrencyBR(totalContratado)}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Acumulado Executado</div>
            <div className="font-mono font-bold text-emerald-700 mt-0.5">
              {formatCurrencyBR(totalExecutado)}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Saldo Financeiro a Executar</div>
            <div className="font-mono font-bold text-slate-900 mt-0.5">
              {formatCurrencyBR(totalSaldo)}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Execução da Planilha</div>
            <div className="font-mono font-bold text-[#004A8F] mt-0.5">
              {percGeral.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      {/* Search + Table */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar no banco da planilha por código, serviço ou unidade..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-[#004A8F]"
            />
          </div>
          <div className="text-xs text-slate-500 font-mono">
            Exibindo {rowsFiltradas.length} de {itensContrato.length} item(ns)
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-md">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="px-3 py-2.5">Código</th>
                <th className="px-3 py-2.5 min-w-[220px]">Descrição do Serviço</th>
                <th className="px-3 py-2.5">Unid</th>
                <th className="px-3 py-2.5 text-right">Qtd Contr.</th>
                <th className="px-3 py-2.5 text-right">Executado</th>
                <th className="px-3 py-2.5 text-right">Saldo</th>
                <th className="px-3 py-2.5 text-right">Preço Unit.</th>
                <th className="px-3 py-2.5 text-right">Total Contr.</th>
                <th className="px-3 py-2.5 text-right">% Exec.</th>
                <th className="px-3 py-2.5 text-center no-print">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rowsFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-sm text-slate-500">
                    {itensContrato.length === 0
                      ? 'Nenhum item na base. Importe sua planilha XLSX ou PDF para alimentar o sistema.'
                      : 'Nenhum item encontrado para o filtro informado.'}
                  </td>
                </tr>
              ) : (
                rowsFiltradas.map(({ ic, qtdExecutada, saldoExecutar, percentual }) => {
                  const isEditing = editId === ic.id;
                  return (
                    <tr key={ic.id} className="hover:bg-slate-50/70">
                      <td className="px-3 py-2 font-mono text-slate-700">
                        {isEditing ? (
                          <input
                            value={editDraft.codigo}
                            onChange={(e) =>
                              setEditDraft((d) => ({ ...d, codigo: e.target.value }))
                            }
                            className="w-24 px-2 py-1 font-mono border border-slate-300 rounded"
                          />
                        ) : (
                          ic.codigo
                        )}
                      </td>
                      <td className="px-3 py-2 text-slate-900">
                        {isEditing ? (
                          <input
                            value={editDraft.descricao}
                            onChange={(e) =>
                              setEditDraft((d) => ({ ...d, descricao: e.target.value }))
                            }
                            className="w-full min-w-[180px] px-2 py-1 border border-slate-300 rounded"
                          />
                        ) : (
                          ic.descricao
                        )}
                      </td>
                      <td className="px-3 py-2 font-mono text-slate-600">
                        {isEditing ? (
                          <input
                            value={editDraft.unidade}
                            onChange={(e) =>
                              setEditDraft((d) => ({ ...d, unidade: e.target.value }))
                            }
                            className="w-14 px-2 py-1 font-mono border border-slate-300 rounded"
                          />
                        ) : (
                          ic.unidade
                        )}
                      </td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums">
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.01"
                            value={editDraft.quantidade}
                            onChange={(e) =>
                              setEditDraft((d) => ({ ...d, quantidade: e.target.value }))
                            }
                            className="w-24 px-2 py-1 text-right font-mono border border-slate-300 rounded"
                          />
                        ) : (
                          formatNumberBR(ic.quantidade)
                        )}
                      </td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums text-emerald-700 font-medium">
                        {formatNumberBR(qtdExecutada)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-700">
                        {formatNumberBR(saldoExecutar)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums">
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.01"
                            value={editDraft.precoUnitario}
                            onChange={(e) =>
                              setEditDraft((d) => ({ ...d, precoUnitario: e.target.value }))
                            }
                            className="w-24 px-2 py-1 text-right font-mono border border-slate-300 rounded"
                          />
                        ) : (
                          formatCurrencyBR(ic.precoUnitario)
                        )}
                      </td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums font-semibold text-slate-900">
                        {formatCurrencyBR(ic.valorTotal)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums font-semibold text-[#004A8F]">
                        {percentual.toFixed(1)}%
                      </td>
                      <td className="px-3 py-2 text-center no-print">
                        <div className="inline-flex items-center gap-1">
                          {isEditing ? (
                            <>
                              <button
                                type="button"
                                onClick={() => void saveEdit()}
                                className="p-1 text-emerald-700 hover:bg-emerald-50 rounded"
                                aria-label="Salvar item"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditId(null)}
                                className="p-1 text-slate-400 hover:text-slate-700 rounded"
                                aria-label="Cancelar edição"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => startEdit(ic)}
                                className="p-1 text-slate-400 hover:text-[#004A8F] rounded"
                                aria-label="Editar item"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => void deleteItemContrato(ic.id)}
                                className="p-1 text-slate-400 hover:text-red-600 rounded"
                                aria-label="Excluir item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Quick manual item add */}
        <form onSubmit={handleAddItem} className="grid grid-cols-1 sm:grid-cols-6 gap-2.5 pt-2 no-print">
          <input
            required
            value={itemCodigo}
            onChange={(e) => setItemCodigo(e.target.value)}
            placeholder="Código (01.05.001)"
            className="px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-md"
          />
          <input
            required
            value={itemDesc}
            onChange={(e) => setItemDesc(e.target.value)}
            placeholder="Descrição do serviço"
            className="sm:col-span-2 px-3 py-1.5 text-xs border border-slate-300 rounded-md"
          />
          <input
            required
            value={itemUnid}
            onChange={(e) => setItemUnid(e.target.value)}
            placeholder="Unid"
            className="px-3 py-1.5 text-xs border border-slate-300 rounded-md"
          />
          <div className="flex gap-2">
            <input
              required
              type="number"
              step="0.01"
              value={itemQtd}
              onChange={(e) => setItemQtd(e.target.value)}
              placeholder="Qtd"
              className="w-1/2 px-2 py-1.5 text-xs font-mono border border-slate-300 rounded-md"
            />
            <input
              required
              type="number"
              step="0.01"
              value={itemPreco}
              onChange={(e) => setItemPreco(e.target.value)}
              placeholder="Unit."
              className="w-1/2 px-2 py-1.5 text-xs font-mono border border-slate-300 rounded-md"
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-[#004A8F] rounded-md hover:bg-[#003970]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Incluir Item</span>
          </button>
        </form>
      </div>

      <ImportPlanilhaModal
        open={importOpen}
        titulo={`Importar Planilha Base — Contrato ${contrato.numero}`}
        subtitulo="A planilha importada será gravada como banco de dados oficial deste contrato para todas as medições e cálculos de saldo."
        mostrarColunaExecutada={false}
        onClose={() => setImportOpen(false)}
        onConfirm={async (payload) => {
          await importPlanilhaContrato({
            contratoId: contrato.id,
            ...payload,
          });
        }}
      />
    </div>
  );
}
