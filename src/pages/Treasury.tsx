import { useState, useMemo, useEffect } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Landmark,
  TrendingUp,
  Wallet,
  AlertTriangle,
  CheckCircle2,
  Plus,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

import axiosClient from "@/api/axiosClient";
import { toast } from "sonner";
import { useSystemConfig } from "@/features/settings/hooks/useSystemConfig";
import { useBankAccounts } from "@/features/treasury/hooks/useBankAccounts";
import { BankMovement, BankAccount } from "@/features/treasury/types";

// IMPORTAMOS NUESTROS COMPONENTES MODULARES
import { BankAccountsTab } from "@/features/treasury/components/BankAccountsTab";
import { TreasuryFlowTab } from "@/features/treasury/components/TreasuryFlowTab";
import { BankAccountModal } from "@/features/treasury/components/BankAccountModal";
import { MovementDetailModal } from "@/features/treasury/components/MovementDetailModal";
import { ManualMovementModal } from "@/features/treasury/components/ManualMovementModal";

export default function Treasury() {
  const { value: monedaBase } = useSystemConfig("moneda_base");
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: monedaBase || "MXN",
    }).format(Number.isFinite(amount) ? amount : 0);

  const {
    bankAccounts,
    isLoading: isAccountsLoading,
    refresh: refreshAccounts,
    deleteAccount,
  } = useBankAccounts();

  const [movimientos, setMovimientos] = useState<BankMovement[]>([]);
  const [isMovementsLoading, setIsMovementsLoading] = useState(true);
  const [showBalances, setShowBalances] = useState(true);

  // States Tab Movimientos
  const [searchTerm, setSearchTerm] = useState("");
  const [movementFilter, setMovementFilter] = useState<
    "all" | "operativa" | "cobranza"
  >("all");

  // States Modales Movimientos
  const [selectedMovement, setSelectedMovement] = useState<BankMovement | null>(
    null,
  );
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDeleteMovementOpen, setIsDeleteMovementOpen] = useState(false);
  const [movementToDelete, setMovementToDelete] = useState<BankMovement | null>(
    null,
  );
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1);
  const [isManualMovementOpen, setIsManualMovementOpen] = useState(false);

  // States Modales Cuentas
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(
    null,
  );
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isAccountDetailOpen, setIsAccountDetailOpen] = useState(false);
  const [isDeleteAccountOpen, setIsDeleteAccountOpen] = useState(false);

  const fetchMovements = async () => {
    setIsMovementsLoading(true);
    try {
      const movRes = await axiosClient.get<BankMovement[]>(
        "/api/finance/movements",
      );
      setMovimientos(movRes.data || []);
    } catch (error) {
      toast.error("Error al cargar los movimientos financieros");
    } finally {
      setIsMovementsLoading(false);
    }
  };

  useEffect(() => {
    fetchMovements();
  }, []);

  // Helpers de Cuentas
  const handleCreateAccountClick = () => {
    setSelectedAccount(null);
    setIsAccountModalOpen(true);
  };
  const handleEditAccountClick = (acc: BankAccount) => {
    setSelectedAccount(acc);
    setIsAccountModalOpen(true);
  };
  const handleViewAccountClick = (acc: BankAccount) => {
    setSelectedAccount(acc);
    setIsAccountDetailOpen(true);
  };
  const handleDeleteAccountClick = (acc: BankAccount) => {
    setSelectedAccount(acc);
    setIsDeleteAccountOpen(true);
  };

  const confirmDeleteAccount = async () => {
    if (!selectedAccount) return;
    const success = await deleteAccount(selectedAccount.id);
    if (success) {
      setIsDeleteAccountOpen(false);
      setSelectedAccount(null);
    }
  };

  const handleToggleConciliacion = async (movementId: number) => {
    const movement = movimientos.find((m) => m.id === movementId);
    if (!movement) return;
    const newConciliado = !movement.conciliado;
    try {
      await axiosClient.patch(
        `/api/finance/movements/${movementId}/conciliation`,
        {
          conciliado: newConciliado,
          fecha_conciliacion: newConciliado
            ? new Date().toISOString().split("T")[0]
            : null,
        },
      );
      setMovimientos(
        movimientos.map((m) =>
          m.id === movementId ? { ...m, conciliado: newConciliado } : m,
        ),
      );
      refreshAccounts();
      toast.success(
        `Movimiento ${newConciliado ? "conciliado" : "desconciliado"}`,
      );
    } catch (error) {
      toast.error("Error al actualizar la conciliación");
    }
  };

  const operativaAccounts = useMemo(
    () =>
      bankAccounts.filter(
        (a) => a.tipo_cuenta === "operativa" && a.estatus === "activo",
      ),
    [bankAccounts],
  );
  const cobranzaAccounts = useMemo(
    () =>
      bankAccounts.filter(
        (a) => a.tipo_cuenta === "cobranza" && a.estatus === "activo",
      ),
    [bankAccounts],
  );

  const filteredMovimientos = useMemo(() => {
    let filtered = movimientos;
    if (movementFilter !== "all") {
      const accountNumbers =
        movementFilter === "operativa"
          ? operativaAccounts.map((a) => a.numero_cuenta)
          : cobranzaAccounts.map((a) => a.numero_cuenta);
      filtered = filtered.filter((m) =>
        accountNumbers.includes(m.cuenta_bancaria || ""),
      );
    }
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.concepto.toLowerCase().includes(lowerSearch) ||
          (m.referencia_bancaria &&
            m.referencia_bancaria.toLowerCase().includes(lowerSearch)) ||
          m.banco?.toLowerCase().includes(lowerSearch),
      );
    }
    return filtered;
  }, [
    movimientos,
    movementFilter,
    searchTerm,
    operativaAccounts,
    cobranzaAccounts,
  ]);

  const stats = useMemo(() => {
    const conciliados = movimientos.filter((m) => m.conciliado).length;
    const pendientes = movimientos.filter((m) => !m.conciliado).length;
    const total_ingresos = movimientos
      .filter((m) => m.tipo === "ingreso")
      .reduce((sum, m) => sum + m.monto, 0);
    const total_egresos = movimientos
      .filter((m) => m.tipo === "egreso")
      .reduce((sum, m) => sum + m.monto, 0);
    return { conciliados, pendientes, total_ingresos, total_egresos };
  }, [movimientos]);

  return (
    <div className="p-4 md:p-8 space-y-8 animate-page-enter pb-20">
      <PageHeader
        title="Gestión de Tesorería"
        description="Registro de detalles financiera, flujo de efectivo y administración de cuentas bancarias."
        icon={<Landmark className="h-8 w-8" />}
      />

      <Tabs defaultValue="tesoreria" className="w-full">
        <div className="flex justify-between items-center mb-6 w-full">
          <TabsList className="bg-slate-100/50 dark:bg-slate-900/50 backdrop-blur-md p-1 h-14 rounded-xl border border-slate-200/50 dark:border-white/10 w-full sm:w-auto inline-flex">
            <TabsTrigger
              value="tesoreria"
              className="gap-2 text-[11px] font-black uppercase tracking-widest rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-brand-navy data-[state=active]:shadow-sm h-full px-6 transition-all"
            >
              <TrendingUp className="h-4 w-4 text-emerald-600" /> Tesorería
              (Flujo)
            </TabsTrigger>
            <TabsTrigger
              value="cuentas"
              className="gap-2 text-[11px] font-black uppercase tracking-widest rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-brand-navy data-[state=active]:shadow-sm h-full px-6 transition-all"
            >
              <Wallet className="h-4 w-4 text-blue-600" /> Cuentas Bancarias
            </TabsTrigger>
          </TabsList>

          <Button
            onClick={() => setIsManualMovementOpen(true)}
            className="rounded-xl shadow-md h-12 px-6 bg-brand-navy hover:bg-brand-navy/90 text-white font-bold tracking-wide"
          >
            <Plus className="w-5 h-5 mr-2" />
            Nuevo Movimiento
          </Button>
        </div>

        <TabsContent value="tesoreria" className="m-0">
          <TreasuryFlowTab
            stats={stats}
            movimientos={filteredMovimientos}
            isMovementsLoading={isMovementsLoading}
            showBalances={showBalances}
            formatCurrency={formatCurrency}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            movementFilter={movementFilter}
            setMovementFilter={setMovementFilter}
            fetchMovements={fetchMovements}
            handleToggleConciliacion={handleToggleConciliacion}
            onViewMovement={(mov) => {
              setSelectedMovement(mov);
              setIsDetailModalOpen(true);
            }}
            onDeleteMovement={(mov) => {
              setMovementToDelete(mov);
              setDeleteStep(mov.conciliado ? 1 : 2);
              setIsDeleteMovementOpen(true);
            }}
          />
        </TabsContent>

        <TabsContent value="cuentas" className="m-0">
          <BankAccountsTab
            bankAccounts={bankAccounts}
            isAccountsLoading={isAccountsLoading}
            showBalances={showBalances}
            setShowBalances={setShowBalances}
            formatCurrency={formatCurrency}
            onAdd={handleCreateAccountClick}
            onEdit={handleEditAccountClick}
            onView={handleViewAccountClick}
            onDelete={handleDeleteAccountClick}
          />
        </TabsContent>
      </Tabs>

      {/* MODALES ORQUESTADOS */}
      <BankAccountModal
        open={isAccountModalOpen}
        onOpenChange={setIsAccountModalOpen}
        account={selectedAccount}
      />

      <MovementDetailModal
        open={isDetailModalOpen}
        onOpenChange={setIsDetailModalOpen}
        movement={selectedMovement}
      />

      <ManualMovementModal
        open={isManualMovementOpen}
        onOpenChange={setIsManualMovementOpen}
        bankAccounts={bankAccounts}
        onSuccess={() => {
          fetchMovements();
          refreshAccounts();
        }}
      />

      {/* ALERT DIALOG ELIMINAR CUENTA */}
      <AlertDialog
        open={isDeleteAccountOpen}
        onOpenChange={setIsDeleteAccountOpen}
      >
        <AlertDialogContent className="w-[95vw] sm:max-w-lg p-0 flex flex-col bg-card/95 backdrop-blur-xl border border-border shadow-2xl rounded-2xl overflow-hidden">
          <AlertDialogHeader className="p-6 sm:p-8 bg-card border-b border-border shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center shrink-0 shadow-inner">
                <AlertTriangle className="h-7 w-7 text-rose-600 dark:text-rose-400" />
              </div>
              <div className="flex flex-col gap-1">
                <AlertDialogTitle className="text-rose-600 dark:text-rose-500 text-lg sm:text-xl font-black uppercase tracking-tighter">
                  Desactivar Cuenta Bancaria
                </AlertDialogTitle>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mt-1">
                  Soft Delete • Registro de detalles Intacta
                </p>
              </div>
            </div>
          </AlertDialogHeader>

          <div className="p-6 sm:p-8 space-y-5">
            <AlertDialogDescription className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed block">
              Estás a punto de archivar y desactivar la cuenta{" "}
              <strong className="text-slate-900 dark:text-white">
                {selectedAccount?.alias}
              </strong>
              .
            </AlertDialogDescription>

            <div className="p-4 sm:p-5 bg-amber-50 dark:bg-amber-950/20 border-l-4 border-amber-500 rounded-r-xl shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <h4 className="text-[11px] font-black text-amber-800 dark:text-amber-400 uppercase tracking-widest">
                  Pagos en Tránsito (Limbo)
                </h4>
              </div>
              <p className="text-xs leading-relaxed text-amber-900 dark:text-amber-200/80">
                Si existen pagos, facturas o liquidaciones de operadores
                programados hacia esta cuenta, quedarán{" "}
                <b>"en el limbo" (pausados)</b> hasta que el equipo de finanzas
                les asigne una nueva cuenta operativa.
              </p>
            </div>

            <div className="p-4 sm:p-5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50 rounded-xl shadow-sm">
              <div className="flex items-start gap-3">
                <div className="bg-emerald-500 rounded-full p-1 mt-0.5 shadow-lg shadow-emerald-500/20 shrink-0">
                  <CheckCircle2 className="h-3 w-3 text-white" />
                </div>
                <div>
                  <h4 className="text-[11px] font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-widest mb-1">
                    Protección Histórica
                  </h4>
                  <p className="text-[11px] font-medium text-emerald-700/80 dark:text-emerald-400/80 leading-relaxed">
                    Los reportes financieros, despachos, y cobros ya cerrados{" "}
                    <b>no se verán afectados</b>. La cuenta simplemente se
                    ocultará para futuras operaciones.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <AlertDialogFooter className="p-6 sm:p-8 bg-muted/50 border-t border-slate-200 dark:border-white/10 shrink-0">
            <AlertDialogCancel className="rounded-xl font-bold h-11 px-6">
              Cancelar Operación
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteAccount}
              className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold h-11 px-8 shadow-lg shadow-rose-500/20"
            >
              Entendido, Desactivar Cuenta
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ALERT DIALOG ELIMINAR MOVIMIENTO */}
      <AlertDialog
        open={isDeleteMovementOpen}
        onOpenChange={(open) => {
          setIsDeleteMovementOpen(open);
          if (!open) {
            setDeleteStep(1);
            setMovementToDelete(null);
          }
        }}
      >
        <AlertDialogContent className="w-[95vw] sm:max-w-md p-0 flex flex-col bg-card/95 backdrop-blur-xl border border-border shadow-2xl rounded-2xl overflow-hidden">
          <AlertDialogHeader className="p-6 sm:p-8 bg-card border-b border-border shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-7 w-7 text-amber-600" />
              </div>
              <div className="flex flex-col gap-1">
                <AlertDialogTitle className="text-amber-600 text-lg sm:text-xl font-black uppercase tracking-tighter">
                  {movementToDelete?.conciliado && deleteStep === 1
                    ? "Movimiento Conciliado"
                    : "¿Borrar Movimiento?"}
                </AlertDialogTitle>
              </div>
            </div>
          </AlertDialogHeader>
          <div className="p-6 sm:p-8">
            <AlertDialogDescription className="text-slate-600 text-sm leading-relaxed">
              {movementToDelete?.conciliado && deleteStep === 1 ? (
                <div className="p-4 bg-amber-50 border-l-4 border-amber-500 rounded-r-lg text-amber-800">
                  Este movimiento ya fue conciliado. ¿Estás absolutamente
                  seguro?
                </div>
              ) : deleteStep === 2 ? (
                <div className="p-4 bg-rose-50 border-l-4 border-rose-500 rounded-r-lg text-rose-800 font-bold">
                  CONFIRMACIÓN FINAL: Esta acción no se puede deshacer. Se
                  revertirá el saldo a la cuenta bancaria.
                </div>
              ) : (
                <>
                  Se eliminará permanentemente la transacción y se devolverá el
                  dinero a la cuenta bancaria para mantener el saldo cuadrado:
                  <br />
                  <strong className="text-slate-900 mt-2 block p-3 bg-muted rounded-lg border">
                    {movementToDelete?.concepto}
                  </strong>
                </>
              )}
            </AlertDialogDescription>
          </div>
          <AlertDialogFooter className="p-6 sm:p-8 bg-muted/50 border-t border-border shrink-0">
            <AlertDialogCancel className="rounded-xl font-bold h-11 px-6">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (movementToDelete?.conciliado && deleteStep === 1) {
                  setDeleteStep(2);
                  return;
                }
                try {
                  await axiosClient.delete(
                    `/api/finance/movements/${movementToDelete?.id}`,
                  );
                  setMovimientos(
                    movimientos.filter((m) => m.id !== movementToDelete?.id),
                  );
                  refreshAccounts();
                  toast.success(
                    "Movimiento eliminado y saldo restaurado correctamente",
                  );
                } catch (error) {
                  toast.error("Error al eliminar el movimiento");
                } finally {
                  setIsDeleteMovementOpen(false);
                  setMovementToDelete(null);
                  setDeleteStep(1);
                }
              }}
              className={cn(
                "rounded-xl font-bold h-11 px-6 text-white shadow-lg",
                deleteStep === 2
                  ? "bg-rose-600 hover:bg-rose-700"
                  : "bg-amber-600 hover:bg-amber-700",
              )}
            >
              {movementToDelete?.conciliado && deleteStep === 1
                ? "Asumir responsabilidad"
                : "Borrar definitivamente"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
