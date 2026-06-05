import { useState, useMemo, useEffect } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Landmark,
  TrendingUp,
  Wallet,
  AlertTriangle,
  Plus,
  Coins,
  Loader2,
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
import { toast } from "sonner";

import { useSystemConfig } from "@/features/settings/hooks/useSystemConfig";
import { useBankAccounts } from "@/features/treasury/hooks/useBankAccounts";
// IMPORTAMOS LOS TIPOS Y SERVICIOS DE OPENAPI
import { FinanceService } from "@/api/generated/services/FinanceService";
import type { BankMovementResponse } from "@/api/generated/models/BankMovementResponse";
import type { BankAccountResponse } from "@/api/generated/models/BankAccountResponse";

import { BankAccountsTab } from "@/features/treasury/components/BankAccountsTab";
import { TreasuryFlowTab } from "@/features/treasury/components/TreasuryFlowTab";
import { BankAccountModal } from "@/features/treasury/components/BankAccountModal";
import { MovementDetailModal } from "@/features/treasury/components/MovementDetailModal";
import { ManualMovementModal } from "@/features/treasury/components/ManualMovementModal";
import { PettyCashModal } from "@/features/treasury/components/PettyCashModal";

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

  const [activeTab, setActiveTab] = useState<string>("tesoreria");

  const [movimientos, setMovimientos] = useState<BankMovementResponse[]>([]);
  const [isMovementsLoading, setIsMovementsLoading] = useState(true);
  const [showBalances, setShowBalances] = useState(true);

  // NUEVO ESTADO PARA PREVENIR EL CIERRE DEL MODAL MIENTRAS CARGA EL SAT
  const [isDeleting, setIsDeleting] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [movementFilter, setMovementFilter] = useState<
    "all" | "egreso" | "ingreso"
  >("all");

  const [selectedMovement, setSelectedMovement] =
    useState<BankMovementResponse | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDeleteMovementOpen, setIsDeleteMovementOpen] = useState(false);
  const [movementToDelete, setMovementToDelete] =
    useState<BankMovementResponse | null>(null);
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1);
  const [isManualMovementOpen, setIsManualMovementOpen] = useState(false);
  const [isPettyCashOpen, setIsPettyCashOpen] = useState(false);

  const [selectedAccount, setSelectedAccount] =
    useState<BankAccountResponse | null>(null);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isAccountDetailOpen, setIsAccountDetailOpen] = useState(false);
  const [isDeleteAccountOpen, setIsDeleteAccountOpen] = useState(false);

  // FETCH DE MOVIMIENTOS CON OPENAPI
  const fetchMovements = async () => {
    setIsMovementsLoading(true);
    try {
      const data = await FinanceService.readMovementsApiFinanceMovementsGet();
      setMovimientos(data || []);
    } catch (error) {
      toast.error("Error al cargar los movimientos financieros");
    } finally {
      setIsMovementsLoading(false);
    }
  };

  useEffect(() => {
    fetchMovements();
  }, []);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (value === "tesoreria") {
      fetchMovements();
    } else if (value === "cuentas") {
      refreshAccounts();
    }
  };

  const handleCreateAccountClick = () => {
    setSelectedAccount(null);
    setIsAccountModalOpen(true);
  };
  const handleEditAccountClick = (acc: any) => {
    setSelectedAccount(acc);
    setIsAccountModalOpen(true);
  };
  const handleViewAccountClick = (acc: any) => {
    setSelectedAccount(acc);
    setIsAccountDetailOpen(true);
  };
  const handleDeleteAccountClick = (acc: any) => {
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
      await FinanceService.conciliateMovementApiFinanceMovementsMovementIdConciliationPatch(
        movementId,
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

  const filteredMovimientos = useMemo(() => {
    let filtered = movimientos;

    if (movementFilter !== "all") {
      filtered = filtered.filter((m) => m.tipo === movementFilter);
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
  }, [movimientos, movementFilter, searchTerm]);

  const stats = {
    total_ingresos: movimientos
      .filter((m) => m.tipo === "ingreso")
      .reduce((acc, curr) => acc + curr.monto, 0),
    total_egresos: movimientos
      .filter((m) => m.tipo === "egreso")
      .reduce((acc, curr) => acc + curr.monto, 0),
    conciliados: movimientos.filter((m) => m.conciliado).length,
    pendientes: movimientos.filter((m) => !m.conciliado).length,
  };

  return (
    <div className="p-4 md:p-8 space-y-8 animate-page-enter pb-20">
      <PageHeader
        title="Gestión de Tesorería"
        description="Registro de detalles financiera, flujo de efectivo y administración de cuentas bancarias."
        icon={<Landmark className="h-8 w-8" />}
      />

      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="w-full"
      >
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6 w-full">
          <TabsList className="bg-slate-100/50 dark:bg-slate-900/50 backdrop-blur-md p-1 h-14 rounded-xl border border-slate-200/50 dark:border-white/10 w-full sm:w-auto inline-flex overflow-x-auto">
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

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Button
              onClick={() => setIsPettyCashOpen(true)}
              variant="outline"
              className="rounded-xl shadow-sm h-12 px-5 border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 font-bold tracking-wide w-full sm:w-auto"
            >
              <Coins className="w-4 h-4 mr-2" /> Caja Chica
            </Button>
            <Button
              onClick={() => setIsManualMovementOpen(true)}
              className="rounded-xl shadow-md h-12 px-5 bg-brand-navy hover:bg-brand-navy/90 text-white font-bold tracking-wide w-full sm:w-auto"
            >
              <Plus className="w-4 h-4 mr-2" /> Mov. Manual
            </Button>
          </div>
        </div>

        <TabsContent value="tesoreria" className="m-0">
          <TreasuryFlowTab
            stats={stats}
            movimientos={filteredMovimientos as any}
            isMovementsLoading={isMovementsLoading}
            showBalances={showBalances}
            formatCurrency={formatCurrency}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            movementFilter={movementFilter}
            setMovementFilter={setMovementFilter}
            fetchMovements={fetchMovements}
            handleToggleConciliacion={handleToggleConciliacion}
            onViewMovement={(mov: any) => {
              setSelectedMovement(mov);
              setIsDetailModalOpen(true);
            }}
            onDeleteMovement={(mov: any) => {
              setMovementToDelete(mov);
              setDeleteStep(mov.conciliado ? 1 : 2);
              setIsDeleteMovementOpen(true);
            }}
          />
        </TabsContent>

        <TabsContent value="cuentas" className="m-0">
          <BankAccountsTab
            bankAccounts={bankAccounts as any}
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

      <BankAccountModal
        open={isAccountModalOpen}
        onOpenChange={setIsAccountModalOpen}
        account={selectedAccount as any}
      />

      <MovementDetailModal
        open={isDetailModalOpen}
        onOpenChange={setIsDetailModalOpen}
        movement={selectedMovement as any}
      />

      <ManualMovementModal
        open={isManualMovementOpen}
        onOpenChange={setIsManualMovementOpen}
        bankAccounts={bankAccounts as any}
        onSuccess={() => {
          fetchMovements();
          refreshAccounts();
        }}
      />

      <PettyCashModal
        open={isPettyCashOpen}
        onOpenChange={setIsPettyCashOpen}
        bankAccounts={bankAccounts as any}
        onSuccess={() => {
          fetchMovements();
          refreshAccounts();
        }}
      />

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
                  Soft Delete • Registros Intactos
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
          </div>
          <AlertDialogFooter className="p-6 sm:p-8 bg-muted/50 border-t border-slate-200 dark:border-white/10 shrink-0">
            <AlertDialogCancel className="rounded-xl font-bold h-11 px-6">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteAccount}
              className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold h-11 px-8"
            >
              Desactivar Cuenta
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={isDeleteMovementOpen}
        onOpenChange={(open) => {
          if (isDeleting) return; // Protege contra cierre accidental mientras procesa el SAT
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
                  Este movimiento ya fue conciliado y timbrado. ¿Estás seguro?
                  Se intentará cancelar el REP en el SAT, lo cual puede ser
                  rechazado por el SAT dependiendo de su antigüedad y tipo. En
                  caso de rechazo, el movimiento no se eliminará y se te
                  notificará para tomar acciones adicionales.
                </div>
              ) : deleteStep === 2 ? (
                <div className="p-4 bg-rose-50 border-l-4 border-rose-500 rounded-r-lg text-rose-800 font-bold">
                  CONFIRMACIÓN FINAL: Esta acción no se puede deshacer. Se
                  revertirá el saldo a la cuenta bancaria.
                </div>
              ) : (
                <>
                  Se eliminará permanentemente la transacción y se devolverá el
                  dinero a la cuenta bancaria para mantener el saldo cuadrado.
                  <strong className="text-slate-900 mt-2 block p-3 bg-muted rounded-lg border">
                    {movementToDelete?.concepto}
                  </strong>
                  {movementToDelete?.origen_modulo === "CxC" && (
                    <div className="mt-4 p-4 bg-rose-50 dark:bg-rose-950/30 border-l-4 border-rose-500 rounded-r-lg text-rose-800 font-bold text-[11px] leading-relaxed shadow-sm">
                      <AlertTriangle className="inline h-4 w-4 mr-1.5 mb-0.5 text-rose-600" />
                      ALERTA FISCAL: La Cuenta por Cobrar volverá a abrirse.
                    </div>
                  )}
                  {movementToDelete?.origen_modulo === "CxP" && (
                    <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-950/30 border-l-4 border-amber-500 rounded-r-lg text-amber-800 font-bold text-[11px] leading-relaxed shadow-sm">
                      <AlertTriangle className="inline h-4 w-4 mr-1.5 mb-0.5 text-amber-600" />
                      ALERTA: Al eliminar este pago, la Cuenta por Pagar
                      vinculada volverá a abrirse (regresando su deuda).
                    </div>
                  )}
                </>
              )}
            </AlertDialogDescription>
          </div>
          <AlertDialogFooter className="p-6 sm:p-8 bg-muted/50 border-t border-border shrink-0">
            <AlertDialogCancel
              disabled={isDeleting}
              className="rounded-xl font-bold h-11 px-6"
            >
              Cancelar
            </AlertDialogCancel>
            <Button
              disabled={isDeleting}
              onClick={async (e) => {
                e.preventDefault(); // MAGIA: Evita que el modal se cierre cortando la petición

                if (movementToDelete?.conciliado && deleteStep === 1) {
                  setDeleteStep(2);
                  return;
                }

                setIsDeleting(true);
                const toastId = toast.loading(
                  "Revirtiendo saldo y cancelando REP en el SAT...",
                );

                try {
                  // LLAMADA AL BACKEND
                  await FinanceService.deleteBankMovementApiFinanceMovementsMovementIdDelete(
                    movementToDelete!.id,
                  );

                  // Actualizar UI
                  setMovimientos((prev) =>
                    prev.filter((m) => m.id !== movementToDelete?.id),
                  );
                  refreshAccounts();

                  // Éxito
                  toast.success(
                    "Saldo devuelto a la cuenta y REP cancelado correctamente.",
                    { id: toastId },
                  );

                  // Cerramos manualmente el modal tras el éxito
                  setIsDeleteMovementOpen(false);
                  setMovementToDelete(null);
                  setDeleteStep(1);
                } catch (error: any) {
                  // Manejo de error
                  const detail =
                    error.response?.data?.detail ||
                    "Error al procesar la cancelación en el SAT";
                  toast.error(detail, { id: toastId });
                  setIsDeleteMovementOpen(false); // Cerramos para liberar la interfaz
                } finally {
                  setIsDeleting(false);
                }
              }}
              className={cn(
                "rounded-xl font-bold h-11 px-6 text-white shadow-lg flex items-center justify-center transition-colors",
                deleteStep === 2
                  ? "bg-rose-600 hover:bg-rose-700"
                  : "bg-amber-600 hover:bg-amber-700",
              )}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Procesando...
                </>
              ) : movementToDelete?.conciliado && deleteStep === 1 ? (
                "Asumir responsabilidad"
              ) : (
                "Borrar y Cancelar en SAT"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
