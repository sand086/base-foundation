import { useState, useMemo, useEffect } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge } from "@/components/ui/status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  Landmark,
  MoreHorizontal,
  Trash2,
  Eye,
  EyeOff,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  Clock,
  TrendingUp,
  TrendingDown,
  Loader2,
  Wallet,
  Edit,
  PlusCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

import axiosClient from "@/api/axiosClient";
import { toast } from "sonner";
import { MovementDetailModal } from "@/features/treasury/components/MovementDetailModal";

// 🎯 IMPORTAMOS LOS NUEVOS MODALES UNIFICADOS
import { BankAccountModal } from "@/features/treasury/components/BankAccountModal";
import { BankAccountDetailModal } from "@/features/treasury/components/BankAccountDetailModal";

import { BankMovement, BankAccount } from "@/features/treasury/types";
import { useBankAccounts } from "@/features/treasury/hooks/useBankAccounts";

const bankLogos: Record<string, string> = {
  Banamex: "🏛️",
  Santander: "🏦",
  Banorte: "💳",
  BBVA: "🏧",
  HSBC: "🦁",
  Scotiabank: "🍁",
};

export default function Treasury() {
  const {
    bankAccounts,
    isLoading: isAccountsLoading,
    refresh: refreshAccounts,
    deleteAccount,
  } = useBankAccounts();

  const [movimientos, setMovimientos] = useState<BankMovement[]>([]);
  const [isMovementsLoading, setIsMovementsLoading] = useState(true);
  const [showBalances, setShowBalances] = useState(true);

  // States Modal Movimientos
  const [selectedMovement, setSelectedMovement] = useState<BankMovement | null>(
    null,
  );
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDeleteMovementOpen, setIsDeleteMovementOpen] = useState(false);
  const [movementToDelete, setMovementToDelete] = useState<BankMovement | null>(
    null,
  );
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1);

  // 🎯 STATES PARA CRUD DE CUENTAS BANCARIAS
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(
    null,
  );
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false); // Para CREAR o EDITAR
  const [isAccountDetailOpen, setIsAccountDetailOpen] = useState(false); // Para VER DETALLES
  const [isDeleteAccountOpen, setIsDeleteAccountOpen] = useState(false); // Para ELIMINAR

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

  const getMovimientosByTipo = (tipo: "operativa" | "cobranza" | "all") => {
    if (tipo === "all") return movimientos;
    const accountNumbers =
      tipo === "operativa"
        ? operativaAccounts.map((a) => a.numero_cuenta)
        : cobranzaAccounts.map((a) => a.numero_cuenta);
    return movimientos.filter((m) =>
      accountNumbers.includes(m.cuenta_bancaria),
    );
  };

  const stats = useMemo(() => {
    const conciliados = movimientos.filter((m) => m.conciliado).length;
    const pendientes = movimientos.filter((m) => !m.conciliado).length;
    const total_ingresos = movimientos
      .filter((m) => m.tipo === "ingreso")
      .reduce((sum, m) => sum + m.monto, 0);
    const totalEgresos = movimientos
      .filter((m) => m.tipo === "egreso")
      .reduce((sum, m) => sum + m.monto, 0);
    return { conciliados, pendientes, total_ingresos, totalEgresos };
  }, [movimientos]);

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

  // 🎯 FUNCIONES CRUD DE CUENTAS BANCARIAS
  const handleCreateAccountClick = () => {
    setSelectedAccount(null); // NULL = MODO CREAR
    setIsAccountModalOpen(true);
  };

  const handleEditAccountClick = (account: BankAccount) => {
    setSelectedAccount(account); // CON DATOS = MODO EDITAR
    setIsAccountModalOpen(true);
  };

  const handleViewAccountClick = (account: BankAccount) => {
    setSelectedAccount(account);
    setIsAccountDetailOpen(true); // VER DETALLES
  };

  const handleDeleteAccountClick = (account: BankAccount) => {
    setSelectedAccount(account);
    setIsDeleteAccountOpen(true); // ELIMINAR CON ALERT DIALOG
  };

  const confirmDeleteAccount = async () => {
    if (!selectedAccount) return;
    const success = await deleteAccount(selectedAccount.id);
    if (success) {
      setIsDeleteAccountOpen(false);
      setSelectedAccount(null);
    }
  };

  const renderMovimientosTable = (tipo: "operativa" | "cobranza" | "all") => {
    const filteredMovimientos = getMovimientosByTipo(tipo);
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50/50">
            <tr>
              <th className="px-4 py-3 text-left font-bold text-xs uppercase tracking-wider text-slate-500 w-12 rounded-tl-xl">
                Conc.
              </th>
              <th className="px-4 py-3 text-left font-bold text-xs uppercase tracking-wider text-slate-500">
                Fecha
              </th>
              <th className="px-4 py-3 text-left font-bold text-xs uppercase tracking-wider text-slate-500">
                Concepto
              </th>
              <th className="px-4 py-3 text-left font-bold text-xs uppercase tracking-wider text-slate-500">
                Origen
              </th>
              <th className="px-4 py-3 text-left font-bold text-xs uppercase tracking-wider text-slate-500">
                Banco
              </th>
              <th className="px-4 py-3 text-right font-bold text-xs uppercase tracking-wider text-slate-500">
                Monto
              </th>
              <th className="px-4 py-3 text-center font-bold text-xs uppercase tracking-wider text-slate-500 w-20 rounded-tr-xl">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredMovimientos.map((mov) => (
              <tr
                key={mov.id}
                className={`hover:bg-slate-50 transition-colors ${mov.tipo === "egreso" ? "bg-red-50/10" : "bg-emerald-50/10"}`}
              >
                <td className="px-4 py-3">
                  <Checkbox
                    checked={mov.conciliado}
                    onCheckedChange={() => handleToggleConciliacion(mov.id)}
                    className={
                      mov.conciliado
                        ? "data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                        : "border-slate-300"
                    }
                  />
                </td>
                <td className="px-4 py-3 text-slate-500 font-medium">
                  {mov.fecha}
                </td>
                <td className="px-4 py-3 max-w-[250px]">
                  <p
                    className="font-bold text-slate-700 truncate"
                    title={mov.concepto}
                  >
                    {mov.concepto}
                  </p>
                  <p className="text-[10px] text-slate-600 font-mono mt-0.5">
                    REF: {mov.referencia_bancaria}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge
                    status={
                      mov.origen_modulo === "CxC"
                        ? "success"
                        : mov.origen_modulo === "CxP"
                          ? "danger"
                          : "info"
                    }
                  >
                    {mov.origen_modulo}
                  </StatusBadge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl leading-none">
                      {bankLogos[mov.banco] || "🏦"}
                    </span>
                    <span className="text-sm font-medium text-slate-600">
                      {mov.banco}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <span
                    className={`font-black font-mono ${mov.tipo === "ingreso" ? "text-emerald-600" : "text-red-600"}`}
                  >
                    {mov.tipo === "ingreso" ? "+" : "-"}$
                    {mov.monto.toLocaleString("es-MX", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-600 hover:text-brand-navy"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="rounded-xl shadow-lg border-slate-200 p-1"
                    >
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedMovement(mov);
                          setIsDetailModalOpen(true);
                        }}
                        className="gap-2 cursor-pointer font-medium text-slate-600 rounded-lg"
                      >
                        <Eye className="h-4 w-4 text-slate-600" /> Ver Detalle
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="my-1" />
                      <DropdownMenuItem
                        onClick={() => {
                          setMovementToDelete(mov);
                          setDeleteStep(mov.conciliado ? 1 : 2);
                          setIsDeleteMovementOpen(true);
                        }}
                        className="gap-2 text-red-600 cursor-pointer font-bold rounded-lg focus:bg-red-50 focus:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" /> Eliminar Transacción
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredMovimientos.length === 0 && !isMovementsLoading && (
          <div className="p-12 text-center text-slate-600 flex flex-col items-center gap-2">
            <Landmark className="h-10 w-10 opacity-20" />
            <span className="font-bold">No hay movimientos registrados</span>
          </div>
        )}
        {isMovementsLoading && (
          <div className="p-12 flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-brand-navy/50" />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50/50 min-h-[calc(100vh-64px)] pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <PageHeader
          title="Tesorería Corporativa"
          description="Auditoría financiera, cuentas bancarias y flujo de efectivo"
        />
        <div className="flex items-center gap-3">
          {/* 🎯 BOTÓN MASTER DE CREAR (Controla el modal BankAccountModal en modo null) */}
          <Button
            onClick={handleCreateAccountClick}
            className="h-10 gap-2 text-xs bg-brand-navy hover:bg-brand-navy/90 text-white font-bold rounded-xl shadow-lg shadow-brand-navy/20"
          >
            <PlusCircle className="h-4 w-4" /> Nueva Cuenta
          </Button>

          <Button
            variant="outline"
            onClick={() => setShowBalances(!showBalances)}
            className="h-10 gap-2 text-xs font-bold rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 bg-white"
          >
            {showBalances ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
            {showBalances ? "Ocultar Saldos" : "Mostrar Saldos"}
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
          <Wallet className="h-4 w-4 text-brand-navy" /> Cuentas Bancarias
          Activas
        </h3>

        {isAccountsLoading ? (
          <div className="flex items-center justify-center p-8 bg-white/50 rounded-2xl border border-slate-200 border-dashed">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : bankAccounts.length === 0 ? (
          <div className="text-center p-8 bg-white/50 rounded-2xl border border-slate-200 border-dashed text-slate-500 text-sm font-bold">
            No hay cuentas registradas. Crea una para comenzar.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {bankAccounts.map((account) => (
              <Card
                key={account.id}
                className="border-slate-200 shadow-sm hover:shadow-md transition-shadow bg-white rounded-2xl overflow-hidden relative group"
              >
                <div
                  className={cn(
                    "absolute top-0 left-0 w-1.5 h-full",
                    account.tipo_cuenta === "operativa"
                      ? "bg-red-500"
                      : "bg-emerald-500",
                  )}
                />

                {/* 🎯 MENÚ DE ACCIONES DE LA TARJETA */}
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-brand-navy bg-white shadow-sm border border-slate-100 rounded-lg"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="rounded-xl shadow-lg border-slate-200 p-1 min-w-[160px]"
                    >
                      <DropdownMenuItem
                        onClick={() => handleViewAccountClick(account)}
                        className="gap-2 cursor-pointer font-medium text-slate-600 rounded-lg"
                      >
                        <Eye className="h-4 w-4 text-slate-500" /> Ver Detalles
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleEditAccountClick(account)}
                        className="gap-2 cursor-pointer font-medium text-slate-600 rounded-lg"
                      >
                        <Edit className="h-4 w-4 text-slate-500" /> Editar
                        Cuenta
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="my-1" />
                      <DropdownMenuItem
                        onClick={() => handleDeleteAccountClick(account)}
                        className="gap-2 text-red-600 cursor-pointer font-bold rounded-lg focus:bg-red-50 focus:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" /> Eliminar Cuenta
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <CardContent className="p-5 flex flex-col justify-between h-full pt-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl leading-none bg-slate-50 p-2 rounded-xl border border-slate-100">
                        {account.banco_logo || "🏦"}
                      </div>
                      <div>
                        <h4 className="font-black text-slate-800 uppercase tracking-tight text-sm pr-8">
                          {account.alias}
                        </h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          {account.banco} • {account.moneda}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[9px] uppercase font-black tracking-widest border-none shadow-sm",
                        account.tipo_cuenta === "operativa"
                          ? "bg-red-50 text-red-600"
                          : "bg-emerald-50 text-emerald-600",
                      )}
                    >
                      {account.tipo_cuenta}
                    </Badge>
                  </div>
                  <div className="space-y-1 mt-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Saldo Disponible
                    </p>
                    <p className="text-2xl font-mono font-black text-slate-800">
                      {showBalances
                        ? `$${(account.saldo || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`
                        : "••••••••"}
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-[10px] font-bold text-slate-500 font-mono">
                    <span>
                      CLABE:{" "}
                      {account.clabe ? `...${account.clabe.slice(-4)}` : "S/N"}
                    </span>
                    <span>CTA: *{account.numero_cuenta.slice(-4)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
        <Card className="border-none shadow-sm rounded-2xl hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] uppercase tracking-widest font-black text-emerald-600 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Total Ingresos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-black font-mono text-emerald-600">
              {showBalances
                ? `+$${stats.total_ingresos.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`
                : "••••••••"}
            </p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm rounded-2xl hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] uppercase tracking-widest font-black text-red-600 flex items-center gap-2">
              <TrendingDown className="h-4 w-4" /> Total Egresos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-black font-mono text-red-600">
              {showBalances
                ? `-$${stats.totalEgresos.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`
                : "••••••••"}
            </p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm rounded-2xl hover:shadow-md transition-shadow bg-emerald-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] uppercase tracking-widest font-black text-emerald-700 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" /> Conciliados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-black text-emerald-700">
              {stats.conciliados}{" "}
              <span className="text-xs font-bold opacity-50 uppercase tracking-wide">
                Transacciones
              </span>
            </p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm rounded-2xl hover:shadow-md transition-shadow bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] uppercase tracking-widest font-black text-amber-600 flex items-center gap-2">
              <Clock className="h-4 w-4" /> Pendientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-black text-amber-600">
              {stats.pendientes}{" "}
              <span className="text-xs font-bold opacity-50 uppercase tracking-wide">
                Por revisar
              </span>
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="bg-slate-200/50 p-1 rounded-xl h-12">
          <TabsTrigger
            value="all"
            className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg gap-2 font-bold text-slate-600 h-full"
          >
            <Landmark className="h-4 w-4" /> General
          </TabsTrigger>
          <TabsTrigger
            value="operativa"
            className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg gap-2 font-bold text-slate-600 h-full"
          >
            <ArrowDownLeft className="h-4 w-4 text-red-500" /> Operativas
            (Pagos)
          </TabsTrigger>
          <TabsTrigger
            value="cobranza"
            className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg gap-2 font-bold text-slate-600 h-full"
          >
            <ArrowUpRight className="h-4 w-4 text-emerald-500" /> Cobranza
            (Ingresos)
          </TabsTrigger>
        </TabsList>
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          <TabsContent value="all" className="m-0 border-none outline-none">
            {renderMovimientosTable("all")}
          </TabsContent>
          <TabsContent
            value="operativa"
            className="m-0 border-none outline-none"
          >
            <div className="bg-slate-50/50 border-b p-4">
              <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                🏦 Cuentas Operativas (Flujo de Salida)
              </h3>
            </div>
            {renderMovimientosTable("operativa")}
          </TabsContent>
          <TabsContent
            value="cobranza"
            className="m-0 border-none outline-none"
          >
            <div className="bg-slate-50/50 border-b p-4">
              <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                Cuentas de Cobranza (Flujo de Entrada)
              </h3>
            </div>
            {renderMovimientosTable("cobranza")}
          </TabsContent>
        </div>
      </Tabs>

      {/* 🎯 MODAL UNIFICADO (CREAR / EDITAR CUENTA) */}
      <BankAccountModal
        open={isAccountModalOpen}
        onOpenChange={setIsAccountModalOpen}
        account={selectedAccount}
      />

      {/* 🎯 MODAL DE DETALLES DE CUENTA (SOLO LECTURA) */}
      <BankAccountDetailModal
        open={isAccountDetailOpen}
        onOpenChange={setIsAccountDetailOpen}
        account={selectedAccount}
      />

      {/* 🎯 ALERT DIALOG PARA ELIMINAR CUENTA BANCARIA */}
      <AlertDialog
        open={isDeleteAccountOpen}
        onOpenChange={setIsDeleteAccountOpen}
      >
        <AlertDialogContent className="rounded-2xl border-slate-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-black flex items-center gap-2 text-slate-800">
              ¿Eliminar cuenta bancaria?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600 text-sm mt-2">
              Se eliminará la cuenta <strong>{selectedAccount?.alias}</strong>{" "}
              permanentemente. Esta acción no borrará movimientos históricos,
              pero la cuenta ya no aparecerá en el Dashboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel className="rounded-xl font-bold">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteAccount}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold"
            >
              Eliminar Cuenta
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* MODALES VIEJOS DE MOVIMIENTOS */}
      <MovementDetailModal
        open={isDetailModalOpen}
        onOpenChange={setIsDetailModalOpen}
        movement={selectedMovement}
      />

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
        <AlertDialogContent className="rounded-2xl border-slate-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-black flex items-center gap-2 text-slate-800">
              {movementToDelete?.conciliado && deleteStep === 1
                ? " Movimiento Conciliado"
                : "¿Eliminar movimiento del libro?"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600 text-sm mt-2">
              {movementToDelete?.conciliado && deleteStep === 1 ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 font-medium">
                  Este movimiento ya fue conciliado. Eliminarlo afectará el
                  saldo auditado. ¿Estás seguro?
                </div>
              ) : deleteStep === 2 ? (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 font-bold">
                  CONFIRMACIÓN FINAL: Esta acción no se puede deshacer.
                </div>
              ) : (
                <>
                  Se eliminará permanentemente la transacción:{" "}
                  <strong className="text-slate-800 block mt-1">
                    {movementToDelete?.concepto}
                  </strong>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel className="rounded-xl font-bold">
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
                  toast.success("Movimiento eliminado");
                } catch (error) {
                  toast.error("Error al eliminar el movimiento");
                } finally {
                  setIsDeleteMovementOpen(false);
                  setMovementToDelete(null);
                  setDeleteStep(1);
                }
              }}
              className={cn(
                "rounded-xl font-bold text-white",
                deleteStep === 2
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-amber-600 hover:bg-amber-700",
              )}
            >
              {movementToDelete?.conciliado && deleteStep === 1
                ? "Sí, asumir responsabilidad"
                : "Eliminar definitivamente"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
