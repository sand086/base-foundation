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
import Mantenimiento from "./pages/Mantenimiento";
import CombustibleConciliacion from "./pages/CombustibleConciliacion";
import CombustibleCargas from "./pages/CombustibleCargas";
import ClientesCatalogo from "./pages/ClientesCatalogo";
import ClientesNuevo from "./pages/ClientesNuevo";
import CierreViaje from "./pages/CierreViaje";
import CuentasPorCobrar from "./pages/CuentasPorCobrar";
import ProveedoresCxP from "./pages/ProveedoresCxP";
import GestionTarifas from "./pages/GestionTarifas";
import Despacho from "./pages/Despacho";
import UsuariosSeguridad from "./pages/UsuariosSeguridad";
import Tesoreria from "./pages/Tesoreria";
import NotificacionesConfig from "./pages/NotificacionesConfig";
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
            <Route path="flota/mantenimiento" element={<Mantenimiento />} />
            <Route path="combustible" element={<CombustibleCargas />} />
            <Route path="combustible/cargas" element={<CombustibleCargas />} />
            <Route path="combustible/conciliacion" element={<CombustibleConciliacion />} />
            <Route path="clientes" element={<ClientesCatalogo />} />
            <Route path="clientes/nuevo" element={<ClientesNuevo />} />
            <Route path="cierre" element={<CierreViaje />} />
            <Route path="cuentas-por-cobrar" element={<CuentasPorCobrar />} />
            <Route path="proveedores" element={<ProveedoresCxP />} />
            <Route path="tarifas" element={<GestionTarifas />} />
            <Route path="despacho" element={<Despacho />} />
            <Route path="usuarios" element={<UsuariosSeguridad />} />
            <Route path="tesoreria" element={<Tesoreria />} />
            <Route path="notificaciones" element={<NotificacionesConfig />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
