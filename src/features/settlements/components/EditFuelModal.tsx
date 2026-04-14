import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
  Truck,
  User,
  Navigation,
  DollarSign,
  Hash,
} from "lucide-react";
import { toast } from "sonner";
import { fuelService } from "@/features/settlements/services/fuelService";
import { DocumentUploadManager } from "@/components/common/DocumentUploadManager";
import { DatePicker } from "@/components/ui/date-picker";
import { cn } from "@/lib/utils";

const FormLabelBrand = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <Label
    className={cn(
      "text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1.5 block",
      className,
    )}
  >
    {children}
  </Label>
);

type ID = string | number;
type TipoCombustible = "diesel" | "urea";

interface Unit {
  id: ID;
  numero_economico?: string | null;
  capacidad_tanque_diesel?: number | null;
  capacidad_tanque_urea?: number | null;
}

interface Operator {
  id: ID;
  name?: string | null;
  nombre?: string | null;
}

interface CargaCombustible {
  id: ID;
  unit_id?: ID | null;
  operator_id?: ID | null;
  tipo_combustible?: TipoCombustible | null;
  fecha_hora?: string | null;
  precio_por_litro?: number | null;
  litros?: number | null;
  odometro?: number | null;
  estacion?: string | null;
  evidencia_url?: string | null;
  unidadId?: string;
  operadorId?: string;
  tipoCombustible?: TipoCombustible;
  fechaHora?: string;
  precioPorLitro?: number;
  evidenciaUrl?: string | null;
}

interface EditFuelModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  carga: CargaCombustible | null;
  onSave: () => void;
  units?: Unit[];
  operators?: Operator[];
}

function safeNumber(v: unknown, fallback = 0): number {
  const n = typeof v === "string" ? Number(v) : (v as number);
  return Number.isFinite(n) ? n : fallback;
}

export function EditFuelModal({
  open,
  onOpenChange,
  carga,
  onSave,
  units = [],
  operators = [],
}: EditFuelModalProps) {
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState<{
    unit_id: string;
    operator_id: string;
    tipo_combustible: TipoCombustible;
    fecha_hora: Date | undefined;
    estacion: string;
    litros: number;
    precio_por_litro: number;
    odometro: number;
    evidencia_url?: string | null;
  } | null>(null);

  useEffect(() => {
    if (!carga || !open) return;

    const unitId = String(
      carga.unit_id ?? (carga as any).unidad_id ?? carga.unidadId ?? "",
    );
    const operatorId = String(
      carga.operator_id ?? (carga as any).operador_id ?? carga.operadorId ?? "",
    );
    const tipo = (carga.tipo_combustible ??
      carga.tipoCombustible ??
      "diesel") as TipoCombustible;
    const fechaRaw = carga.fecha_hora ?? carga.fechaHora;

    setFormData({
      unit_id: unitId,
      operator_id: operatorId,
      tipo_combustible: tipo,
      fecha_hora: fechaRaw ? new Date(fechaRaw) : new Date(),
      estacion: String(carga.estacion ?? ""),
      litros: safeNumber(carga.litros, 0),
      precio_por_litro: safeNumber(
        carga.precio_por_litro ?? carga.precioPorLitro,
        0,
      ),
      odometro: safeNumber(carga.odometro, 0),
      evidencia_url: carga.evidencia_url ?? carga.evidenciaUrl ?? null,
    });
  }, [carga, open]);

  const selectedUnit = useMemo(
    () => units.find((u) => String(u.id) === String(formData?.unit_id)),
    [units, formData?.unit_id],
  );

  const tankCapacity = useMemo(() => {
    if (!selectedUnit || !formData) return 0;
    return (
      formData.tipo_combustible === "diesel"
        ? (selectedUnit.capacidad_tanque_diesel ?? 600)
        : (selectedUnit.capacidad_tanque_urea ?? 40)
    ) as number;
  }, [selectedUnit, formData]);

  const exceedsTank = useMemo(
    () =>
      formData ? formData.litros > tankCapacity && tankCapacity > 0 : false,
    [formData, tankCapacity],
  );

  const total = useMemo(
    () => (formData ? formData.litros * formData.precio_por_litro : 0),
    [formData],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!carga || !formData || !formData.fecha_hora) return;

    setIsSaving(true);
    try {
      await fuelService.update(String(carga.id), {
        ...formData,
        unit_id: Number(formData.unit_id),
        operator_id: Number(formData.operator_id),
        fecha_hora: formData.fecha_hora.toISOString(),
        capacidad_tanque_snapshot: tankCapacity,
        excede_tanque: exceedsTank,
        total,
      } as any);

      toast.success("Sincronización Exitosa", {
        description: "Los datos han sido validados y guardados.",
      });
      onSave();
      onOpenChange(false);
    } catch (err) {
      toast.error("Error Crítico", {
        description: "Fallo en la comunicación con el servidor de carga.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!carga || !formData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* CAPA 1: CASCARÓN TAHOE */}
      <DialogContent className="w-[95vw] sm:max-w-3xl flex flex-col max-h-[90vh] overflow-hidden p-0 border-none shadow-2xl animate-modal-show bg-card/95 backdrop-blur-xl rounded-2xl">
        {/* CAPA 2: HEADER */}
        <DialogHeader className="p-6 sm:px-8 sm:py-6 bg-card dark:bg-card border-b border-slate-200 dark:border-white/10 shrink-0 relative z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-black/5 dark:from-white/5 to-transparent pointer-events-none" />
          <div className="relative z-10 flex items-center gap-4 sm:gap-5">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-inner shrink-0 icon-plate border bg-amber-100 dark:bg-amber-900/30 border-amber-200 dark:border-amber-500/20">
              <Edit className="h-6 w-6 text-amber-600 dark:text-amber-400 drop-shadow-md" />
            </div>
            <div className="flex flex-col gap-1 text-left min-w-0">
              <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-foreground heading-crisp leading-none">
                Editar Registro de Carga
              </DialogTitle>
              <DialogDescription className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-1">
                Transaction Log ID: <span className="font-mono text-foreground">#{carga.id}</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 min-h-0 overflow-hidden flex flex-col">
          {/* CAPA 3: BODY */}
          <div className="flex-1 overflow-y-auto px-6 pb-6 sm:px-8 sm:pb-8 bg-muted/50 dark:bg-transparent custom-scrollbar space-y-6 mt-4">
            {/* Fecha y Tipo */}
            <div className="p-5 border border-slate-200 dark:border-white/10 rounded-2xl bg-card shadow-sm space-y-5">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <FormLabelBrand>Timestamp Operativo</FormLabelBrand>
                  <DatePicker
                    date={formData.fecha_hora}
                    onDateChange={(d) =>
                      setFormData((p) => (p ? { ...p, fecha_hora: d } : p))
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <FormLabelBrand>Fluido Energético</FormLabelBrand>
                  <Select
                    value={formData.tipo_combustible}
                    onValueChange={(v: TipoCombustible) =>
                      setFormData((p) => (p ? { ...p, tipo_combustible: v } : p))
                    }
                  >
                    <SelectTrigger className="h-11 shadow-sm font-bold bg-card border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="diesel">
                        <div className="flex items-center gap-2">
                          <Fuel className="h-4 w-4 text-amber-500" /> DIESEL
                        </div>
                      </SelectItem>
                      <SelectItem value="urea">
                        <div className="flex items-center gap-2">
                          <Droplets className="h-4 w-4 text-blue-500" /> UREA / DEF
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {selectedUnit && (
                    <p className="text-[9px] font-black uppercase text-muted-foreground text-right mt-1">
                      Capacidad Tank:{" "}
                      <span className="text-foreground">{tankCapacity}L</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Unidad y Operador */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <FormLabelBrand>Activo de Flota</FormLabelBrand>
                  <Select
                    value={formData.unit_id}
                    onValueChange={(v) =>
                      setFormData((p) => (p ? { ...p, unit_id: v } : p))
                    }
                  >
                    <SelectTrigger className="h-11 shadow-sm font-mono font-bold bg-card border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-100">
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      {units.map((u) => (
                        <SelectItem
                          key={u.id}
                          value={String(u.id)}
                          className="font-mono"
                        >
                          {u.numero_economico || `ID-${u.id}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <FormLabelBrand>Operador Asignado</FormLabelBrand>
                  <Select
                    value={formData.operator_id}
                    onValueChange={(v) =>
                      setFormData((p) => (p ? { ...p, operator_id: v } : p))
                    }
                  >
                    <SelectTrigger className="h-11 shadow-sm font-bold uppercase text-[11px] bg-card border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-100">
                      <SelectValue placeholder="Asignar..." />
                    </SelectTrigger>
                    <SelectContent>
                      {operators.map((o) => (
                        <SelectItem key={o.id} value={String(o.id)}>
                          {o.name ?? o.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Estación */}
            <div className="space-y-1.5">
              <FormLabelBrand>Estación de Suministro</FormLabelBrand>
              <div className="relative group">
                <Navigation className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground group-focus-within:text-brand-red transition-colors" />
                <Input
                  className="h-11 pl-10 font-bold uppercase shadow-sm bg-card border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-100"
                  value={formData.estacion}
                  onChange={(e) =>
                    setFormData((p) =>
                      p ? { ...p, estacion: e.target.value } : p,
                    )
                  }
                  placeholder="Terminal de carga..."
                />
              </div>
            </div>

            {/* Métricas: Litros, Precio, Odómetro */}
            <div className="p-5 border border-slate-200 dark:border-white/10 rounded-2xl bg-card shadow-sm">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <FormLabelBrand>Volumen (L)</FormLabelBrand>
                  <Input
                    type="number"
                    className="h-11 font-mono font-bold text-center shadow-sm bg-muted border-slate-200 dark:border-white/5 text-slate-800 dark:text-slate-100"
                    value={formData.litros}
                    onChange={(e) =>
                      setFormData((p) =>
                        p ? { ...p, litros: safeNumber(e.target.value) } : p,
                      )
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <FormLabelBrand>Precio/L</FormLabelBrand>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-3.5 h-4 w-4 text-emerald-500" />
                    <Input
                      type="number"
                      className="h-11 pl-8 font-mono font-bold text-center shadow-sm bg-muted border-slate-200 dark:border-white/5 text-slate-800 dark:text-slate-100"
                      value={formData.precio_por_litro}
                      onChange={(e) =>
                        setFormData((p) =>
                          p
                            ? {
                                ...p,
                                precio_por_litro: safeNumber(e.target.value),
                              }
                            : p,
                        )
                      }
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <FormLabelBrand>Odómetro</FormLabelBrand>
                  <div className="relative">
                    <Hash className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="number"
                      className="h-11 pl-8 font-mono font-bold text-center shadow-sm bg-muted border-slate-200 dark:border-white/5 text-slate-800 dark:text-slate-100"
                      value={formData.odometro}
                      onChange={(e) =>
                        setFormData((p) =>
                          p ? { ...p, odometro: safeNumber(e.target.value) } : p,
                        )
                      }
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Alerta de Exceso */}
            {exceedsTank && (
              <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl animate-pulse">
                <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
                <p className="text-[11px] font-black uppercase text-amber-700 dark:text-amber-400 leading-tight">
                  Alerta Operativa: El volumen capturado ({formData.litros}L)
                  supera la capacidad nominal configurada para esta unidad (
                  {tankCapacity}L).
                </p>
              </div>
            )}

            {/* Resumen Total */}
            <div className="p-5 bg-foreground rounded-2xl shadow-xl flex items-center justify-between transition-transform hover:scale-[1.01]">
              <div className="flex flex-col">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                  Inversión Total
                </span>
                <span className="text-2xl font-mono font-black text-background">
                  ${total.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="bg-emerald-500/20 text-emerald-500 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-500/30">
                Pesos MXN
              </div>
            </div>

            {/* Gestión de Evidencia */}
            <div className="p-5 border border-slate-200 dark:border-white/10 rounded-2xl bg-card shadow-sm">
              <FormLabelBrand className="mb-4 flex items-center gap-2">
                <Camera size={14} className="text-brand-green" /> Digitalización
                de Recurso / Ticket
              </FormLabelBrand>
              <DocumentUploadManager
                entityId={String(carga.id)}
                entityType="fuel"
                docType="ticket"
                docLabel="CAPTURA DE TICKET"
                currentUrl={formData.evidencia_url ?? undefined}
                onUploadSuccess={(url) => {
                  setFormData((p) => (p ? { ...p, evidencia_url: url } : p));
                  onSave();
                }}
              />
            </div>
          </div>

          {/* CAPA 5: FOOTER */}
          <div className="p-6 sm:p-8 bg-muted/50 backdrop-blur-xl border-t border-slate-200 dark:border-white/10 shrink-0 z-10">
            <div className="flex flex-col-reverse sm:flex-row justify-end items-stretch sm:items-center gap-3 w-full">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="w-full sm:w-auto haptic-press font-black uppercase tracking-widest text-[10px]"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="w-full sm:w-auto haptic-press border-none text-white bg-brand-green hover:bg-[hsl(152,100%,24%)] shadow-[0_4px_15px_rgba(0,151,64,0.3)] font-black uppercase tracking-widest text-[10px]"
              >
                {isSaving ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="animate-spin h-4 w-4" /> SINCRONIZANDO
                  </div>
                ) : (
                  "Guardar Cambios"
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
