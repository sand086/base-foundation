import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AppLayout } from "./components/layout/AppLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import CentroMonitoreo from "./pages/CentroMonitoreo";
import FlotaUnidades from "./pages/FlotaUnidades";
import FlotaUnidadDetalle from "./pages/FlotaUnidadDetalle";
import FlotaOperadores from "./pages/FlotaOperadores";
import FlotaLlantas from "./pages/FlotaLlantas";
import Mecanicos from "./pages/Mecanicos";
import Mantenimiento from "./pages/Mantenimiento";
import CombustibleConciliacion from "./pages/CombustibleConciliacion";
import CombustibleCargas from "./pages/CombustibleCargas";
import ClientesCatalogo from "./pages/ClientesCatalogo";
import ClientesNuevo from "./pages/ClientesNuevo";
import CierreViaje from "./pages/CierreViaje";
import CuentasPorCobrar from "./pages/CuentasPorCobrar";
import ProveedoresCxP from "./pages/ProveedoresCxP";
import GestionTarifas from "./pages/GestionTarifas";
import Compras from "./pages/Compras";
import Despacho from "./pages/Despacho";
import DespachoNuevo from "./pages/DespachoNuevo";
import UsuariosSeguridad from "./pages/UsuariosSeguridad";
import UsuariosPage from "./pages/UsuariosPage";
import RolesPermisosPage from "./pages/RolesPermisosPage";
import Tesoreria from "./pages/Tesoreria";
import FinanzasDireccion from "./pages/FinanzasDireccion";
import NotificacionesConfig from "./pages/NotificacionesConfig";
import CargasMasivas from "./pages/CargasMasivas";
import ProfilePage from "./pages/ProfilePage";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";
import TwoFactorAuth from "./pages/TwoFactorAuth";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/verify-2fa" element={<TwoFactorAuth />} />
            <Route path="/2fa-setup" element={<TwoFactorAuth />} />

            {/* Protected Routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<AppLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="monitoreo" element={<CentroMonitoreo />} />
                <Route path="flota" element={<FlotaUnidades />} />
                <Route
                  path="flota/unidad/:id"
                  element={<FlotaUnidadDetalle />}
                />
                <Route path="flota/operadores" element={<FlotaOperadores />} />
                <Route path="flota/llantas" element={<FlotaLlantas />} />
                <Route path="flota/mantenimiento" element={<Mantenimiento />} />
                <Route path="flota/mecanicos" element={<Mecanicos />} />
                <Route path="combustible" element={<CombustibleCargas />} />
                <Route
                  path="combustible/cargas"
                  element={<CombustibleCargas />}
                />
                <Route
                  path="combustible/conciliacion"
                  element={<CombustibleConciliacion />}
                />
                <Route path="clients" element={<ClientesCatalogo />} />
                <Route path="clients/nuevo" element={<ClientesNuevo />} />
                <Route path="clients/:clientId" element={<ClientesNuevo />} />
                <Route path="cierre" element={<CierreViaje />} />
                <Route
                  path="cuentas-por-cobrar"
                  element={<CuentasPorCobrar />}
                />
                <Route path="proveedores" element={<ProveedoresCxP />} />
                <Route path="compras" element={<Compras />} />
                <Route path="tarifas" element={<GestionTarifas />} />
                <Route path="despacho" element={<Despacho />} />
                <Route path="despacho/nuevo" element={<DespachoNuevo />} />
                <Route path="usuarios" element={<UsuariosPage />} />
                <Route path="roles-permisos" element={<RolesPermisosPage />} />
                <Route path="tesoreria" element={<Tesoreria />} />
                <Route
                  path="finanzas-direccion"
                  element={<FinanzasDireccion />}
                />
                <Route
                  path="notificaciones"
                  element={<NotificacionesConfig />}
                />
                <Route path="cargas-masivas" element={<CargasMasivas />} />
                <Route path="perfil" element={<ProfilePage />} />
                <Route path="configuracion" element={<SettingsPage />} />
              </Route>
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
