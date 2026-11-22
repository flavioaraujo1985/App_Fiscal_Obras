import { Navigate, Route, Routes } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import AditivosPage from '../pages/aditivos';
import AvaliacoesDesempenhoPage from '../pages/avaliacoes';
import ConfiguracoesPage from '../pages/configuracoes';
import Contratos from '../pages/contratos';
import ContratoDetalhe from '../pages/contratos/ContratoDetalhe';
import Dashboard from '../pages/dashboard';
import DiarioObras from '../pages/diario';
import DiarioDetalhe from '../pages/diario/DiarioDetalhe';
import Fotos from '../pages/fotos';
import GarantiasPage from '../pages/garantias';
import GefispagPage from '../pages/gefispag';
import Inconformidades from '../pages/inconformidades';
import NcDetalhe from '../pages/inconformidades/NcDetalhe';
import Medicoes from '../pages/medicoes';
import MedicaoDetalhe from '../pages/medicoes/MedicaoDetalhe';
import RecebimentoPage from '../pages/recebimento';
import RelatoriosPage from '../pages/relatorios';

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/contratos" element={<Contratos />} />
        <Route path="/contratos/:id" element={<ContratoDetalhe />} />
        <Route path="/medicoes" element={<Medicoes />} />
        <Route path="/medicoes/:id" element={<MedicaoDetalhe />} />
        <Route path="/diario" element={<DiarioObras />} />
        <Route path="/diario/:id" element={<DiarioDetalhe />} />
        <Route path="/avaliacoes" element={<AvaliacoesDesempenhoPage />} />
        <Route path="/fotos" element={<Fotos />} />
        <Route path="/inconformidades" element={<Inconformidades />} />
        <Route path="/inconformidades/:id" element={<NcDetalhe />} />
        <Route path="/gefispag" element={<GefispagPage />} />
        <Route path="/aditivos" element={<AditivosPage />} />
        <Route path="/garantias" element={<GarantiasPage />} />
        <Route path="/recebimento" element={<RecebimentoPage />} />
        <Route path="/relatorios" element={<RelatoriosPage />} />
        <Route path="/configuracoes" element={<ConfiguracoesPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
