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

/** =========================
 * REGLA 3: Tipografía Técnica Industrial
 * Componente local para labels estandarizados
 * ========================= */
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

/** =========================
 * Tipos y Lógica de Dominio
 * ========================= */
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
  // Fallbacks de compatibilidad
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

  // El estado de fecha_hora ahora es Date | undefined para ser compatible con el DatePicker
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

    // Normalización de datos recibidos
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
        fecha_hora: formData.fecha_hora.toISOString(),
        capacidad_tanque_snapshot: tankCapacity,
        excede_tanque: exceedsTank,
        total,
      });

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
      {/* CAPA 1 (Cascarón Tahoe) */}
      <DialogContent className="p-0 border-none sm:max-w-[650px] bg-card/90 dark:bg-card/95 backdrop-blur-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
        {/* CAPA 2 (Header Tahoe - Icon Plate) */}
        <DialogHeader className="p-6 bg-card dark:bg-card border-b border-border flex flex-row items-center gap-5 space-y-0">
          <div className="w-14 h-14 rounded-2xl bg-brand-green/10 text-brand-green flex items-center justify-center shadow-inner shrink-0">
            <Edit size={28} />
          </div>
          <div className="flex flex-col">
            <DialogTitle className="heading-crisp text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">
              Editar Registro de Carga
            </DialogTitle>
            <DialogDescription className="font-mono text-[10px] uppercase tracking-[0.2em] opacity-60">
              Transaction Log ID: #{carga.id}
            </DialogDescription>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          {/* CAPA 3 (Cuerpo/Formulario Hundido) */}
          <div className="p-6 space-y-6 bg-muted/30 dark:bg-transparent max-h-[65vh] overflow-y-auto custom-scrollbar">
            {/* Fila: Fecha y Tipo */}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <FormLabelBrand>Timestamp Operativo</FormLabelBrand>
                {/* SOLUCIÓN AL ERROR: Usamos onDateChange en lugar de setDate */}
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
                  <SelectTrigger className="h-11 bg-card border-border font-bold">
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
                        <Droplets className="h-4 w-4 text-blue-500" /> UREA /
                        DEF
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                {selectedUnit && (
                  <p className="text-[9px] font-black uppercase text-slate-400 text-right mt-1">
                    Capacidad Tank:{" "}
                    <span className="text-foreground">{tankCapacity}L</span>
                  </p>
                )}
              </div>
            </div>

            {/* Fila: Unidad y Operador */}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <FormLabelBrand>Activo de Flota</FormLabelBrand>
                <Select
                  value={formData.unit_id}
                  onValueChange={(v) =>
                    setFormData((p) => (p ? { ...p, unit_id: v } : p))
                  }
                >
                  <SelectTrigger className="h-11 bg-card border-border font-mono font-bold">
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
                  <SelectTrigger className="h-11 bg-card border-border font-black uppercase text-[11px]">
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

            {/* Estación */}
            <div className="space-y-1.5">
              <FormLabelBrand>Estación de Suministro</FormLabelBrand>
              <div className="relative group">
                <Navigation className="absolute left-3 top-3.5 h-4 w-4 text-slate-400 group-focus-within:text-brand-red transition-colors" />
                <Input
                  className="h-11 pl-10 font-black uppercase"
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
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <FormLabelBrand>Volumen (L)</FormLabelBrand>
                <Input
                  type="number"
                  className="h-11 font-mono font-bold text-center"
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
                    className="h-11 pl-8 font-mono font-bold text-center"
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
                  <Hash className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                  <Input
                    type="number"
                    className="h-11 pl-8 font-mono font-bold text-center"
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

            {/* Alerta Tahoe de Exceso */}
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

            {/* Resumen de Liquid Glass */}
            <div className="p-5 bg-slate-900 dark:bg-white rounded-2xl shadow-xl flex items-center justify-between transition-transform hover:scale-[1.01]">
              <div className="flex flex-col">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                  Inversión Total
                </span>
                <span className="text-2xl font-mono font-black text-white dark:text-slate-900">
                  ${total.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-500 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-500/30">
                Pesos MXN
              </div>
            </div>

            {/* Gestión de Evidencia */}
            <div className="p-5 bg-card rounded-2xl border border-border shadow-inner">
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

          {/* CAPA 4 (Footer / Control Bar Crystal) */}
          <div className="p-4 bg-card/80 dark:bg-card/80 backdrop-blur-md border-t border-border flex justify-end gap-3 sticky bottom-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-11 px-8 rounded-full font-black uppercase text-[10px] tracking-widest haptic-press transition-all hover:bg-slate-100 dark:hover:bg-white/5"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="h-11 px-10 rounded-full bg-brand-green hover:bg-emerald-600 text-white font-black uppercase text-[10px] tracking-widest haptic-press shadow-lg shadow-emerald-500/20"
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
        </form>
      </DialogContent>
    </Dialog>
  );
}
