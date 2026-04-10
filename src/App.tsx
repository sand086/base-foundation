import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeProvider";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { AppLayout } from "./components/layout/AppLayout";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import MonitoringCenter from "./pages/MonitoringCenter";
import FleetUnits from "./pages/FleetUnits";
import FleetUnitDetail from "./pages/FleetUnitDetail";
import FleetOperators from "./pages/FleetOperators";
import FleetTires from "./pages/FleetTires";
import Mechanics from "./pages/Mechanics";
import Maintenance from "./pages/Maintenance";
import FuelConciliation from "./pages/FuelConciliation";
import FuelLoads from "./pages/FuelLoads";
import ClientsCatalog from "./pages/ClientsCatalog";
import ClientForm from "./pages/ClientForm";
import TripSettlement from "./pages/TripSettlement";
import Receivables from "./pages/Receivables";
import Payables from "./pages/Payables";
import RateManagement from "./pages/RateManagement";
import Purchases from "./pages/Purchases";
import Dispatch from "./pages/Dispatch";
import Users from "./pages/Users";
import RolesPermissions from "./pages/RolesPermissions";
import Treasury from "./pages/Treasury";
import FinanceDashboard from "./pages/FinanceDashboard";
import NotificationsConfig from "./pages/NotificationsConfig";
import BulkUploads from "./pages/BulkUploads";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import Manuals from "./pages/Manuals";
import TwoFactorAuth from "./pages/TwoFactorAuth";
import TrafficControl from "./pages/TrafficControl";
import Verify2FA from "@/features/users/components/Verify2FA";

// Wizard de Despacho
import { DispatchWizard } from "@/features/trips/components/DispatchWizard";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              {/* ============================== */}
              {/* RUTAS PÚBLICAS Y DE VERIFICACIÓN */}
              {/* ============================== */}
              <Route path="/login" element={<Login />} />
              <Route path="/verify-2fa" element={<Verify2FA />} />

              {/* ============================== */}
              {/* RUTAS PROTEGIDAS (Requieren Login General) */}
              {/* ============================== */}
              <Route element={<ProtectedRoute />}>
                <Route path="/2fa-setup" element={<TwoFactorAuth />} />

                {/* APP LAYOUT CON NAVEGACIÓN */}
                <Route path="/" element={<AppLayout />}>
                  {/*  ACCESO GENERAL (Todo usuario logueado lo ve) */}
                  <Route index element={<Dashboard />} />
                  <Route path="profile" element={<Profile />} />
                  <Route path="manuals" element={<Manuals />} />

                  {/*  MÓDULO: MONITOREO */}
                  <Route
                    element={<ProtectedRoute requiredModule="monitoring" />}
                  >
                    <Route path="monitoring" element={<MonitoringCenter />} />
                  </Route>

                  {/*  MÓDULO: TRÁFICO */}
                  <Route element={<ProtectedRoute requiredModule="traffic" />}>
                    <Route
                      path="traffic-control"
                      element={<TrafficControl />}
                    />
                  </Route>

                  {/*  MÓDULO: FLOTA */}
                  <Route element={<ProtectedRoute requiredModule="fleet" />}>
                    <Route path="fleet" element={<FleetUnits />} />
                    <Route
                      path="fleet/unit/:id"
                      element={<FleetUnitDetail />}
                    />
                    <Route
                      path="fleet/operators"
                      element={<FleetOperators />}
                    />
                    <Route path="fleet/tires" element={<FleetTires />} />
                    <Route path="fleet/maintenance" element={<Maintenance />} />
                    <Route path="fleet/mechanics" element={<Mechanics />} />
                  </Route>

                  {/*  MÓDULO: COMBUSTIBLE */}
                  <Route element={<ProtectedRoute requiredModule="fuel" />}>
                    <Route path="fuel" element={<FuelLoads />} />
                    <Route path="fuel/loads" element={<FuelLoads />} />
                    <Route
                      path="fuel/conciliation"
                      element={<FuelConciliation />}
                    />
                  </Route>

                  {/*  MÓDULO: CLIENTES */}
                  <Route element={<ProtectedRoute requiredModule="clients" />}>
                    <Route path="clients" element={<ClientsCatalog />} />
                    <Route path="clients/new" element={<ClientForm />} />
                    <Route
                      path="clients/edit/:clientId"
                      element={<ClientForm />}
                    />
                  </Route>

                  {/*  MÓDULO: LIQUIDACIONES */}
                  <Route
                    element={<ProtectedRoute requiredModule="settlements" />}
                  >
                    <Route path="settlements" element={<TripSettlement />} />
                  </Route>

                  {/*  MÓDULO: COBRANZA */}
                  <Route
                    element={<ProtectedRoute requiredModule="receivables" />}
                  >
                    <Route path="receivables" element={<Receivables />} />
                  </Route>

                  {/*  MÓDULO: PROVEEDORES (Y COMPRAS) */}
                  <Route element={<ProtectedRoute requiredModule="payables" />}>
                    <Route path="payables" element={<Payables />} />
                    <Route path="purchases" element={<Purchases />} />
                  </Route>

                  {/*  MÓDULO: TARIFAS */}
                  <Route element={<ProtectedRoute requiredModule="rates" />}>
                    <Route path="rates" element={<RateManagement />} />
                  </Route>

                  {/*  MÓDULO: DESPACHO */}
                  <Route element={<ProtectedRoute requiredModule="dispatch" />}>
                    <Route path="dispatch" element={<Dispatch />} />
                    <Route path="dispatch/new" element={<DispatchWizard />} />
                  </Route>

                  {/*  MÓDULO: TESORERÍA */}
                  <Route element={<ProtectedRoute requiredModule="treasury" />}>
                    <Route path="treasury" element={<Treasury />} />
                    <Route
                      path="finance-dashboard"
                      element={<FinanceDashboard />}
                    />
                  </Route>

                  {/*  MÓDULO: ADMINISTRACIÓN */}
                  <Route element={<ProtectedRoute requiredModule="admin" />}>
                    <Route path="users" element={<Users />} />
                    <Route
                      path="roles-permissions"
                      element={<RolesPermissions />}
                    />
                    <Route
                      path="notifications"
                      element={<NotificationsConfig />}
                    />
                    <Route path="bulk-uploads" element={<BulkUploads />} />
                    <Route path="settings" element={<Settings />} />
                  </Route>
                </Route>
              </Route>

              {/* ============================== */}
              {/* Catch-all (404) */}
              {/* ============================== */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
