// AddTicketModal.tsx
import * as React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Fuel, Camera, CheckCircle2, Upload, Droplets } from "lucide-react";
import { cn } from "@/lib/utils";
import { PRECIOS_PROMEDIO, type TipoCombustible } from "@/data/combustibleData";

/** =========================
 * Types (ajusta a tu modelo real si ya lo tienes tipado)
 * ========================= */
type ID = string | number;

export interface Unit {
  id: ID;
  numero_economico?: string | null;
  placas?: string | null;

  // Si ya tienes campos reales, úsalos:
  capacidad_tanque_diesel?: number | null;
  capacidad_tanque_urea?: number | null;

  // Compat/legacy opcional:
  capacidadTanqueDiesel?: number | null;
  capacidadTanqueUrea?: number | null;
}

export interface Operator {
  id: ID;
  name?: string | null;

  // Compat/legacy opcional:
  nombre?: string | null;
}

export interface TicketFormData {
  unidadId: string;
  operadorId: string;
  fechaHora: string; // datetime-local (YYYY-MM-DDTHH:mm)
  estacion: string;
  tipoCombustible: TipoCombustible;
  litros: number;
  precioPorLitro: number;
  odometro: number;
  evidencia: File | null;
}

interface AddTicketModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: TicketFormData) => void;

  // ✅ Real data (viene de API)
  units: Unit[];
  operators: Operator[];
}

/** =========================
 * Helpers
 * ========================= */
function toDatetimeLocalValue(date: Date) {
  // "YYYY-MM-DDTHH:mm" local
  const pad = (n: number) => String(n).padStart(2, "0");
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  return `${y}-${m}-${d}T${hh}:${mm}`;
}

function clampFileSize(file: File, maxMB: number) {
  const maxBytes = maxMB * 1024 * 1024;
  return file.size <= maxBytes;
}

function safeNumber(value: string, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function safeInt(value: string, fallback = 0) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

function getDieselCapacity(unit: Unit): number | null {
  return unit.capacidad_tanque_diesel ?? unit.capacidadTanqueDiesel ?? null;
}

function getUreaCapacity(unit: Unit): number | null {
  return unit.capacidad_tanque_urea ?? unit.capacidadTanqueUrea ?? null;
}

export function AddTicketModal({
  open,
  onOpenChange,
  onSubmit,
  units = [],
  operators = [],
}: AddTicketModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [formData, setFormData] = useState<TicketFormData>({
    unidadId: "",
    operadorId: "",
    fechaHora: toDatetimeLocalValue(new Date()),
    estacion: "",
    tipoCombustible: "diesel",
    litros: 0,
    precioPorLitro: PRECIOS_PROMEDIO.diesel,
    odometro: 0,
    evidencia: null,
  });

  /** Reset “limpio” cuando se abre el modal (opcional pero práctico) */
  useEffect(() => {
    if (!open) return;
    setFormData((prev) => ({
      ...prev,
      fechaHora: toDatetimeLocalValue(new Date()),
    }));
  }, [open]);

  /** Default price cuando cambia el tipo */
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      precioPorLitro: PRECIOS_PROMEDIO[prev.tipoCombustible],
    }));
  }, [formData.tipoCombustible]);

  /** ✅ Unidad real para validar capacidad */
  const selectedUnit = useMemo(() => {
    if (!formData.unidadId) return undefined;
    return units.find((u) => String(u.id) === formData.unidadId);
  }, [units, formData.unidadId]);

  /**
   * Capacidad del tanque:
   * - Si tu modelo ya trae capacidad_tanque_diesel / capacidad_tanque_urea, se usa.
   * - Si no, fallback a 600/40 como indicaste.
   */
  const tankCapacity = useMemo(() => {
    if (!selectedUnit) return 0;

    if (formData.tipoCombustible === "diesel") {
      const real = getDieselCapacity(selectedUnit);
      return typeof real === "number" && real > 0 ? real : 600;
    }

    const real = getUreaCapacity(selectedUnit);
    return typeof real === "number" && real > 0 ? real : 40;
  }, [selectedUnit, formData.tipoCombustible]);

  const isOverCapacity =
    Boolean(selectedUnit) && formData.litros > tankCapacity;

  const total = useMemo(
    () => (formData.litros || 0) * (formData.precioPorLitro || 0),
    [formData.litros, formData.precioPorLitro],
  );

  const getFuelTypeStyles = (type: TipoCombustible, isSelected: boolean) => {
    if (type === "diesel") {
      return isSelected
        ? "bg-amber-500 text-white border-amber-500 shadow-md"
        : "border-amber-300 text-amber-700 hover:bg-amber-50";
    }
    return isSelected
      ? "bg-sky-500 text-white border-sky-500 shadow-md"
      : "border-sky-300 text-sky-700 hover:bg-sky-50";
  };

  const resetForm = () => {
    setFormData({
      unidadId: "",
      operadorId: "",
      fechaHora: toDatetimeLocalValue(new Date()),
      estacion: "",
      tipoCombustible: "diesel",
      litros: 0,
      precioPorLitro: PRECIOS_PROMEDIO.diesel,
      odometro: 0,
      evidencia: null,
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const validate = () => {
    if (!formData.unidadId) return "Selecciona una unidad.";
    if (!formData.operadorId) return "Selecciona un operador.";
    if (!formData.fechaHora) return "Selecciona fecha y hora.";
    if (!formData.estacion.trim()) return "Escribe la estación.";
    if (!(formData.litros > 0)) return "Los litros deben ser mayor a 0.";
    if (!(formData.precioPorLitro > 0))
      return "El precio por litro debe ser mayor a 0.";
    if (isOverCapacity)
      return `Excede capacidad del tanque (${tankCapacity}L).`;

    if (formData.evidencia) {
      const ok = clampFileSize(formData.evidencia, 5);
      if (!ok) return "La imagen excede 5MB.";
    }
    return null;
  };

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();

    const error = validate();
    if (error) {
      toast.error("Campos requeridos", { description: error });
      return;
    }

    onSubmit(formData);
    toast.success("Ticket registrado", {
      description: "Se guardó el ticket de combustible correctamente.",
    });

    resetForm();
    onOpenChange(false);
  };

  const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) {
      setFormData((p) => ({ ...p, evidencia: null }));
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Archivo inválido", {
        description: "Solo se permiten imágenes.",
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    if (!clampFileSize(file, 5)) {
      toast.error("Archivo muy grande", { description: "Máximo 5MB." });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setFormData((p) => ({ ...p, evidencia: file }));
  };

  const unitLabel = (u: Unit) => {
    const ne = (u.numero_economico ?? "").trim();
    const pl = (u.placas ?? "").trim();
    if (ne && pl) return `${ne} (${pl})`;
    if (ne) return ne;
    if (pl) return pl;
    return `Unidad ${String(u.id)}`;
  };

  const operatorLabel = (o: Operator) => {
    const n = (o.name ?? o.nombre ?? "").trim();
    return n || `Operador ${String(o.id)}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <div
              className={cn(
                "w-8 h-8 rounded flex items-center justify-center transition-colors",
                formData.tipoCombustible === "diesel"
                  ? "bg-amber-100"
                  : "bg-sky-100",
              )}
            >
              {formData.tipoCombustible === "diesel" ? (
                <Fuel className="h-4 w-4 text-amber-600" />
              ) : (
                <Droplets className="h-4 w-4 text-sky-600" />
              )}
            </div>
            Agregar Ticket de Combustible
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          {/* Fuel Type Selection - Visual Toggle */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Tipo de Combustible *
            </Label>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() =>
                  setFormData((p) => ({
                    ...p,
                    tipoCombustible: "diesel",
                    litros: 0,
                  }))
                }
                className={cn(
                  "flex items-center justify-center gap-2 py-3 px-4 rounded-lg border-2 transition-all duration-200",
                  getFuelTypeStyles(
                    "diesel",
                    formData.tipoCombustible === "diesel",
                  ),
                )}
              >
                <Fuel className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-semibold">Diesel</div>
                  <div className="text-xs opacity-80">
                    Tanque hasta{" "}
                    {selectedUnit
                      ? `${getDieselCapacity(selectedUnit) ?? 600}L`
                      : "---"}
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() =>
                  setFormData((p) => ({
                    ...p,
                    tipoCombustible: "urea",
                    litros: 0,
                  }))
                }
                className={cn(
                  "flex items-center justify-center gap-2 py-3 px-4 rounded-lg border-2 transition-all duration-200",
                  getFuelTypeStyles(
                    "urea",
                    formData.tipoCombustible === "urea",
                  ),
                )}
              >
                <Droplets className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-semibold">Urea/DEF</div>
                  <div className="text-xs opacity-80">
                    Tanque hasta{" "}
                    {selectedUnit
                      ? `${getUreaCapacity(selectedUnit) ?? 40}L`
                      : "---"}
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Unit Selection */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Unidad *
            </Label>

            <Select
              value={formData.unidadId}
              onValueChange={(value) =>
                setFormData((p) => ({ ...p, unidadId: value }))
              }
            >
              <SelectTrigger className="h-11 text-sm">
                <SelectValue placeholder="Seleccionar unidad" />
              </SelectTrigger>

              <SelectContent className="bg-popover border shadow-lg z-50">
                {units?.map((unit) => (
                  <SelectItem
                    key={String(unit.id)}
                    value={String(unit.id)}
                    className="text-sm"
                  >
                    {unitLabel(unit)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedUnit && (
              <p className="text-xs text-muted-foreground">
                Capacidad{" "}
                {formData.tipoCombustible === "diesel" ? "Diesel" : "Urea"}:{" "}
                <span className="font-medium">{tankCapacity}L</span>
              </p>
            )}
          </div>

          {/* Driver Selection */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Operador *
            </Label>

            <Select
              value={formData.operadorId}
              onValueChange={(value) =>
                setFormData((p) => ({ ...p, operadorId: value }))
              }
            >
              <SelectTrigger className="h-11 text-sm">
                <SelectValue placeholder="Seleccionar operador" />
              </SelectTrigger>

              <SelectContent className="bg-popover border shadow-lg z-50">
                {operators.map((op) => (
                  <SelectItem
                    key={String(op.id)}
                    value={String(op.id)}
                    className="text-sm"
                  >
                    {operatorLabel(op)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date/Time */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Fecha y Hora *
            </Label>
            <Input
              type="datetime-local"
              value={formData.fechaHora}
              onChange={(e) =>
                setFormData((p) => ({ ...p, fechaHora: e.target.value }))
              }
              className="h-11 text-sm"
            />
          </div>

          {/* Station Name */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Estación *
            </Label>
            <Input
              placeholder={
                formData.tipoCombustible === "diesel"
                  ? "Ej: OXXO Gas - Querétaro Norte"
                  : "Ej: AdBlue Center - Querétaro"
              }
              value={formData.estacion}
              onChange={(e) =>
                setFormData((p) => ({ ...p, estacion: e.target.value }))
              }
              className="h-11 text-sm"
            />
          </div>

          {/* Liters and Price */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Litros *
              </Label>
              <Input
                type="number"
                step="0.1"
                placeholder="0.0"
                value={formData.litros || ""}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    litros: safeNumber(e.target.value, 0),
                  }))
                }
                className={cn(
                  "h-11 text-sm",
                  isOverCapacity &&
                    "border-status-danger focus-visible:ring-status-danger",
                )}
              />
              {isOverCapacity && (
                <p className="text-xs text-status-danger">
                  ⚠️ Excede capacidad del tanque ({tankCapacity}L)
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Precio/Litro (MXN) *
              </Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.precioPorLitro || ""}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    precioPorLitro: safeNumber(e.target.value, 0),
                  }))
                }
                className="h-11 text-sm"
              />
            </div>
          </div>

          {/* Total (Auto-calculated) */}
          <div
            className={cn(
              "rounded-lg p-4 border transition-colors",
              formData.tipoCombustible === "diesel"
                ? "bg-amber-50 border-amber-200"
                : "bg-sky-50 border-sky-200",
            )}
          >
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                {formData.tipoCombustible === "diesel" ? (
                  <Fuel className="h-4 w-4 text-amber-600" />
                ) : (
                  <Droplets className="h-4 w-4 text-sky-600" />
                )}
                <span className="text-sm text-muted-foreground">
                  Total{" "}
                  {formData.tipoCombustible === "diesel" ? "Diesel" : "Urea"}:
                </span>
              </div>

              <span
                className={cn(
                  "text-xl font-bold",
                  formData.tipoCombustible === "diesel"
                    ? "text-amber-700"
                    : "text-sky-700",
                )}
              >
                $
                {total.toLocaleString("es-MX", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>

          {/* Odometer */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Lectura de Odómetro (km)
            </Label>
            <Input
              type="number"
              placeholder="Ej: 245890"
              value={formData.odometro || ""}
              onChange={(e) =>
                setFormData((p) => ({
                  ...p,
                  odometro: safeInt(e.target.value, 0),
                }))
              }
              className="h-11 text-sm"
            />
          </div>

          {/* Photo Upload */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Foto del Ticket
            </Label>

            <div className="border-2 border-dashed rounded-lg p-6 text-center hover:bg-muted/30 transition-colors cursor-pointer">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                id="ticket-photo-modal"
                onChange={handleFileChange}
              />

              <label
                htmlFor="ticket-photo-modal"
                className="cursor-pointer block"
              >
                {formData.evidencia ? (
                  <div className="flex items-center justify-center gap-2 text-status-success">
                    <CheckCircle2 className="h-6 w-6" />
                    <span className="font-medium text-sm">
                      {formData.evidencia.name}
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                      <Camera className="h-6 w-6" />
                    </div>
                    <span className="text-sm">
                      Toca para tomar foto o seleccionar archivo
                    </span>
                    <span className="text-xs text-muted-foreground">
                      JPG, PNG hasta 5MB
                    </span>
                  </div>
                )}
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-11 text-sm flex-1"
            >
              Cancelar
            </Button>

            <Button
              type="submit"
              className={cn(
                "h-11 text-sm flex-1 gap-2",
                formData.tipoCombustible === "diesel"
                  ? "bg-amber-600 hover:bg-amber-700 text-white"
                  : "bg-sky-600 hover:bg-sky-700 text-white",
              )}
            >
              <Upload className="h-4 w-4" />
              Registrar{" "}
              {formData.tipoCombustible === "diesel" ? "Diesel" : "Urea"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
