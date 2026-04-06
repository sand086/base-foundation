import { useState, useMemo, useEffect } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge } from "@/components/ui/status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Plus,
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
} from "lucide-react";
import { cn } from "@/lib/utils";

import axiosClient from "@/api/axiosClient";
import { toast } from "sonner";
import { MovementDetailModal } from "@/features/treasury/components/MovementDetailModal";

import { BankAccount, BankMovement } from "@/features/treasury/types";
const bancos = [
  "Banamex",
  "Santander",
  "Banorte",
  "BBVA",
  "HSBC",
  "Scotiabank",
];

const bankLogos: Record<string, string> = {
  Banamex: "🏛️",
  Santander: "🏦",
  Banorte: "💳",
  BBVA: "🏧",
  HSBC: "🦁",
  Scotiabank: "🍁",
};

export default function Tesoreria() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [movimientos, setMovimientos] = useState<BankMovement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [showBalances, setShowBalances] = useState(true);
  const [selectedMovement, setSelectedMovement] = useState<BankMovement | null>(
    null,
  );
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Delete States
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [movementToDelete, setMovementToDelete] = useState<BankMovement | null>(
    null,
  );
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1);

  const [formData, setFormData] = useState({
    banco: "",
    numero_cuenta: "",
    clabe: "",
    moneda: "MXN",
    alias: "",
    // Usamos el estatus temporalmente en el form para guardar si es operativa o cobranza
    // ya que BankAccount no tiene 'tipo' definido explícitamente en api.types (solo estatus).
    // NOTA: Si en BD lo guardas en una columna, se mandará aquí.
    tipo_cuenta: "operativa",
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [accRes, movRes] = await Promise.all([
        axiosClient.get<BankAccount[]>("/finance/bank-accounts"),
        axiosClient.get<BankMovement[]>("/finance/movements"),
      ]);
      setAccounts(accRes.data || []);
      setMovimientos(movRes.data || []);
    } catch (error) {
      toast.error("Error al cargar la información financiera");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  //  2. Filtros y Cálculos con snake_case
  // (Asumiendo que 'tipo' en realidad lo guardas en BD, o que lo filtras por alias/nombre)
  // Para este ejemplo, si tu base no tiene "tipo" cuenta, podrías filtrarlas por el alias
  // o modificar la tabla en postgres para que lo soporte. Asumiré que lo tienes mapeado.
  const operativaAccounts = accounts.filter(
    (a: any) => a.tipo_cuenta === "operativa" && a.estatus === "activo",
  );

  const cobranzaAccounts = accounts.filter(
    (a: any) => a.tipo_cuenta === "cobranza" && a.estatus === "activo",
  );

  const saldoOperativa = useMemo(() => {
    return operativaAccounts.reduce((sum, a) => sum + (a.saldo || 0), 0);
  }, [operativaAccounts]);

  const saldoCobranza = useMemo(() => {
    return cobranzaAccounts.reduce((sum, a) => sum + (a.saldo || 0), 0);
  }, [cobranzaAccounts]);

  const getMovimientosByTipo = (tipo: "operativa" | "cobranza" | "all") => {
    if (tipo === "all") return movimientos;

    // Obtenemos los números de cuenta (en string) de las cuentas que cumplen el criterio
    const accountNumbers =
      tipo === "operativa"
        ? operativaAccounts.map((a) => a.numero_cuenta)
        : cobranzaAccounts.map((a) => a.numero_cuenta);

    return movimientos.filter((m) =>
      accountNumbers.includes(m.cuenta_bancaria),
    );
  };

  // Stats
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

  const handleAddAccount = async () => {
    try {
      await axiosClient.post("/finance/bank-accounts", {
        banco: formData.banco,
        banco_logo: bankLogos[formData.banco] || "🏦",
        numero_cuenta: formData.numero_cuenta,
        clabe: formData.clabe,
        moneda: formData.moneda,
        alias: formData.alias,
        saldo: 0,
        estatus: "activo",
        tipo_cuenta: formData.tipo_cuenta, // Si tu backend lo soporta
      });

      await fetchData();

      setFormData({
        banco: "",
        numero_cuenta: "",
        clabe: "",
        moneda: "MXN",
        alias: "",
        tipo_cuenta: "operativa",
      });
      setIsAddModalOpen(false);
      toast.success("Cuenta bancaria agregada exitosamente");
    } catch (error) {
      toast.error("Error al guardar la cuenta bancaria");
    }
  };

  const handleToggleConciliacion = async (movementId: number) => {
    const movement = movimientos.find((m) => m.id === movementId);
    if (!movement) return;

    const newConciliado = !movement.conciliado;

    try {
      // Usamos PATCH para actualizar solo ese campo en el backend
      await axiosClient.patch(`/finance/movements/${movementId}/conciliation`, {
        conciliado: newConciliado,
        fecha_conciliacion: newConciliado
          ? new Date().toISOString().split("T")[0]
          : null,
      });

      setMovimientos(
        movimientos.map((m) =>
          m.id === movementId ? { ...m, conciliado: newConciliado } : m,
        ),
      );
      toast.success(
        `Movimiento ${newConciliado ? "conciliado" : "desconciliado"}`,
      );
    } catch (error) {
      toast.error("Error al actualizar la conciliación");
    }
  };

  const handleViewMovement = (movement: BankMovement) => {
    setSelectedMovement(movement);
    setIsDetailModalOpen(true);
  };

  const handleDeleteClick = (movement: BankMovement) => {
    setMovementToDelete(movement);
    setDeleteStep(movement.conciliado ? 1 : 2);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteMovement = async () => {
    if (!movementToDelete) return;

    if (movementToDelete.conciliado && deleteStep === 1) {
      setDeleteStep(2);
      return;
    }

    try {
      await axiosClient.delete(`/finance/movements/${movementToDelete.id}`);

      setMovimientos(movimientos.filter((m) => m.id !== movementToDelete.id));
      toast.success("Movimiento eliminado", {
        description: movementToDelete.concepto,
      });
    } catch (error) {
      toast.error("Error al eliminar el movimiento");
    } finally {
      setIsDeleteDialogOpen(false);
      setMovementToDelete(null);
      setDeleteStep(1);
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
                Origen / Módulo
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
                className={`hover:bg-slate-50 transition-colors ${
                  mov.tipo === "egreso" ? "bg-red-50/10" : "bg-emerald-50/10"
                }`}
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
                        onClick={() => handleViewMovement(mov)}
                        className="gap-2 cursor-pointer font-medium text-slate-600 rounded-lg"
                      >
                        <Eye className="h-4 w-4 text-slate-600" />
                        Ver Detalle
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="my-1" />
                      <DropdownMenuItem
                        onClick={() => handleDeleteClick(mov)}
                        className="gap-2 text-red-600 cursor-pointer font-bold rounded-lg focus:bg-red-50 focus:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                        Eliminar Transacción
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredMovimientos.length === 0 && !isLoading && (
          <div className="p-12 text-center text-slate-600 flex flex-col items-center gap-2">
            <Landmark className="h-10 w-10 opacity-20" />
            <span className="font-bold">No hay movimientos registrados</span>
            <span className="text-xs">
              Los depósitos y pagos aparecerán aquí automáticamente.
            </span>
          </div>
        )}

        {isLoading && (
          <div className="p-12 flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-brand-navy/50" />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50/50 min-h-[calc(100vh-64px)] pb-20">
      <PageHeader
        title="Tesorería Corporativa"
        description="Auditoría financiera, conciliación bancaria y flujo de efectivo"
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

      {/* Toolbar */}
      <div className="flex items-center justify-end gap-3 mt-8">
        <Button
          variant="outline"
          onClick={() => setShowBalances(!showBalances)}
          className="h-10 gap-2 text-xs font-bold rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50"
        >
          {showBalances ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
          {showBalances ? "Ocultar" : "Mostrar"} Saldos
        </Button>
        <Button
          onClick={() => setIsAddModalOpen(true)}
          className="h-10 gap-2 text-xs bg-brand-navy hover:bg-brand-navy/90 text-white font-bold rounded-xl shadow-lg shadow-brand-navy/20"
        >
          <Plus className="h-4 w-4" />
          Agregar Cuenta
        </Button>
      </div>

      {/* Tabs by Bank Type */}
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
            <ArrowDownLeft className="h-4 w-4 text-red-500" />
            Operativas (Pagos)
            <Badge
              variant="secondary"
              className="ml-1 bg-slate-100 text-slate-500 hover:bg-slate-100 font-mono"
            >
              {showBalances
                ? `$${saldoOperativa.toLocaleString("es-MX")}`
                : "•••"}
            </Badge>
          </TabsTrigger>
          <TabsTrigger
            value="cobranza"
            className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg gap-2 font-bold text-slate-600 h-full"
          >
            <ArrowUpRight className="h-4 w-4 text-emerald-500" />
            Cobranza (Ingresos)
            <Badge
              variant="secondary"
              className="ml-1 bg-slate-100 text-slate-500 hover:bg-slate-100 font-mono"
            >
              {showBalances
                ? `$${saldoCobranza.toLocaleString("es-MX")}`
                : "•••"}
            </Badge>
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

      {/* Movement Detail Modal */}
      <MovementDetailModal
        open={isDetailModalOpen}
        onOpenChange={setIsDetailModalOpen}
        movement={selectedMovement}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          setIsDeleteDialogOpen(open);
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
                ? "⚠️ Movimiento Conciliado"
                : "¿Eliminar movimiento del libro?"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600 text-sm mt-2">
              {movementToDelete?.conciliado && deleteStep === 1 ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 font-medium">
                  Este movimiento ya fue conciliado contra el estado de cuenta.
                  Eliminarlo afectará el saldo auditado y requerirá
                  justificación. ¿Estás completamente seguro?
                </div>
              ) : deleteStep === 2 ? (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 font-bold">
                  ⚠️ CONFIRMACIÓN FINAL: Esta acción no se puede deshacer y
                  borrará el rastro en el libro mayor.
                </div>
              ) : (
                <>
                  Se eliminará permanentemente el registro de la transacción:{" "}
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
              onClick={handleDeleteMovement}
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

      {/* Add Account Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-[480px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-brand-navy font-black text-xl">
              <Landmark className="h-6 w-6" />
              Alta de Cuenta Bancaria
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Institución Bancaria *
                </Label>
                <Select
                  value={formData.banco}
                  onValueChange={(value) =>
                    setFormData({ ...formData, banco: value })
                  }
                >
                  <SelectTrigger className="h-11 rounded-xl bg-slate-50">
                    <SelectValue placeholder="Seleccionar banco" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {bancos.map((banco) => (
                      <SelectItem
                        key={banco}
                        value={banco}
                        className="rounded-lg cursor-pointer"
                      >
                        <div className="flex items-center gap-2 font-medium text-slate-700">
                          <span>{bankLogos[banco]}</span>
                          {banco}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Tipo de Cuenta *
                </Label>
                <Select
                  value={formData.tipo_cuenta}
                  onValueChange={(value) =>
                    setFormData({ ...formData, tipo_cuenta: value })
                  }
                >
                  <SelectTrigger className="h-11 rounded-xl bg-slate-50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem
                      value="operativa"
                      className="rounded-lg cursor-pointer"
                    >
                      Operativa (Salidas)
                    </SelectItem>
                    <SelectItem
                      value="cobranza"
                      className="rounded-lg cursor-pointer"
                    >
                      Cobranza (Entradas)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Número de Cuenta
                </Label>
                <Input
                  placeholder="Ej: 0123456789"
                  value={formData.numero_cuenta}
                  onChange={(e) =>
                    setFormData({ ...formData, numero_cuenta: e.target.value })
                  }
                  className="h-11 font-mono text-sm rounded-xl bg-slate-50"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Divisa Base
                </Label>
                <Select
                  value={formData.moneda}
                  onValueChange={(value: "MXN" | "USD") =>
                    setFormData({ ...formData, moneda: value })
                  }
                >
                  <SelectTrigger className="h-11 rounded-xl bg-slate-50 font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem
                      value="MXN"
                      className="rounded-lg cursor-pointer font-bold text-emerald-700"
                    >
                      🇲🇽 MXN
                    </SelectItem>
                    <SelectItem
                      value="USD"
                      className="rounded-lg cursor-pointer font-bold text-blue-700"
                    >
                      🇺🇸 USD
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                CLABE Interbancaria
              </Label>
              <Input
                placeholder="18 dígitos para transferencias SPEI"
                value={formData.clabe}
                onChange={(e) =>
                  setFormData({ ...formData, clabe: e.target.value })
                }
                maxLength={18}
                className="h-11 font-mono text-sm tracking-widest rounded-xl bg-slate-50"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Alias (Identificador Interno) *
              </Label>
              <Input
                placeholder="Ej: Fiscal Banamex Principal, Nómina..."
                value={formData.alias}
                onChange={(e) =>
                  setFormData({ ...formData, alias: e.target.value })
                }
                className="h-11 text-sm rounded-xl bg-slate-50 font-bold text-slate-700"
              />
            </div>
          </div>

          <DialogFooter className="pt-6 border-t mt-2">
            <Button
              variant="ghost"
              onClick={() => setIsAddModalOpen(false)}
              className="h-11 px-6 rounded-xl font-bold text-slate-500"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAddAccount}
              className="h-11 px-8 bg-brand-navy hover:bg-brand-navy/90 text-white rounded-xl font-black shadow-lg shadow-brand-navy/20"
              disabled={
                !formData.banco || !formData.numero_cuenta || !formData.alias
              }
            >
              <Plus className="h-4 w-4 mr-2" /> Dar de Alta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
