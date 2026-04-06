import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";
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
import TwoFactorAuth from "./pages/TwoFactorAuth";
import TrafficControl from "./pages/TrafficControl";

// Wizard de Despacho
import { DispatchWizard } from "@/features/trips/components/DispatchWizard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Rutas Públicas */}
            <Route path="/login" element={<Login />} />
            <Route path="/verify-2fa" element={<TwoFactorAuth />} />
            <Route path="/2fa-setup" element={<TwoFactorAuth />} />

            {/* Rutas Protegidas */}
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<AppLayout />}>
                <Route index element={<Dashboard />} />

                {/* 🚀 URLs 100% EN INGLÉS */}
                <Route path="monitoring" element={<MonitoringCenter />} />
                <Route path="traffic-control" element={<TrafficControl />} />

                <Route path="fleet" element={<FleetUnits />} />
                <Route path="fleet/unit/:id" element={<FleetUnitDetail />} />
                <Route path="fleet/operators" element={<FleetOperators />} />
                <Route path="fleet/tires" element={<FleetTires />} />
                <Route path="fleet/maintenance" element={<Maintenance />} />
                <Route path="fleet/mechanics" element={<Mechanics />} />

                <Route path="fuel" element={<FuelLoads />} />
                <Route path="fuel/loads" element={<FuelLoads />} />
                <Route
                  path="fuel/conciliation"
                  element={<FuelConciliation />}
                />

                <Route path="clients" element={<ClientsCatalog />} />
                <Route path="clients/new" element={<ClientForm />} />
                <Route path="clients/:clientId" element={<ClientForm />} />

                <Route path="settlements" element={<TripSettlement />} />
                <Route path="receivables" element={<Receivables />} />
                <Route path="payables" element={<Payables />} />
                <Route path="purchases" element={<Purchases />} />
                <Route path="rates" element={<RateManagement />} />

                <Route path="dispatch" element={<Dispatch />} />
                <Route path="dispatch/new" element={<DispatchWizard />} />

                <Route path="users" element={<Users />} />
                <Route
                  path="roles-permissions"
                  element={<RolesPermissions />}
                />

                <Route path="treasury" element={<Treasury />} />
                <Route
                  path="finance-dashboard"
                  element={<FinanceDashboard />}
                />
                <Route path="notifications" element={<NotificationsConfig />} />
                <Route path="bulk-uploads" element={<BulkUploads />} />
                <Route path="profile" element={<Profile />} />
                <Route path="settings" element={<Settings />} />
              </Route>
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
