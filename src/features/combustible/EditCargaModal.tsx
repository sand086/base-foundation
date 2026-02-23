// src/features/combustible/EditCargaModal.tsx
import * as React from "react";
import { useEffect, useMemo, useState } from "react";
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
import {
  Edit,
  Loader2,
  Camera,
  AlertTriangle,
  Fuel,
  Droplets,
} from "lucide-react";
import { toast } from "sonner";
import { fuelService } from "@/services/fuelService";
import { DocumentUploadManager } from "@/features/flota/DocumentUploadManager";

/** =========================
 * Tipos mínimos (ajusta a tus tipos reales si ya existen)
 * ========================= */
type ID = string | number;

type TipoCombustible = "diesel" | "urea";

type Unit = {
  id: ID;
  numero_economico?: string | null;
  placas?: string | null;
  capacidad_tanque_diesel?: number | null;
  capacidad_tanque_urea?: number | null;

  // compat opcional
  capacidadTanqueDiesel?: number | null;
  capacidadTanqueUrea?: number | null;
};

type Operator = {
  id: ID;
  name?: string | null;
  // compat opcional
  nombre?: string | null;
};

type CargaCombustible = {
  id: ID;

  // backend-style
  unit_id?: ID | null;
  operator_id?: ID | null;
  tipo_combustible?: TipoCombustible | null;
  fecha_hora?: string | null; // puede venir ISO
  precio_por_litro?: number | null;

  // frontend/legacy-style (por si llega así)
  unidadId?: string;
  operadorId?: string;
  tipoCombustible?: TipoCombustible;
  fechaHora?: string;
  precioPorLitro?: number;

  // comunes
  litros?: number | null;
  odometro?: number | null;
  estacion?: string | null;

  evidencia_url?: string | null;
  evidenciaUrl?: string | null;
};

type EditCargaModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  carga: CargaCombustible | null;
  /**
   * ✅ Recomendación senior:
   * en el padre, pásale una función que:
   * 1) vuelva a pedir la lista (fuelService.getAll())
   * 2) y actualice el state
   */
  onSave: () => void;

  // ✅ catálogos reales
  units?: Unit[];
  operators?: Operator[];
};

function toDatetimeLocal(value: string) {
  // acepta "YYYY-MM-DD HH:mm:ss" o ISO y lo deja "YYYY-MM-DDTHH:mm"
  if (!value) return "";
  const v = value.replace(" ", "T");
  return v.slice(0, 16);
}

function safeNumber(v: unknown, fallback = 0) {
  const n = typeof v === "string" ? Number(v) : (v as number);
  return Number.isFinite(n) ? n : fallback;
}

function getDieselCapacity(u?: Unit): number | null {
  if (!u) return null;
  return (u.capacidad_tanque_diesel ?? u.capacidadTanqueDiesel ?? null) as
    | number
    | null;
}
function getUreaCapacity(u?: Unit): number | null {
  if (!u) return null;
  return (u.capacidad_tanque_urea ?? u.capacidadTanqueUrea ?? null) as
    | number
    | null;
}

export function EditCargaModal({
  open,
  onOpenChange,
  carga,
  onSave,
  units = [],
  operators = [],
}: EditCargaModalProps) {
  const [isSaving, setIsSaving] = useState(false);

  /**
   * formData: ya con nombres que backend espera
   * - unit_id
   * - operator_id
   * - tipo_combustible
   * - fecha_hora
   * - litros
   * - precio_por_litro
   * - odometro
   * - estacion
   * - evidencia_url
   */
  const [formData, setFormData] = useState<{
    unit_id: string;
    operator_id: string;
    tipo_combustible: TipoCombustible;
    fecha_hora: string; // datetime-local
    estacion: string;
    litros: number;
    precio_por_litro: number;
    odometro: number;
    evidencia_url?: string | null;
  } | null>(null);

  useEffect(() => {
    if (!carga || !open) return;

    const unitId = String(
      (carga.unit_id ?? (carga as any).unidad_id ?? carga.unidadId ?? "") || "",
    );
    const operatorId = String(
      (carga.operator_id ??
        (carga as any).operador_id ??
        carga.operadorId ??
        "") ||
        "",
    );
    const tipo = (carga.tipo_combustible ??
      carga.tipoCombustible ??
      "diesel") as TipoCombustible;

    const fechaRaw = String(carga.fecha_hora ?? carga.fechaHora ?? "");
    const fechaLocal = toDatetimeLocal(fechaRaw);

    setFormData({
      unit_id: unitId,
      operator_id: operatorId,
      tipo_combustible: tipo,
      fecha_hora: fechaLocal,
      estacion: String(carga.estacion ?? ""),
      litros: safeNumber(carga.litros, 0),
      precio_por_litro: safeNumber(
        (carga.precio_por_litro ?? carga.precioPorLitro) as unknown,
        0,
      ),
      odometro: safeNumber(carga.odometro, 0),
      evidencia_url: carga.evidencia_url ?? carga.evidenciaUrl ?? null,
    });
  }, [carga, open]);

  const selectedUnit = useMemo(() => {
    if (!formData?.unit_id) return undefined;
    return units.find((u) => String(u.id) === String(formData.unit_id));
  }, [units, formData?.unit_id]);

  const tankCapacity = useMemo(() => {
    if (!selectedUnit || !formData) return 0;
    if (formData.tipo_combustible === "diesel") {
      return getDieselCapacity(selectedUnit) ?? 600;
    }
    return getUreaCapacity(selectedUnit) ?? 40;
  }, [selectedUnit, formData]);

  const exceedsTank = useMemo(() => {
    if (!formData) return false;
    return formData.litros > tankCapacity && tankCapacity > 0;
  }, [formData, tankCapacity]);

  const total = useMemo(() => {
    if (!formData) return 0;
    return (formData.litros || 0) * (formData.precio_por_litro || 0);
  }, [formData]);

  const validate = () => {
    if (!formData) return "Formulario no inicializado.";
    if (!formData.unit_id) return "Selecciona una unidad.";
    if (!formData.operator_id) return "Selecciona un operador.";
    if (!formData.fecha_hora) return "Selecciona fecha y hora.";
    if (!formData.estacion.trim()) return "Escribe la estación.";
    if (!(formData.litros > 0)) return "Los litros deben ser mayor a 0.";
    if (!(formData.precio_por_litro > 0))
      return "El precio por litro debe ser mayor a 0.";
    // puedes bloquear si excede tanque o dejarlo como warning
    return null;
  };

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    if (!carga || !formData) return;

    const error = validate();
    if (error) {
      toast.error("Validación", { description: error });
      return;
    }

    setIsSaving(true);
    try {
      // ✅ manda al backend con nombres correctos

      await fuelService.update(String(carga.id), {
        ...formData,
        // opcional: manda snapshot y flag calculados
        capacidad_tanque_snapshot: tankCapacity || null,
        excede_tanque: Boolean(exceedsTank),
        // opcional: total calculado (si tu backend lo acepta)
        total: Number(formData.litros) * Number(formData.precio_por_litro),
      });

      toast.success("Ticket actualizado");
      onSave(); // ✅ el padre refresca tabla
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error("Error al guardar cambios");
    } finally {
      setIsSaving(false);
    }
  };

  if (!carga || !formData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
              <Edit className="h-4 w-4 text-primary" />
            </div>
            Editar Ticket
            <span className="text-sm font-mono text-muted-foreground ml-2">
              #{String(carga.id)}
            </span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          {/* Fecha/Hora y Tipo */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Fecha y Hora
              </Label>
              <Input
                type="datetime-local"
                value={formData.fecha_hora}
                onChange={(e) =>
                  setFormData((p) =>
                    p ? { ...p, fecha_hora: e.target.value } : p,
                  )
                }
                required
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Tipo de Combustible
              </Label>
              <Select
                value={formData.tipo_combustible}
                onValueChange={(value: TipoCombustible) =>
                  setFormData((p) =>
                    p ? { ...p, tipo_combustible: value } : p,
                  )
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="diesel">
                    <div className="flex items-center gap-2">
                      <Fuel className="h-3.5 w-3.5 text-amber-600" />
                      Diesel
                    </div>
                  </SelectItem>
                  <SelectItem value="urea">
                    <div className="flex items-center gap-2">
                      <Droplets className="h-3.5 w-3.5 text-sky-600" />
                      Urea/DEF
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>

              {selectedUnit && (
                <p className="text-[11px] text-muted-foreground">
                  Capacidad{" "}
                  {formData.tipo_combustible === "diesel" ? "Diesel" : "Urea"}:{" "}
                  <span className="font-medium">{tankCapacity}L</span>
                </p>
              )}
            </div>
          </div>

          {/* Unidad y Operador */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Unidad
              </Label>
              <Select
                value={String(formData.unit_id)}
                onValueChange={(v) =>
                  setFormData((p) => (p ? { ...p, unit_id: v } : p))
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  {units.map((u) => (
                    <SelectItem key={String(u.id)} value={String(u.id)}>
                      {u.numero_economico ?? `Unidad ${String(u.id)}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Operador
              </Label>
              <Select
                value={String(formData.operator_id)}
                onValueChange={(v) =>
                  setFormData((p) => (p ? { ...p, operator_id: v } : p))
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  {operators.map((o) => (
                    <SelectItem key={String(o.id)} value={String(o.id)}>
                      {o.name ?? o.nombre ?? `Operador ${String(o.id)}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Estación */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Estación de Servicio
            </Label>
            <Input
              value={formData.estacion}
              onChange={(e) =>
                setFormData((p) => (p ? { ...p, estacion: e.target.value } : p))
              }
              placeholder="Nombre de la estación..."
              required
              className="h-9 text-sm"
            />
          </div>

          {/* Litros, Precio, Odómetro */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Litros
              </Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.litros}
                onChange={(e) =>
                  setFormData((p) =>
                    p ? { ...p, litros: safeNumber(e.target.value, 0) } : p,
                  )
                }
                required
                className="h-9 text-sm font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Precio/Litro
              </Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.precio_por_litro}
                onChange={(e) =>
                  setFormData((p) =>
                    p
                      ? {
                          ...p,
                          precio_por_litro: safeNumber(e.target.value, 0),
                        }
                      : p,
                  )
                }
                required
                className="h-9 text-sm font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Odómetro
              </Label>
              <Input
                type="number"
                min="0"
                value={formData.odometro}
                onChange={(e) =>
                  setFormData((p) =>
                    p ? { ...p, odometro: safeNumber(e.target.value, 0) } : p,
                  )
                }
                required
                className="h-9 text-sm font-mono"
              />
            </div>
          </div>

          {/* Alert if exceeds tank capacity */}
          {exceedsTank && (
            <div className="flex items-center gap-2 p-3 bg-status-warning-bg rounded-lg border border-status-warning-border">
              <AlertTriangle className="h-4 w-4 text-status-warning flex-shrink-0" />
              <p className="text-xs text-status-warning">
                Los litros ({formData.litros}L) exceden la capacidad del tanque
                ({tankCapacity}L).
              </p>
            </div>
          )}

          {/* Total Preview */}
          <div className="p-4 bg-muted/50 rounded-lg flex items-center justify-between">
            <span className="text-sm font-medium">Total:</span>
            <span className="text-lg font-bold">
              ${total.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN
            </span>
          </div>

          {/* ✅ HISTORIAL / UPLOAD de evidencia */}
          <div className="p-4 bg-primary/5 rounded-xl border border-primary/20">
            <Label className="text-primary font-bold flex items-center gap-2 mb-3">
              <Camera className="h-4 w-4" /> Gestión de Evidencia Digital
            </Label>

            <DocumentUploadManager
              entityId={String(carga.id)}
              entityType="fuel"
              docType="ticket"
              docLabel="Foto del Ticket"
              currentUrl={formData.evidencia_url ?? undefined}
              onUploadSuccess={(url: string) => {
                setFormData((p) => (p ? { ...p, evidencia_url: url } : p));
                onSave(); // refresca tabla para miniatura/flag
              }}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4 mr-2" />
                  Guardando...
                </>
              ) : (
                "Guardar Cambios"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
