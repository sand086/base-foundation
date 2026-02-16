import { useState, useEffect } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save } from "lucide-react";
import { Mechanic } from "@/types/api.types";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mechanicToEdit?: Mechanic | null;
  onSave: (data: any) => Promise<boolean>;
}

export function MechanicFormModal({
  open,
  onOpenChange,
  mechanicToEdit,
  onSave,
}: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<Mechanic>>({
    nombre: "",
    apellido: "",
    especialidad: "",
    telefono: "",
    email: "",
    direccion: "",
    nss: "",
    rfc: "",
    salario_base: 0,
    contacto_emergencia_nombre: "",
    contacto_emergencia_telefono: "",
    activo: true,
  });

  useEffect(() => {
    if (mechanicToEdit) {
      setFormData(mechanicToEdit);
    } else {
      setFormData({ activo: true }); // Reset
    }
  }, [mechanicToEdit, open]);

  const handleChange = (field: keyof Mechanic, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const success = await onSave(formData);
      if (success) onOpenChange(false);
    } catch (error) {
      toast.error("Error al guardar");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mechanicToEdit ? "Editar Mecánico" : "Nuevo Mecánico"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="datos" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="datos">Datos Personales</TabsTrigger>
              <TabsTrigger value="laboral">Laboral</TabsTrigger>
              <TabsTrigger value="emergencia">Emergencia</TabsTrigger>
            </TabsList>

            {/* TAB: DATOS PERSONALES */}
            <TabsContent value="datos" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nombre *</Label>
                  <Input
                    value={formData.nombre || ""}
                    onChange={(e) => handleChange("nombre", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Apellido</Label>
                  <Input
                    value={formData.apellido || ""}
                    onChange={(e) => handleChange("apellido", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Teléfono</Label>
                  <Input
                    value={formData.telefono || ""}
                    onChange={(e) => handleChange("telefono", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={formData.email || ""}
                    onChange={(e) => handleChange("email", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Dirección</Label>
                <Input
                  value={formData.direccion || ""}
                  onChange={(e) => handleChange("direccion", e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Fecha Nacimiento</Label>
                  <Input
                    type="date"
                    value={formData.fecha_nacimiento?.split("T")[0] || ""}
                    onChange={(e) =>
                      handleChange("fecha_nacimiento", e.target.value)
                    }
                  />
                </div>
              </div>
            </TabsContent>

            {/* TAB: LABORAL */}
            <TabsContent value="laboral" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Especialidad</Label>
                  <Input
                    value={formData.especialidad || ""}
                    onChange={(e) =>
                      handleChange("especialidad", e.target.value)
                    }
                    placeholder="Ej. Diesel, Eléctrico"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fecha Contratación</Label>
                  <Input
                    type="date"
                    value={formData.fecha_contratacion?.split("T")[0] || ""}
                    onChange={(e) =>
                      handleChange("fecha_contratacion", e.target.value)
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>NSS (Seguro Social)</Label>
                  <Input
                    value={formData.nss || ""}
                    onChange={(e) => handleChange("nss", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>RFC</Label>
                  <Input
                    value={formData.rfc || ""}
                    onChange={(e) => handleChange("rfc", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Salario Base Mensual</Label>
                <Input
                  type="number"
                  value={formData.salario_base || 0}
                  onChange={(e) =>
                    handleChange("salario_base", parseFloat(e.target.value))
                  }
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <Switch
                  checked={formData.activo}
                  onCheckedChange={(checked) => handleChange("activo", checked)}
                />
                <Label>Mecánico Activo (Disponible para órdenes)</Label>
              </div>
            </TabsContent>

            {/* TAB: EMERGENCIA */}
            <TabsContent value="emergencia" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Nombre Contacto Emergencia</Label>
                <Input
                  value={formData.contacto_emergencia_nombre || ""}
                  onChange={(e) =>
                    handleChange("contacto_emergencia_nombre", e.target.value)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Teléfono Emergencia</Label>
                <Input
                  value={formData.contacto_emergencia_telefono || ""}
                  onChange={(e) =>
                    handleChange("contacto_emergencia_telefono", e.target.value)
                  }
                />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              Guardar Mecánico
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
