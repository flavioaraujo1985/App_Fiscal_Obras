import { CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Header from '../components/Header';
import OfflineIndicator from '../components/OfflineIndicator';
import Sidebar from '../components/Sidebar';
import { useFiscalStore } from '../store/useFiscalStore';

export default function MainLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { toasts, dismissToast } = useFiscalStore();

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        <Header onOpenMobileMenu={() => setMobileOpen(true)} />

        <main className="flex-1 p-4 lg:p-8 max-w-[1440px] w-full mx-auto">
          <Outlet />
        </main>
      </div>

      <OfflineIndicator />

      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm w-full px-4 sm:px-0">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`flex items-start gap-2.5 p-3.5 rounded-lg border shadow-md bg-white text-sm ${
                t.tipo === 'error'
                  ? 'border-red-200 text-red-900'
                  : t.tipo === 'success'
                  ? 'border-emerald-200 text-emerald-900'
                  : 'border-blue-200 text-slate-900'
              }`}
            >
              {t.tipo === 'error' ? (
                <XCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
              ) : t.tipo === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
              ) : (
                <Info className="w-4 h-4 text-[#004A8F] mt-0.5 shrink-0" />
              )}
              <span className="flex-1 text-xs font-medium leading-relaxed">{t.texto}</span>
              <button
                type="button"
                onClick={() => dismissToast(t.id)}
                className="text-slate-400 hover:text-slate-600 shrink-0"
                aria-label="Fechar notificação"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
