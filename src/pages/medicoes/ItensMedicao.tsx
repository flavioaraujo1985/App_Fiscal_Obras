import { AlertCircle, Database, FileSpreadsheet, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import ImportPlanilhaModal from '../../components/ImportPlanilhaModal';
import { medicaoService } from '../../services/medicao.service';
import { useFiscalStore } from '../../store/useFiscalStore';
import type { Contrato, Medicao } from '../../types';
import { formatCurrencyBR, formatNumberBR, percentualExecutado } from '../../utils/engineering';

export default function ItensMedicao({
  medicao,
  contrato,
}: {
  medicao: Medicao;
  contrato: Contrato;
}) {
  const {
    db,
    updateMedicao,
    addItemToMedicao,
    syncContratoItensToMedicao,
    importPlanilhaMedicao,
    pushToast,
  } = useFiscalStore();
  const [erroLinha, setErroLinha] = useState<string | null>(null);
  const [draftQtds, setDraftQtds] = useState<Record<string, string>>({});
  const [importOpen, setImportOpen] = useState(false);
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const itensContratoDoContrato = db.itensContrato.filter((ic) => ic.contratoId === contrato.id);

  // Default to spreadsheet database mode whenever contract has spreadsheet items
  const [modoInsercao, setModoInsercao] = useState<'NOVO' | 'PLANILHA'>(() =>
    itensContratoDoContrato.length > 0 ? 'PLANILHA' : 'NOVO'
  );
  const [buscaBanco, setBuscaBanco] = useState('');
  const [buscaTabela, setBuscaTabela] = useState('');
  const [apenasComQtd, setApenasComQtd] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [qtdSelecionado, setQtdSelecionado] = useState('1');
  const [codigo, setCodigo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [unidade, setUnidade] = useState('m²');
  const [qtdContratada, setQtdContratada] = useState('100');
  const [precoUnitario, setPrecoUnitario] = useState('150');
  const [qtdMedidaNovo, setQtdMedidaNovo] = useState('25');

  const editavel = medicao.status === 'RASCUNHO' || medicao.status === 'EM_ANALISE';

  useEffect(() => {
    const map: Record<string, string> = {};
    medicao.itensMedidos.forEach((i) => {
      map[i.id] = String(i.quantidadeMedida);
    });
    setDraftQtds(map);
  }, [medicao.id, medicao.itensMedidos]);

  useEffect(() => {
    const timers = debounceTimers.current;
    return () => {
      Object.values(timers).forEach((t) => clearTimeout(t));
    };
  }, []);

  const itensContratoDisponiveis = itensContratoDoContrato.filter(
    (ic) => !medicao.itensMedidos.some((im) => im.itemContratoId === ic.id)
  );

  const itensDisponiveisFiltrados = itensContratoDisponiveis.filter((ic) => {
    if (!buscaBanco.trim()) return true;
    const q = buscaBanco.toLowerCase();
    return (
      ic.codigo.toLowerCase().includes(q) ||
      ic.descricao.toLowerCase().includes(q) ||
      ic.unidade.toLowerCase().includes(q)
    );
  });

  const itemSelecionadoObj =
    itensDisponiveisFiltrados.find((ic) => ic.id === selectedItemId) ??
    itensDisponiveisFiltrados[0];

  const itensTabelaFiltrados = medicao.itensMedidos.filter((item) => {
    if (apenasComQtd) {
      const raw = draftQtds[item.id];
      const qtd = raw !== undefined ? Number(raw.replace(',', '.')) || 0 : item.quantidadeMedida;
      if (qtd <= 0) return false;
    }
    if (!buscaTabela.trim()) return true;
    const q = buscaTabela.toLowerCase();
    return (
      item.codigo.toLowerCase().includes(q) ||
      item.descricao.toLowerCase().includes(q) ||
      item.unidade.toLowerCase().includes(q)
    );
  });

  const commitQuantidade = async (itemId: string, rawVal: string) => {
    const normalized = rawVal.replace(',', '.').trim();
    const qtd = normalized === '' ? 0 : Math.max(0, Number(normalized));
    if (Number.isNaN(qtd)) return;

    const alvo = medicao.itensMedidos.find((i) => i.id === itemId);
    if (!alvo) return;
    if (Math.abs(qtd - alvo.quantidadeMedida) < 0.0001) return;

    const check = medicaoService.validarItemMedicao(
      alvo.quantidadeContratada,
      alvo.saldoAnterior,
      qtd
    );

    if (!check.valido) {
      setErroLinha(`${alvo.codigo}: ${check.erro}`);
      setDraftQtds((prev) => ({ ...prev, [itemId]: String(alvo.quantidadeMedida) }));
      pushToast('error', check.erro ?? 'Quantidade inválida.');
      return;
    }

    setErroLinha(null);
    const novosItens = medicao.itensMedidos.map((item) => {
      if (item.id !== itemId) return item;
      const saldoAtual = Number((item.saldoAnterior - qtd).toFixed(2));
      const valorMedido = Number((qtd * item.precoUnitario).toFixed(2));
      return {
        ...item,
        quantidadeMedida: qtd,
        saldoAtual,
        valorMedido,
      };
    });

    const valorTotalMedicao = Number(
      novosItens.reduce((acc, i) => acc + i.valorMedido, 0).toFixed(2)
    );
    const perc = percentualExecutado(contrato.valorAtual, valorTotalMedicao);

    await updateMedicao(medicao.id, {
      itensMedidos: novosItens,
      valor: valorTotalMedicao,
      percentual: perc,
    });
  };

  const handleRemoveItem = async (itemId: string) => {
    const novosItens = medicao.itensMedidos.filter((i) => i.id !== itemId);
    const valorTotalMedicao = Number(
      novosItens.reduce((acc, i) => acc + i.valorMedido, 0).toFixed(2)
    );
    const perc = percentualExecutado(contrato.valorAtual, valorTotalMedicao);
    await updateMedicao(medicao.id, {
      itensMedidos: novosItens,
      valor: valorTotalMedicao,
      percentual: perc,
    });
    pushToast('info', 'Item removido da medição.');
  };

  const handleInserirExistente = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetId = itemSelecionadoObj?.id;
    if (!targetId) return;
    await addItemToMedicao({
      medicaoId: medicao.id,
      itemContratoId: targetId,
      quantidadeMedida: Number(qtdSelecionado.replace(',', '.')) || 0,
    });
    setSelectedItemId('');
    setQtdSelecionado('1');
  };

  const handleInserirNovo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigo.trim() || !descricao.trim()) return;
    await addItemToMedicao({
      medicaoId: medicao.id,
      codigo: codigo.trim(),
      descricao: descricao.trim(),
      unidade: unidade.trim() || 'un',
      quantidadeContratada: Number(qtdContratada.replace(',', '.')) || 1,
      precoUnitario: Number(precoUnitario.replace(',', '.')) || 0,
      quantidadeMedida: Number(qtdMedidaNovo.replace(',', '.')) || 0,
    });
    setCodigo('');
    setDescricao('');
  };

  return (
    <div className="space-y-5">
      {!editavel && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-900">
          Esta medição está com status <strong>{medicao.status.replace('_', ' ')}</strong>. Itens só
          podem ser alterados em boletins com status <strong>Rascunho</strong> ou{' '}
          <strong>Em Análise</strong>.
        </div>
      )}

      {erroLinha && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2 text-xs text-red-800">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{erroLinha}</span>
        </div>
      )}

      {/* Insert Item Form */}
      {editavel && (
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => setModoInsercao('PLANILHA')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  modoInsercao === 'PLANILHA'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Database className="w-3.5 h-3.5 text-[#004A8F]" />
                <span>Banco da Planilha ({itensContratoDisponiveis.length} disp.)</span>
              </button>
              <button
                type="button"
                onClick={() => setModoInsercao('NOVO')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  modoInsercao === 'NOVO'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Novo Item Avulso
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setImportOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#00897B] rounded-md hover:bg-[#007367]"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Importar Planilha (XLSX / PDF)</span>
              </button>
              {itensContratoDisponiveis.length > 0 && (
                <button
                  type="button"
                  onClick={() => void syncContratoItensToMedicao(medicao.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#004A8F] bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Importar Todos do Contrato ({itensContratoDisponiveis.length})</span>
                </button>
              )}
            </div>
          </div>

          {modoInsercao === 'NOVO' ? (
            <form onSubmit={handleInserirNovo} className="grid grid-cols-1 sm:grid-cols-6 gap-3 items-end">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Código *</label>
                <input
                  required
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                  placeholder="01.05.002"
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-md"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">Descrição do Serviço *</label>
                <input
                  required
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Ex: Revestimento cerâmico parede"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Unid / Contratado</label>
                <div className="flex gap-1.5">
                  <input
                    required
                    value={unidade}
                    onChange={(e) => setUnidade(e.target.value)}
                    placeholder="m²"
                    className="w-16 px-2 py-2 text-xs font-mono border border-slate-300 rounded-md"
                  />
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={qtdContratada}
                    onChange={(e) => setQtdContratada(e.target.value)}
                    placeholder="Qtd"
                    className="flex-1 min-w-0 px-2 py-2 text-xs font-mono border border-slate-300 rounded-md"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Unit. (R$) / Medido</label>
                <div className="flex gap-1.5">
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="0"
                    value={precoUnitario}
                    onChange={(e) => setPrecoUnitario(e.target.value)}
                    placeholder="R$"
                    className="w-1/2 px-2 py-2 text-xs font-mono border border-slate-300 rounded-md"
                  />
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="0"
                    value={qtdMedidaNovo}
                    onChange={(e) => setQtdMedidaNovo(e.target.value)}
                    placeholder="Med."
                    className="w-1/2 px-2 py-2 text-xs font-mono border border-slate-300 rounded-md"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#004A8F] rounded-md hover:bg-[#003970] whitespace-nowrap shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Inserir Item</span>
              </button>
            </form>
          ) : (
            <form onSubmit={handleInserirExistente} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <div className="sm:col-span-4">
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Filtrar Banco da Planilha
                  </label>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={buscaBanco}
                      onChange={(e) => setBuscaBanco(e.target.value)}
                      placeholder="Código ou descrição..."
                      className="w-full pl-8 pr-2.5 py-2 text-xs bg-white border border-slate-300 rounded-md"
                    />
                  </div>
                </div>
                <div className="sm:col-span-5">
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Item da Planilha ({itensDisponiveisFiltrados.length})
                  </label>
                  <select
                    value={itemSelecionadoObj?.id || ''}
                    onChange={(e) => setSelectedItemId(e.target.value)}
                    disabled={itensDisponiveisFiltrados.length === 0}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md"
                  >
                    {itensDisponiveisFiltrados.length === 0 ? (
                      <option value="">
                        {itensContratoDisponiveis.length === 0
                          ? 'Todos os itens da planilha já estão nesta medição'
                          : 'Nenhum item encontrado para o filtro'}
                      </option>
                    ) : (
                      itensDisponiveisFiltrados.map((ic) => (
                        <option key={ic.id} value={ic.id}>
                          {ic.codigo} — {ic.descricao} ({ic.unidade} · {formatCurrencyBR(ic.precoUnitario)})
                        </option>
                      ))
                    )}
                  </select>
                </div>
                <div className="sm:col-span-3 flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Qtd Executada
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={qtdSelecionado}
                      onChange={(e) => setQtdSelecionado(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-md"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!itemSelecionadoObj}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-[#004A8F] rounded-md hover:bg-[#003970] disabled:opacity-40 whitespace-nowrap shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Incluir</span>
                  </button>
                </div>
              </div>
              {itemSelecionadoObj && (
                <div className="flex flex-wrap items-center gap-4 px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-600">
                  <span>
                    <strong className="text-slate-800">{itemSelecionadoObj.codigo}</strong> · Qtd Contr.:{' '}
                    <span className="font-mono">{formatNumberBR(itemSelecionadoObj.quantidade)} {itemSelecionadoObj.unidade}</span>
                  </span>
                  <span>
                    Unitário:{' '}
                    <span className="font-mono font-semibold text-slate-800">
                      {formatCurrencyBR(itemSelecionadoObj.precoUnitario)}
                    </span>
                  </span>
                  <span>
                    Valor Calculado:{' '}
                    <span className="font-mono font-bold text-[#004A8F]">
                      {formatCurrencyBR(
                        (Number(qtdSelecionado.replace(',', '.')) || 0) *
                          itemSelecionadoObj.precoUnitario
                      )}
                    </span>
                  </span>
                </div>
              )}
            </form>
          )}
        </div>
      )}

      {/* Search & Filter over Measurement Table */}
      {medicao.itensMedidos.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded-lg px-4 py-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={buscaTabela}
              onChange={(e) => setBuscaTabela(e.target.value)}
              placeholder="Filtrar itens lançados por código ou descrição..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-[#004A8F]"
            />
          </div>
          <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={apenasComQtd}
              onChange={(e) => setApenasComQtd(e.target.checked)}
              className="rounded border-slate-300 text-[#004A8F]"
            />
            <span>Mostrar apenas itens com quantidade executada &gt; 0</span>
          </label>
        </div>
      )}

      {/* Items Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
              <tr>
                <th className="px-4 py-2.5">Código</th>
                <th className="px-4 py-2.5">Descrição</th>
                <th className="px-4 py-2.5">Unid</th>
                <th className="px-4 py-2.5 text-right">Saldo Anterior</th>
                <th className="px-4 py-2.5 text-right">Qtd Medida</th>
                <th className="px-4 py-2.5 text-right">Saldo Atual</th>
                <th className="px-4 py-2.5 text-right">Preço Unit.</th>
                <th className="px-4 py-2.5 text-right">Valor Medido</th>
                {editavel && <th className="px-3 py-2.5 text-center">Ação</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {itensTabelaFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={editavel ? 9 : 8} className="px-4 py-8 text-center text-sm text-slate-500">
                    {medicao.itensMedidos.length === 0
                      ? 'Nenhum item inserido nesta medição. Importe uma planilha (.xlsx ou .pdf) ou selecione itens do banco acima.'
                      : 'Nenhum item corresponde ao filtro atual.'}
                  </td>
                </tr>
              ) : (
                itensTabelaFiltrados.map((item) => {
                  const rawDraft = draftQtds[item.id];
                  const parsedDraft =
                    rawDraft !== undefined
                      ? Math.max(0, Number(rawDraft.replace(',', '.').trim()) || 0)
                      : item.quantidadeMedida;
                  const liveQtd = editavel ? parsedDraft : item.quantidadeMedida;
                  const liveSaldoAtual = Number((item.saldoAnterior - liveQtd).toFixed(2));
                  const liveValorMedido = Number((liveQtd * item.precoUnitario).toFixed(2));
                  const excedeuSaldo = liveQtd > item.saldoAnterior + 0.0001;

                  return (
                    <tr key={item.id} className="h-11 hover:bg-slate-50/70">
                      <td className="px-4 py-2 font-mono text-xs text-slate-700">{item.codigo}</td>
                      <td className="px-4 py-2 text-slate-900 max-w-xs truncate">{item.descricao}</td>
                      <td className="px-4 py-2 font-mono text-xs text-slate-500">{item.unidade}</td>
                      <td className="px-4 py-2 text-right font-mono tabular-nums text-slate-600">
                        {formatNumberBR(item.saldoAnterior)}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {editavel ? (
                          <input
                            type="number"
                            step="0.01"
                            min={0}
                            value={draftQtds[item.id] ?? String(item.quantidadeMedida)}
                            onChange={(e) => {
                              const val = e.target.value;
                              setDraftQtds((prev) => ({ ...prev, [item.id]: val }));
                              if (debounceTimers.current[item.id]) {
                                clearTimeout(debounceTimers.current[item.id]);
                              }
                              debounceTimers.current[item.id] = setTimeout(() => {
                                void commitQuantidade(item.id, val);
                              }, 500);
                            }}
                            onBlur={(e) => {
                              if (debounceTimers.current[item.id]) {
                                clearTimeout(debounceTimers.current[item.id]);
                              }
                              void commitQuantidade(item.id, e.target.value);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                if (debounceTimers.current[item.id]) {
                                  clearTimeout(debounceTimers.current[item.id]);
                                }
                                e.currentTarget.blur();
                              }
                            }}
                            className={`w-28 px-2 py-1 text-right font-mono tabular-nums text-sm bg-white border rounded focus:outline-none ${
                              excedeuSaldo
                                ? 'border-red-500 text-red-700 focus:border-red-600'
                                : 'border-slate-300 focus:border-[#004A8F]'
                            }`}
                          />
                        ) : (
                          <span className="font-mono tabular-nums font-medium text-slate-900">
                            {formatNumberBR(item.quantidadeMedida)}
                          </span>
                        )}
                      </td>
                      <td
                        className={`px-4 py-2 text-right font-mono tabular-nums ${
                          excedeuSaldo ? 'text-red-700 font-semibold' : 'text-slate-600'
                        }`}
                      >
                        {formatNumberBR(liveSaldoAtual)}
                      </td>
                      <td className="px-4 py-2 text-right font-mono tabular-nums text-slate-600">
                        {formatCurrencyBR(item.precoUnitario)}
                      </td>
                      <td className="px-4 py-2 text-right font-mono tabular-nums font-semibold text-slate-900">
                        {formatCurrencyBR(liveValorMedido)}
                      </td>
                      {editavel && (
                        <td className="px-3 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => void handleRemoveItem(item.id)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded"
                            aria-label="Remover item da medição"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
            <tfoot className="bg-slate-50 border-t border-slate-200 font-semibold text-sm">
              <tr>
                <td colSpan={7} className="px-4 py-3 text-right text-slate-700">
                  Total da Medição
                </td>
                <td className="px-4 py-3 text-right font-mono tabular-nums text-[#004A8F]">
                  {formatCurrencyBR(
                    editavel
                      ? medicao.itensMedidos.reduce((acc, item) => {
                          const raw = draftQtds[item.id];
                          const qtd =
                            raw !== undefined
                              ? Math.max(0, Number(raw.replace(',', '.').trim()) || 0)
                              : item.quantidadeMedida;
                          return acc + Number((qtd * item.precoUnitario).toFixed(2));
                        }, 0)
                      : medicao.valor
                  )}
                </td>
                {editavel && <td />}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <ImportPlanilhaModal
        open={importOpen}
        titulo={`Importar Planilha na Medição nº ${medicao.numero.toString().padStart(2, '0')}`}
        subtitulo="Os preços unitários e quantidades contratadas da planilha serão aplicados automaticamente para cálculo real ao inserir quantidades executadas."
        mostrarColunaExecutada
        onClose={() => setImportOpen(false)}
        onConfirm={async (payload) => {
          await importPlanilhaMedicao({
            medicaoId: medicao.id,
            ...payload,
          });
        }}
      />
    </div>
  );
}
