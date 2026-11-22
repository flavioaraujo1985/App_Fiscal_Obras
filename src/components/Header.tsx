import { Menu } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useFiscalStore } from '../store/useFiscalStore';
import PWAInstallButton from './PWAInstallButton';

const ROUTE_TITLES: Record<string, string> = {
  '/': 'Dashboard Executivo',
  '/contratos': 'Gestão de Contratos',
  '/medicoes': 'Boletins de Medição',
  '/diario': 'Diário de Obras (RDO)',
  '/avaliacoes': 'Avaliação de Desempenho',
  '/fotos': 'Galeria & Mapa Georreferenciado',
  '/inconformidades': 'Não Conformidades (NC)',
  '/gefispag': 'GEFISPAG — Liquidação & Pagamento',
  '/aditivos': 'Termos Aditivos',
  '/garantias': 'Garantias Contratuais',
  '/recebimento': 'Termos de Recebimento',
  '/relatorios': 'Relatórios & Auditoria',
  '/configuracoes': 'Configurações do Sistema',
};

interface HeaderProps {
  onOpenMobileMenu: () => void;
}

export default function Header({ onOpenMobileMenu }: HeaderProps) {
  const location = useLocation();
  const { db, selectedContratoId, setSelectedContratoId } = useFiscalStore();

  const baseRoute = '/' + (location.pathname.split('/')[1] || '');
  const currentTitle = ROUTE_TITLES[baseRoute] ?? 'Detalhes do Registro';

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 lg:px-8 flex items-center justify-between gap-4 sm:gap-8 shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-md"
          aria-label="Abrir navegação"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 text-sm min-w-0 truncate">
          <span className="text-slate-400 hidden sm:inline">FiscalObra Pro</span>
          <span className="text-slate-300 hidden sm:inline">/</span>
          <span className="font-semibold text-slate-900 truncate">{currentTitle}</span>
        </div>
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        <label htmlFor="global-contract-filter" className="sr-only">
          Filtrar por contrato
        </label>
        <select
          id="global-contract-filter"
          value={selectedContratoId}
          onChange={(e) => setSelectedContratoId(e.target.value)}
          className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:border-[#004A8F] max-w-[160px] sm:max-w-[240px]"
        >
          <option value="ALL">Todos os Contratos ({db.contratos.length})</option>
          {db.contratos.map((c) => (
            <option key={c.id} value={c.id}>
              {c.numero} — {c.contratada.split(' ').slice(0, 2).join(' ')}
            </option>
          ))}
        </select>
        <PWAInstallButton />
      </div>
    </header>
  );
}
