import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import CentroMonitoreo from "./pages/CentroMonitoreo";
import FlotaUnidades from "./pages/FlotaUnidades";
import FlotaUnidadDetalle from "./pages/FlotaUnidadDetalle";
import FlotaLlantas from "./pages/FlotaLlantas";
import CombustibleConciliacion from "./pages/CombustibleConciliacion";
import ClientesCatalogo from "./pages/ClientesCatalogo";
import ClientesNuevo from "./pages/ClientesNuevo";
import CierreViaje from "./pages/CierreViaje";
import CuentasPorCobrar from "./pages/CuentasPorCobrar";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="monitoreo" element={<CentroMonitoreo />} />
            <Route path="flota" element={<FlotaUnidades />} />
            <Route path="flota/unidad/:id" element={<FlotaUnidadDetalle />} />
            <Route path="flota/llantas" element={<FlotaLlantas />} />
            <Route path="combustible/conciliacion" element={<CombustibleConciliacion />} />
            <Route path="clientes" element={<ClientesCatalogo />} />
            <Route path="clientes/nuevo" element={<ClientesNuevo />} />
            <Route path="cierre" element={<CierreViaje />} />
            <Route path="cuentas-por-cobrar" element={<CuentasPorCobrar />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
