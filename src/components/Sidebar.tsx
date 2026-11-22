import {
  AlertTriangle,
  Award,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  FileBarChart2,
  FileCheck2,
  FilePlus2,
  HardHat,
  LayoutDashboard,
  NotebookPen,
  Settings,
  X,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { IMG_AVATAR_FISCAL } from '../data/seedData';
import { useFiscalStore } from '../store/useFiscalStore';

const NAV_GROUPS = [
  {
    title: 'Visão Geral',
    items: [
      { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Fiscalização & Obra',
    items: [
      { label: 'Contratos', path: '/contratos', icon: ClipboardList },
      { label: 'Medições', path: '/medicoes', icon: HardHat },
      { label: 'Diário de Obras', path: '/diario', icon: NotebookPen },
      { label: 'Avaliação de Desempenho', path: '/avaliacoes', icon: ClipboardCheck },
      { label: 'Fotos & Mapa', path: '/fotos', icon: Camera },
      { label: 'Inconformidades', path: '/inconformidades', icon: AlertTriangle },
    ],
  },
  {
    title: 'Financeiro & Termos',
    items: [
      { label: 'GEFISPAG', path: '/gefispag', icon: CheckCircle2 },
      { label: 'Aditivos', path: '/aditivos', icon: FilePlus2 },
      { label: 'Garantias', path: '/garantias', icon: Award },
      { label: 'Recebimento', path: '/recebimento', icon: FileCheck2 },
    ],
  },
  {
    title: 'Governança',
    items: [
      { label: 'Relatórios', path: '/relatorios', icon: FileBarChart2 },
      { label: 'Configurações', path: '/configuracoes', icon: Settings },
    ],
  },
];

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export default function Sidebar({ mobileOpen, onCloseMobile }: SidebarProps) {
  const { configuracoes } = useFiscalStore((s) => s.db);

  const navContent = (
    <div className="flex flex-col h-full bg-white border-r border-slate-200 w-[260px]">
      <div className="h-16 px-5 flex items-center justify-between border-b border-slate-200 shrink-0">
        <span className="font-display text-lg font-bold tracking-tight text-[#004A8F] whitespace-nowrap">
          FiscalObra Pro
        </span>
        <button
          type="button"
          onClick={onCloseMobile}
          className="lg:hidden p-1.5 text-slate-500 hover:text-slate-800 rounded"
          aria-label="Fechar menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {NAV_GROUPS.map((group) => (
          <div key={group.title}>
            <div className="px-3 mb-1.5 text-xs font-medium text-slate-400">
              {group.title}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/'}
                    onClick={onCloseMobile}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                        isActive
                          ? 'bg-[#004A8F] text-white'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-200 flex items-center gap-3 shrink-0">
        <img
          src={IMG_AVATAR_FISCAL}
          alt={configuracoes.fiscalPadrao}
          referrerPolicy="no-referrer"
          className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
        />
        <div className="min-w-0">
          <div className="text-xs font-semibold text-slate-900 truncate">
            {configuracoes.fiscalPadrao}
          </div>
          <div className="text-xs text-slate-500 truncate">
            {configuracoes.creaFiscal}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block shrink-0">{navContent}</aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative z-10 h-full">{navContent}</div>
        </div>
      )}
    </>
  );
}
