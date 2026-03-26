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
import { InventoryItem } from "@/services/maintenanceService";

interface AddInventarioModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemToEdit?: InventoryItem | null;
  onSave: (item: any) => Promise<void>;
}

// 1. CORRECCIÓN: Las opciones internas deben ser en minúsculas para coincidir con el backend
const categories = [
  { value: "motor", label: "Motor" },
  { value: "frenos", label: "Frenos" },
  { value: "eléctrico", label: "Eléctrico" },
  { value: "suspensión", label: "Suspensión" },
  { value: "transmisión", label: "Transmisión" },
  { value: "general", label: "General" },
];

export function AddInventarioModal({
  open,
  onOpenChange,
  itemToEdit,
  onSave,
}: AddInventarioModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 2. CORRECCIÓN: El valor por defecto inicial ahora es minúscula
  const [formData, setFormData] = useState({
    sku: "",
    descripcion: "",
    categoria: "general",
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
        categoria: itemToEdit.categoria, // Asumimos que viene en minúscula del backend
        stock_actual: itemToEdit.stock_actual,
        stock_minimo: itemToEdit.stock_minimo,
        ubicacion: itemToEdit.ubicacion,
        precio_unitario: itemToEdit.precio_unitario,
      });
    } else {
      // 3. CORRECCIÓN: Reiniciar a minúscula
      setFormData({
        sku: "",
        descripcion: "",
        categoria: "general",
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
      // AQUÍ ESTÁ LA MAGIA: Forzamos la minúscula sin importar qué tenga el estado
      await onSave({
        ...formData,
        categoria: formData.categoria.toLowerCase(),
      });

      toast.success(
        itemToEdit ? "Refacción actualizada" : "Refacción agregada",
        {
          description: `${formData.sku} - ${formData.descripcion}`,
        },
      );

      onOpenChange(false);
    } catch (error) {
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
                disabled={!!itemToEdit}
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
                  {/* Buscamos el label bonito para mostrar */}
                  <SelectValue placeholder="Seleccione...">
                    {categories.find((c) => c.value === formData.categoria)
                      ?.label || formData.categoria}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {/* 4. CORRECCIÓN: Renderizamos usando value (minúscula) y label (mayúscula) */}
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
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
