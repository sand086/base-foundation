// src/features/cxp/SupplierModal.tsx
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
  Building2,
  CreditCard,
  MapPin,
  Phone,
  Check,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Supplier } from "../types";
import { cn } from "@/lib/utils";

interface SupplierModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier?: Supplier | null;
  defaultCredito?: number;
  onSubmit: (data: Partial<Supplier>) => Promise<void>;
}

const emptyForm: Partial<Supplier> = {
  razon_social: "",
  rfc: "",
  email: "",
  telefono: "",
  direccion: "",
  codigo_postal: "",
  contacto_principal: "",
  tipo_proveedor: "",
  categoria: "",
  banco: "",
  cuenta_bancaria: "",
  clabe: "",
  dias_credito: 0,
  limite_credito: 0,
  estatus: "activo",
};

export function SupplierModal({
  open,
  onOpenChange,
  supplier,
  defaultCredito,
  onSubmit,
}: SupplierModalProps) {
  const [formData, setFormData] = useState<Partial<Supplier>>(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditMode = !!supplier;

  useEffect(() => {
    if (open) {
      if (supplier) {
        setFormData({ ...supplier });
      } else {
        setFormData({
          ...emptyForm,
          dias_credito: defaultCredito || 0,
        });
      }
    }
  }, [open, supplier, defaultCredito]);

  const validate = () => {
    if (!formData.razon_social?.trim()) return "La Razón Social es obligatoria";
    if (!formData.rfc?.trim() || formData.rfc.length < 12)
      return "RFC inválido (Mínimo 12 caracteres)";
    if (formData.clabe && formData.clabe.length !== 18)
      return "La CLABE debe tener exactamente 18 dígitos";
    return null;
  };

  const handleSubmit = async () => {
    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      onOpenChange(false);
    } catch (e) {
      toast.error("Ocurrió un error al guardar el proveedor");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* CAPA 1: CASCARÓN TAHOE */}
      <DialogContent className="w-[95vw] sm:max-w-3xl flex flex-col max-h-[90vh] overflow-hidden p-0 border-none shadow-2xl animate-modal-show bg-card/95 backdrop-blur-xl rounded-2xl">
        {/* CAPA 2: HEADER */}
        <DialogHeader className="p-6 sm:px-8 sm:py-6 bg-card dark:bg-card border-b border-slate-200 dark:border-white/10 shrink-0 relative z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-black/5 dark:from-white/5 to-transparent pointer-events-none" />
          <div className="relative z-10 flex items-center gap-4 sm:gap-5">
            <div
              className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center shadow-inner shrink-0 icon-plate border",
                isEditMode
                  ? "bg-amber-100 dark:bg-amber-900/30 border-amber-200 dark:border-amber-500/20"
                  : "bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-white/10",
              )}
            >
              <Building2
                className={cn(
                  "h-6 w-6 drop-shadow-md",
                  isEditMode
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-slate-700 dark:text-slate-300",
                )}
              />
            </div>
            <div className="flex flex-col gap-1 text-left min-w-0">
              <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-foreground heading-crisp leading-none">
                {isEditMode ? "Editar Proveedor" : "Alta de Proveedor"}
              </DialogTitle>
              <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-1">
                Catálogo de proveedores
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* CAPA 3: BODY */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 sm:px-8 sm:pb-8 bg-muted/50 dark:bg-transparent custom-scrollbar space-y-8 mt-4">
          {/* SECCIÓN 1: DATOS GENERALES */}
          <div className="p-5 border border-slate-200 dark:border-white/10 rounded-2xl bg-card shadow-sm space-y-5">
            <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2 border-b border-slate-200 dark:border-white/10 pb-2">
              <Building2 className="h-3 w-3 text-slate-500 dark:text-slate-400" /> Datos Generales
            </h3>
            <div className="grid grid-cols-2 gap-6">
              <div className="col-span-2 space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Razón Social <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={formData.razon_social || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, razon_social: e.target.value })
                  }
                  placeholder="Ej: Transportes Logísticos SA de CV"
                  className="h-11 font-bold uppercase shadow-sm bg-card border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-100"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  RFC <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={formData.rfc || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      rfc: e.target.value.toUpperCase(),
                    })
                  }
                  placeholder="XAXX010101000"
                  maxLength={13}
                  className="font-mono uppercase font-bold h-11 shadow-sm bg-muted border-slate-200 dark:border-white/5 text-slate-800 dark:text-slate-100"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Estatus
                </Label>
                <Select
                  value={formData.estatus}
                  onValueChange={(val: any) =>
                    setFormData({ ...formData, estatus: val })
                  }
                >
                   <SelectTrigger className="h-11 font-bold shadow-sm bg-card border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="activo">Activo</SelectItem>
                    <SelectItem value="inactivo">Inactivo</SelectItem>
                    <SelectItem value="suspendido">Suspendido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Tipo de Proveedor
                </Label>
                <Select
                  value={formData.tipo_proveedor || ""}
                  onValueChange={(val) =>
                    setFormData({ ...formData, tipo_proveedor: val })
                  }
                >
                  <SelectTrigger className="h-11 font-bold shadow-sm bg-card border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-100">
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hombre_camion">Hombre-Camión</SelectItem>
                    <SelectItem value="flota">Flota</SelectItem>
                    <SelectItem value="agencia">Agencia Aduanal</SelectItem>
                    <SelectItem value="refaccionaria">
                      Refaccionaria / Taller
                    </SelectItem>
                    <SelectItem value="servicios">
                      Servicios Generales
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Días de Crédito Base
                </Label>
                <Input
                  type="number"
                  min={0}
                  value={formData.dias_credito ?? 0}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      dias_credito: parseInt(e.target.value) || 0,
                    })
                  }
                  className="h-11 font-mono font-bold shadow-sm bg-muted border-slate-200 dark:border-white/5 text-slate-800 dark:text-slate-100"
                  placeholder="Ej: 15"
                />
              </div>
            </div>
          </div>

          {/* SECCIÓN 2: CONTACTO Y UBICACIÓN */}
          <div className="p-5 border border-slate-200 dark:border-white/10 rounded-2xl bg-card shadow-sm space-y-5">
            <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2 border-b border-slate-200 dark:border-white/10 pb-2">
              <Phone className="h-3 w-3 text-slate-500 dark:text-slate-400" /> Contacto y Ubicación
            </h3>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Contacto Principal
                </Label>
                <Input
                  value={formData.contacto_principal || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      contacto_principal: e.target.value,
                    })
                  }
                  className="h-11 font-bold uppercase shadow-sm bg-card border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-100"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Teléfono
                </Label>
                <Input
                  value={formData.telefono || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, telefono: e.target.value })
                  }
                  className="h-11 font-mono font-bold shadow-sm bg-muted border-slate-200 dark:border-white/5 text-slate-800 dark:text-slate-100"
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Correo Electrónico
                </Label>
                <Input
                  type="email"
                  value={formData.email || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="h-11 font-bold shadow-sm bg-card border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-100"
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Dirección
                </Label>
                <Input
                  value={formData.direccion || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, direccion: e.target.value })
                  }
                  className="h-11 font-bold uppercase shadow-sm bg-card border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>
          </div>

          {/* SECCIÓN 3: DATOS BANCARIOS */}
          <div className="p-5 border border-slate-200 dark:border-white/10 rounded-2xl bg-card shadow-sm space-y-5">
            <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2 border-b border-slate-200 dark:border-white/10 pb-2">
              <CreditCard className="h-3 w-3 text-slate-500 dark:text-slate-400" /> Datos Bancarios
            </h3>
            <div className="grid grid-cols-2 gap-6">
              <div className="col-span-2 space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Banco
                </Label>
                <Input
                  value={formData.banco || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, banco: e.target.value })
                  }
                  className="h-11 font-bold uppercase shadow-sm bg-card border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-100"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Cuenta Bancaria
                </Label>
                <Input
                  value={formData.cuenta_bancaria || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      cuenta_bancaria: e.target.value,
                    })
                  }
                  className="h-11 font-mono font-bold shadow-sm bg-muted border-slate-200 dark:border-white/5 text-slate-800 dark:text-slate-100"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  CLABE (18 dígitos)
                </Label>
                <Input
                  value={formData.clabe || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      clabe: e.target.value.replace(/\D/g, ""),
                    })
                  }
                  maxLength={18}
                  className="h-11 font-mono font-bold tracking-widest shadow-sm bg-muted border-slate-200 dark:border-white/5 text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>
          </div>
        </div>

        {/* CAPA 5: FOOTER */}
        <DialogFooter className="p-6 sm:p-8 bg-muted/50 backdrop-blur-xl border-t border-slate-200 dark:border-white/10 shrink-0 z-10">
          <div className="flex flex-col-reverse sm:flex-row justify-end items-stretch sm:items-center gap-3 w-full">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="w-full sm:w-auto haptic-press font-black uppercase tracking-widest text-[10px]"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={cn(
                "w-full sm:w-auto haptic-press border-none text-white font-black uppercase tracking-widest text-[10px]",
                isEditMode
                  ? "bg-brand-green hover:bg-[hsl(152,100%,24%)] shadow-[0_4px_15px_rgba(0,151,64,0.3)]"
                  : "bg-brand-red hover:bg-brand-red/90 shadow-[0_4px_15px_rgba(190,8,17,0.3)]",
              )}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              {isEditMode ? "Guardar Cambios" : "Registrar Proveedor"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
