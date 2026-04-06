import { useState, useMemo, useEffect } from "react";
import {
  Plus,
  Trash2,
  AlertTriangle,
  Package,
  Loader2,
  Wrench,
  Check,
  Home,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Hooks y Tipos Reales
import { useMaintenance } from "@/features/maintenance/hooks/useMaintenance";
import { useUnits } from "@/features/units/hooks/useUnits";
import { useTrips } from "@/features/trips/hooks/useTrips";
import { InventoryItem } from "@/features/inventory/types";

interface SelectedPart {
  item: InventoryItem;
  cantidad: number;
}

interface WorkOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (order: any) => Promise<boolean>; // Función del hook para crear
}

export const WorkOrderModal = ({
  open,
  onOpenChange,
  onCreate,
}: WorkOrderModalProps) => {
  // Cargar datos reales
  const { inventory, mechanics } = useMaintenance();
  const { unidades } = useUnits();
  const { trips } = useTrips(); //  Traemos los viajes para asociar gastos

  const [selectedUnit, setSelectedUnit] = useState("");
  const [selectedMechanic, setSelectedMechanic] = useState("");
  const [descripcion, setDescripcion] = useState("");

  //  OBJETIVO 4: Estados para Patio vs Ruta
  const [tipoMantenimiento, setTipoMantenimiento] = useState<"patio" | "ruta">(
    "patio",
  );
  const [selectedTrip, setSelectedTrip] = useState("");

  // Partes seleccionadas
  const [selectedParts, setSelectedParts] = useState<SelectedPart[]>([]);

  // Estado para agregar parte
  const [addingPart, setAddingPart] = useState(false);
  const [selectedSkuId, setSelectedSkuId] = useState(""); // ID del item (string temp)
  const [partQuantity, setPartQuantity] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  //  Filtrar solo los viajes de la unidad seleccionada que estén activos
  const activeTripsForUnit = useMemo(() => {
    if (!selectedUnit || !trips) return [];
    return trips.filter(
      (t: any) =>
        t.status !== "cerrado" &&
        t.status !== "liquidado" &&
        t.legs?.some((l: any) => String(l.unit_id) === selectedUnit),
    );
  }, [trips, selectedUnit]);

  // Limpiar el viaje si cambian la unidad
  useEffect(() => {
    setSelectedTrip("");
  }, [selectedUnit]);

  // Filtrar partes disponibles (que no hayan sido seleccionadas ya)
  const availableParts = useMemo(() => {
    const usedIds = selectedParts.map((p) => p.item.id);
    return inventory.filter((item) => !usedIds.includes(item.id));
  }, [selectedParts, inventory]);

  const totalDeduction = useMemo(() => {
    return selectedParts.reduce((sum, p) => sum + p.cantidad, 0);
  }, [selectedParts]);

  const handleAddPart = () => {
    const item = inventory.find((i) => i.id.toString() === selectedSkuId);
    if (item && partQuantity > 0) {
      setSelectedParts([...selectedParts, { item, cantidad: partQuantity }]);
      setSelectedSkuId("");
      setPartQuantity(1);
      setAddingPart(false);
    }
  };

  const handleRemovePart = (itemId: number) => {
    setSelectedParts(selectedParts.filter((p) => p.item.id !== itemId));
  };

  const handleUpdateQuantity = (itemId: number, newQuantity: number) => {
    if (newQuantity < 1) return;
    setSelectedParts(
      selectedParts.map((p) =>
        p.item.id === itemId ? { ...p, cantidad: newQuantity } : p,
      ),
    );
  };

  const handleClose = () => {
    setSelectedUnit("");
    setSelectedMechanic("");
    setDescripcion("");
    setSelectedParts([]);
    setAddingPart(false);
    setSelectedSkuId("");
    setPartQuantity(1);
    setIsSubmitting(false);
    setTipoMantenimiento("patio");
    setSelectedTrip("");
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (!selectedUnit || !descripcion) return;

    // Validación extra para Auxilio en Ruta
    if (tipoMantenimiento === "ruta" && !selectedTrip) {
      toast.error("Dato Faltante", {
        description:
          "Debes seleccionar el viaje afectado para el auxilio en ruta.",
      });
      return;
    }

    setIsSubmitting(true);

    // Preparar payload para el backend con las nuevas columnas
    const payload = {
      unit_id: parseInt(selectedUnit),
      mechanic_id: selectedMechanic ? parseInt(selectedMechanic) : undefined,
      descripcion_problema: descripcion,
      tipo_mantenimiento: tipoMantenimiento,
      trip_id:
        selectedTrip && tipoMantenimiento === "ruta"
          ? parseInt(selectedTrip)
          : undefined,
      parts: selectedParts.map((p) => ({
        inventory_item_id: p.item.id,
        cantidad: p.cantidad,
      })),
    };

    const success = await onCreate(payload);

    setIsSubmitting(false);
    if (success) {
      handleClose();
    }
  };

  const isValid =
    selectedUnit &&
    descripcion.trim().length > 0 &&
    (tipoMantenimiento === "patio" || selectedTrip !== "");

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen && !isSubmitting) handleClose();
      }}
    >
      <DialogContent className="w-[95vw] sm:max-w-2xl flex-col max-h-[90vh] overflow-hidden p-0 border-none shadow-2xl animate-modal-show bg-slate-50/50 dark:bg-transparent backdrop-blur-xl rounded-2xl">
        {/*  HEADER TAHOE */}
        <DialogHeader className="p-6 sm:px-8 sm:py-6 bg-brand-navy/95 dark:bg-slate-900 backdrop-blur-md shrink-0 border-b border-white/10 relative overflow-hidden z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
          <div className="relative z-10 flex items-center gap-4 sm:gap-5">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-blue-500/20 flex items-center justify-center shadow-inner shrink-0 icon-plate">
              <Wrench className="h-7 w-7 sm:h-8 sm:w-8 text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.4)]" />
            </div>
            <div className="flex flex-col gap-1 text-left">
              <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-white text-shadow-premium heading-crisp leading-none">
                Abrir Orden de Trabajo
              </DialogTitle>
              <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-brand-secondary dark:text-slate-400 mt-1">
                Generar ticket de servicio y descontar inventario
              </p>
            </div>
          </div>
        </DialogHeader>

        {/*  BODY */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar">
          <div className="space-y-8">
            {/* Información Base */}
            <div className="space-y-6">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500 flex items-center gap-2 border-b border-slate-200 dark:border-white/10 pb-2">
                <Wrench className="h-3.5 w-3.5 text-blue-500" />
                Datos Generales
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Unit Selection */}
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 transition-colors duration-300">
                    Unidad *
                  </Label>
                  <Select
                    value={selectedUnit}
                    onValueChange={setSelectedUnit}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger className="h-11 glass-card font-black uppercase text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-sm text-brand-navy dark:text-slate-100">
                      <SelectValue placeholder="Seleccionar unidad..." />
                    </SelectTrigger>
                    <SelectContent className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-slate-200 dark:border-white/10 max-h-[40vh]">
                      {unidades.map((unit) => (
                        <SelectItem
                          key={unit.id}
                          value={unit.id.toString()}
                          className="font-bold text-xs uppercase"
                        >
                          ECO-{unit.numero_economico}
                          <span className="text-slate-400 dark:text-slate-500 ml-2 text-[10px]">
                            {unit.marca} {unit.modelo}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Mechanic Selection */}
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 transition-colors duration-300">
                    Mecánico Asignado
                  </Label>
                  <Select
                    value={selectedMechanic}
                    onValueChange={setSelectedMechanic}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger className="h-11 font-bold bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-sm text-sm">
                      <SelectValue placeholder="Seleccionar mecánico..." />
                    </SelectTrigger>
                    <SelectContent className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-slate-200 dark:border-white/10">
                      {mechanics.map((mech) => (
                        <SelectItem
                          key={mech.id}
                          value={mech.id.toString()}
                          className="font-bold text-xs"
                        >
                          {mech.nombre}
                          <span className="text-slate-400 dark:text-slate-500 ml-2 text-[10px] font-medium tracking-widest uppercase">
                            ({mech.especialidad})
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/*  OBJETIVO 4: TIPO DE MANTENIMIENTO (PATIO VS RUTA) */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-white/10 space-y-4">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                  Tipo de Gasto (Afectación Financiera) *
                </Label>
                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setTipoMantenimiento("patio");
                      setSelectedTrip("");
                    }}
                    className={cn(
                      "flex-1 h-12 gap-2 border-2",
                      tipoMantenimiento === "patio"
                        ? "border-brand-navy bg-blue-50 text-brand-navy"
                        : "border-slate-200",
                    )}
                  >
                    <Home className="h-4 w-4" /> Mantenimiento en Patio
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setTipoMantenimiento("ruta")}
                    className={cn(
                      "flex-1 h-12 gap-2 border-2",
                      tipoMantenimiento === "ruta"
                        ? "border-amber-500 bg-amber-50 text-amber-700"
                        : "border-slate-200",
                    )}
                  >
                    <MapPin className="h-4 w-4" /> Auxilio en Ruta (Viaje)
                  </Button>
                </div>

                {/* Selector de Viaje si es en Ruta */}
                {tipoMantenimiento === "ruta" && (
                  <div className="space-y-2 mt-4 animate-in fade-in slide-in-from-top-2">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-700">
                      Vincular al Viaje *
                    </Label>
                    <Select
                      value={selectedTrip}
                      onValueChange={setSelectedTrip}
                      disabled={!selectedUnit}
                    >
                      <SelectTrigger className="h-11 border-amber-200 bg-white">
                        <SelectValue
                          placeholder={
                            selectedUnit
                              ? "Selecciona el viaje afectado..."
                              : "Primero selecciona la Unidad arriba"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {activeTripsForUnit.length === 0 ? (
                          <div className="p-2 text-[10px] text-slate-500 text-center font-bold">
                            No hay viajes activos para esta unidad
                          </div>
                        ) : (
                          activeTripsForUnit.map((t: any) => (
                            <SelectItem key={t.id} value={String(t.id)}>
                              VIAJE {t.public_id || t.id} - {t.origin} a{" "}
                              {t.destination}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Issue Description */}
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 transition-colors duration-300">
                  Descripción del Problema *
                </Label>
                <Textarea
                  placeholder="Describa el problema o trabajo a realizar..."
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  rows={3}
                  className="min-h-[80px] resize-none glass-card bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-sm font-medium text-sm"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Parts Section */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-2">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500 flex items-center gap-2">
                  <Package className="h-3.5 w-3.5 text-blue-500" />
                  Refacciones Requeridas
                </h3>
                {!addingPart && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAddingPart(true)}
                    className="h-8 text-[9px] font-black uppercase tracking-widest bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/30 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                    disabled={isSubmitting}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Agregar
                  </Button>
                )}
              </div>

              {/* Add Part Form */}
              {addingPart && (
                <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 shadow-inner space-y-4 animate-in fade-in slide-in-from-top-2">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2 space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                        SKU / Refacción
                      </Label>
                      <Select
                        value={selectedSkuId}
                        onValueChange={setSelectedSkuId}
                      >
                        <SelectTrigger className="h-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-sm text-xs font-bold">
                          <SelectValue placeholder="Seleccionar del inventario..." />
                        </SelectTrigger>
                        <SelectContent className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-slate-200 dark:border-white/10 max-h-[40vh]">
                          {availableParts.length === 0 ? (
                            <div className="p-2 text-[10px] text-slate-400 text-center font-bold uppercase tracking-widest">
                              No hay refacciones disponibles
                            </div>
                          ) : (
                            availableParts.map((item) => (
                              <SelectItem
                                key={item.id}
                                value={item.id.toString()}
                                className="text-xs"
                              >
                                <div className="flex items-center justify-between w-full pr-2 gap-4">
                                  <div className="flex items-center gap-2 truncate">
                                    <span className="font-mono font-black uppercase text-brand-navy dark:text-blue-400">
                                      {item.sku}
                                    </span>
                                    <span className="text-slate-600 dark:text-slate-400 font-medium truncate hidden sm:inline-block max-w-[150px]">
                                      {item.descripcion}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    {item.stock_actual < item.stock_minimo && (
                                      <AlertTriangle className="h-3 w-3 text-rose-500" />
                                    )}
                                    <span
                                      className={cn(
                                        "text-[10px] font-mono font-bold",
                                        item.stock_actual === 0
                                          ? "text-rose-500"
                                          : "text-slate-500",
                                      )}
                                    >
                                      STOCK: {item.stock_actual}
                                    </span>
                                  </div>
                                </div>
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                        Cantidad
                      </Label>
                      <Input
                        type="number"
                        min={1}
                        value={partQuantity}
                        onChange={(e) =>
                          setPartQuantity(parseInt(e.target.value) || 1)
                        }
                        className="h-10 font-mono font-bold text-center bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-sm"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end pt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setAddingPart(false);
                        setSelectedSkuId("");
                        setPartQuantity(1);
                      }}
                      className="text-[10px] font-black uppercase tracking-widest"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddPart}
                      disabled={!selectedSkuId}
                      className="bg-brand-navy hover:bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest shadow-sm"
                    >
                      Agregar
                    </Button>
                  </div>
                </div>
              )}

              {/* Selected Parts List */}
              {selectedParts.length > 0 ? (
                <div className="space-y-3">
                  {selectedParts.map((part) => {
                    const isLowStock = part.item.stock_actual < part.cantidad;
                    return (
                      <div
                        key={part.item.id}
                        className={cn(
                          "flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border shadow-sm transition-colors",
                          isLowStock
                            ? "bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50"
                            : "bg-white dark:bg-slate-900/50 border-slate-200 dark:border-white/10",
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge
                              variant="outline"
                              className="font-mono font-bold text-[10px] bg-slate-50 dark:bg-slate-800 shadow-sm border-slate-200 dark:border-white/10"
                            >
                              {part.item.sku}
                            </Badge>
                            {isLowStock && (
                              <Badge
                                variant="destructive"
                                className="text-[9px] font-black uppercase tracking-widest bg-rose-500"
                              >
                                Stock Insuficiente
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                            {part.item.descripcion}
                          </p>
                          <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-1">
                            Disponible en almacén:{" "}
                            <span className="font-mono">
                              {part.item.stock_actual}
                            </span>
                          </p>
                        </div>

                        <div className="flex items-center gap-3 self-end sm:self-auto">
                          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-white/5">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-2">
                              CANT:
                            </span>
                            <Input
                              type="number"
                              min={1}
                              value={part.cantidad}
                              onChange={(e) =>
                                handleUpdateQuantity(
                                  part.item.id,
                                  parseInt(e.target.value) || 1,
                                )
                              }
                              className="w-16 h-8 text-center font-mono font-bold border-none shadow-none bg-white dark:bg-slate-900"
                            />
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemovePart(part.item.id)}
                            className="h-10 w-10 text-rose-500 hover:text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-900/40 rounded-lg transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 bg-slate-50 dark:bg-slate-800/30 border border-dashed border-slate-300 dark:border-white/20 rounded-xl">
                  <div className="mx-auto w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center mb-3">
                    <Package className="h-6 w-6 text-slate-400 dark:text-slate-500" />
                  </div>
                  <p className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                    No se han agregado refacciones
                  </p>
                  <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 mt-1">
                    Puede crear la orden solo con mano de obra.
                  </p>
                </div>
              )}

              {/* Deduction Warning */}
              {selectedParts.length > 0 && (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border-l-4 border-amber-500 rounded-r-xl shadow-sm flex items-start gap-3 animate-in fade-in">
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-800 dark:text-amber-400 mb-1">
                      Afectación de Inventario
                    </p>
                    <p className="text-xs font-medium text-amber-900/80 dark:text-amber-200/80 leading-snug">
                      Al confirmar esta orden, se descontarán{" "}
                      <span className="font-black text-amber-900 dark:text-amber-100">
                        {totalDeduction} refacciones
                      </span>{" "}
                      del catálogo general.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/*  FOOTER TAHOE */}
        <DialogFooter className="p-6 sm:p-8 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-t border-slate-200 dark:border-white/10 shrink-0">
          <div className="flex flex-col-reverse sm:flex-row justify-end items-stretch sm:items-center gap-3 w-full">
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={handleClose}
              disabled={isSubmitting}
              className="w-full sm:w-auto haptic-press flex-shrink-0"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="default"
              size="lg"
              disabled={!isValid || isSubmitting}
              onClick={handleSubmit}
              className="w-full sm:w-auto haptic-press flex-shrink-0 border-none bg-blue-600 hover:bg-blue-700 shadow-blue-500/20 text-white"
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              Crear Orden de Trabajo
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
