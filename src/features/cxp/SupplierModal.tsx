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
import { Supplier } from "@/types/api.types";

interface SupplierModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier?: Supplier | null; // Si viene, es Edición. Si no, es Creación.
  onSubmit: (payload: Partial<Supplier>) => Promise<void>;
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
  onSubmit,
}: SupplierModalProps) {
  const [formData, setFormData] = useState<Partial<Supplier>>(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cargar datos al abrir (Modo Edición vs Creación)
  useEffect(() => {
    if (open) {
      if (supplier) {
        setFormData({ ...supplier });
      } else {
        setFormData({ ...emptyForm });
      }
    }
  }, [open, supplier]);

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
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-brand-dark">
            <Building2 className="h-5 w-5" />
            {supplier ? "Editar Proveedor" : "Alta de Proveedor"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* SECCIÓN 1: DATOS GENERALES */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 border-b pb-2">
              <Building2 className="h-3 w-3" /> Datos Generales
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs font-medium text-slate-700">
                  Razón Social <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={formData.razon_social || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, razon_social: e.target.value })
                  }
                  placeholder="Ej: Transportes Logísticos SA de CV"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700">
                  RFC <span className="text-red-500">*</span>
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
                  className="font-mono uppercase"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700">
                  Estatus
                </Label>
                <Select
                  value={formData.estatus}
                  onValueChange={(val: any) =>
                    setFormData({ ...formData, estatus: val })
                  }
                >
                  <SelectTrigger>
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
                <Label className="text-xs font-medium text-slate-700">
                  Tipo de Proveedor
                </Label>
                <Select
                  value={formData.tipo_proveedor || ""}
                  onValueChange={(val) =>
                    setFormData({ ...formData, tipo_proveedor: val })
                  }
                >
                  <SelectTrigger>
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
                <Label className="text-xs font-medium text-slate-700">
                  Días de Crédito
                </Label>
                <Input
                  type="number"
                  value={formData.dias_credito ?? 0}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      dias_credito: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>
          </div>

          {/* SECCIÓN 2: CONTACTO Y UBICACIÓN */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 border-b pb-2">
              <Phone className="h-3 w-3" /> Contacto y Ubicación
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700">
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
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700">
                  Teléfono
                </Label>
                <Input
                  value={formData.telefono || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, telefono: e.target.value })
                  }
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs font-medium text-slate-700">
                  Correo Electrónico
                </Label>
                <Input
                  type="email"
                  value={formData.email || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs font-medium text-slate-700">
                  Dirección
                </Label>
                <Input
                  value={formData.direccion || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, direccion: e.target.value })
                  }
                />
              </div>
            </div>
          </div>

          {/* SECCIÓN 3: DATOS BANCARIOS */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 border-b pb-2">
              <CreditCard className="h-3 w-3" /> Datos Bancarios
            </h3>
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border">
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs font-medium text-slate-700">
                  Banco
                </Label>
                <Input
                  value={formData.banco || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, banco: e.target.value })
                  }
                  className="bg-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700">
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
                  className="bg-white font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700">
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
                  className="bg-white font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="pt-4 border-t mt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-brand-navy hover:bg-brand-navy/90 text-white"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Check className="h-4 w-4 mr-2" />
            )}
            {supplier ? "Guardar Cambios" : "Registrar Proveedor"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
