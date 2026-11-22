import { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { useFiscalStore } from '../store/useFiscalStore';
import { AppRoutes } from './routes';

export default function App() {
  const init = useFiscalStore((s) => s.init);

  useEffect(() => {
    void init();
  }, [init]);

  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
