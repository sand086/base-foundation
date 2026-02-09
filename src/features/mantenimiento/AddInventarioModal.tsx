import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Package, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
// Usamos el tipo REAL del servicio
import { InventoryItem } from "@/services/maintenanceService";

interface AddInventarioModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemToEdit?: InventoryItem | null;
  onSave: (item: any) => Promise<void>; // Ajustado para ser async
}

const categories = [
  "Motor",
  "Frenos",
  "Eléctrico",
  "Suspensión",
  "Transmisión",
  "General",
];

export function AddInventarioModal({
  open,
  onOpenChange,
  itemToEdit,
  onSave,
}: AddInventarioModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estado local usando snake_case para facilitar el envío
  const [formData, setFormData] = useState({
    sku: "",
    descripcion: "",
    categoria: "General",
    stock_actual: 0,
    stock_minimo: 0,
    ubicacion: "",
    precio_unitario: 0,
  });

  useEffect(() => {
    if (itemToEdit) {
      setFormData({
        sku: itemToEdit.sku,
        descripcion: itemToEdit.descripcion,
        categoria: itemToEdit.categoria,
        stock_actual: itemToEdit.stock_actual,
        stock_minimo: itemToEdit.stock_minimo,
        ubicacion: itemToEdit.ubicacion,
        precio_unitario: itemToEdit.precio_unitario,
      });
    } else {
      setFormData({
        sku: "",
        descripcion: "",
        categoria: "General",
        stock_actual: 0,
        stock_minimo: 0,
        ubicacion: "",
        precio_unitario: 0,
      });
    }
  }, [itemToEdit, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Enviamos los datos tal cual (ya están en snake_case)
      await onSave({
        ...formData,
        // Si es edición, el ID se maneja en el padre, aquí solo enviamos el payload
      });

      toast.success(
        itemToEdit ? "Refacción actualizada" : "Refacción agregada",
        {
          description: `${formData.sku} - ${formData.descripcion}`,
        },
      );

      onOpenChange(false);
    } catch (error) {
      // El error ya lo maneja el hook usualmente, pero por seguridad
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {itemToEdit ? "Editar Refacción" : "Nueva Refacción"}
          </DialogTitle>
          <DialogDescription>
            {itemToEdit
              ? "Modifica los datos de la refacción"
              : "Agrega una nueva refacción al inventario"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sku">SKU *</Label>
              <Input
                id="sku"
                value={formData.sku}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, sku: e.target.value }))
                }
                placeholder="REF-001"
                required
                disabled={!!itemToEdit} // SKU no editable usualmente
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="categoria">Categoría</Label>
              <Select
                value={formData.categoria}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, categoria: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="descripcion">Descripción *</Label>
            <Input
              id="descripcion"
              value={formData.descripcion}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  descripcion: e.target.value,
                }))
              }
              placeholder="Filtro de aceite motor"
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stock_actual">Stock Actual</Label>
              <Input
                id="stock_actual"
                type="number"
                min="0"
                value={formData.stock_actual}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    stock_actual: Number(e.target.value),
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stock_minimo">Stock Mínimo</Label>
              <Input
                id="stock_minimo"
                type="number"
                min="0"
                value={formData.stock_minimo}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    stock_minimo: Number(e.target.value),
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="precio_unitario">Precio Unit.</Label>
              <Input
                id="precio_unitario"
                type="number"
                min="0"
                step="0.01"
                value={formData.precio_unitario}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    precio_unitario: Number(e.target.value),
                  }))
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ubicacion">Ubicación</Label>
            <Input
              id="ubicacion"
              value={formData.ubicacion}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, ubicacion: e.target.value }))
              }
              placeholder="Almacén A - Estante 3"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting} className="gap-2">
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {itemToEdit ? "Guardar Cambios" : "Agregar Refacción"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
