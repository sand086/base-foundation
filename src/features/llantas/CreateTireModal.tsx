import { useEffect, useState } from "react";
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
import { CirclePlus, Pencil } from "lucide-react";
import { GlobalTire } from "./types"; // Asegúrate de importar tu tipo

const MARCAS_COMUNES = [
  "Michelin",
  "Bridgestone",
  "Continental",
  "Goodyear",
  "Pirelli",
  "Hankook",
  "Yokohama",
  "Firestone",
  "Otra",
];

interface CreateTireModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => Promise<boolean>;
  tireToEdit?: GlobalTire | null; // NUEVO: Prop opcional para edición
}

export function CreateTireModal({
  open,
  onOpenChange,
  onSubmit,
  tireToEdit,
}: CreateTireModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    codigo_interno: "",
    marca: "",
    modelo: "",
    medida: "295/80R22.5",
    dot: "",
    profundidad_original: "",
    precio_compra: "",
    fecha_compra: new Date().toISOString().split("T")[0],
    proveedor: "",
  });

  const isEditing = !!tireToEdit;

  // EFECTO: Rellenar formulario si es edición
  useEffect(() => {
    if (open) {
      if (tireToEdit) {
        setFormData({
          codigo_interno: tireToEdit.codigo_interno,
          marca: tireToEdit.marca,
          modelo: tireToEdit.modelo || "",
          medida: tireToEdit.medida || "",
          dot: tireToEdit.dot || "",
          profundidad_original:
            tireToEdit.profundidad_original?.toString() || "",
          precio_compra: tireToEdit.precio_compra?.toString() || "",
          // Formatear fecha para input date (YYYY-MM-DD)
          fecha_compra: tireToEdit.fecha_compra
            ? new Date(tireToEdit.fecha_compra).toISOString().split("T")[0]
            : new Date().toISOString().split("T")[0],
          proveedor: tireToEdit.proveedor || "",
        });
      } else {
        // Reset para crear
        setFormData({
          codigo_interno: "",
          marca: "",
          modelo: "",
          medida: "295/80R22.5",
          dot: "",
          profundidad_original: "",
          precio_compra: "",
          fecha_compra: new Date().toISOString().split("T")[0],
          proveedor: "",
        });
      }
    }
  }, [open, tireToEdit]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const prof = parseFloat(formData.profundidad_original);
      const precio = parseFloat(formData.precio_compra) || 0;

      let payload: any = {
        ...formData,
        profundidad_original: prof,
        precio_compra: precio,
      };

      // Si es creación, agregamos campos default
      if (!isEditing) {
        payload = {
          ...payload,
          profundidad_actual: prof,
          estado: "nuevo",
          estado_fisico: "buena",
        };
      }
      // Si es edición, quitamos el codigo_interno si el backend no permite editarlo
      else {
        delete payload.codigo_interno;
        // delete payload.profundidad_original; // Descomenta si NO quieres editar prof original
      }

      const success = await onSubmit(payload);
      if (success) {
        onOpenChange(false);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEditing ? (
              <Pencil className="h-5 w-5" />
            ) : (
              <CirclePlus className="h-5 w-5" />
            )}
            {isEditing ? "Editar Llanta" : "Alta de Nueva Llanta"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifica los datos generales del neumático."
              : "Registra un neumático nuevo en el inventario (Stock)."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            {/* ID / Código (Deshabilitado en Edición) */}
            <div className="space-y-2">
              <Label htmlFor="codigo">ID / Código Interno *</Label>
              <Input
                id="codigo"
                value={formData.codigo_interno}
                onChange={(e) => handleChange("codigo_interno", e.target.value)}
                required
                disabled={isEditing} // No editar ID
                className={isEditing ? "bg-muted" : ""}
              />
            </div>

            <div className="space-y-2">
              <Label>Marca *</Label>
              <Select
                value={formData.marca}
                onValueChange={(val) => handleChange("marca", val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar marca" />
                </SelectTrigger>
                <SelectContent>
                  {MARCAS_COMUNES.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="modelo">Modelo</Label>
              <Input
                id="modelo"
                value={formData.modelo}
                onChange={(e) => handleChange("modelo", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="medida">Medida</Label>
              <Input
                id="medida"
                value={formData.medida}
                onChange={(e) => handleChange("medida", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dot">DOT</Label>
              <Input
                id="dot"
                value={formData.dot}
                onChange={(e) => handleChange("dot", e.target.value)}
                maxLength={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="profundidad">Profundidad Original (mm) *</Label>
              <Input
                id="profundidad"
                type="number"
                step="0.1"
                value={formData.profundidad_original}
                onChange={(e) =>
                  handleChange("profundidad_original", e.target.value)
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="precio">Precio de Compra</Label>
              <Input
                id="precio"
                type="number"
                value={formData.precio_compra}
                onChange={(e) => handleChange("precio_compra", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="proveedor">Proveedor</Label>
              <Input
                id="proveedor"
                value={formData.proveedor}
                onChange={(e) => handleChange("proveedor", e.target.value)}
              />
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="fecha">Fecha de Compra</Label>
              <Input
                id="fecha"
                type="date"
                value={formData.fecha_compra}
                onChange={(e) => handleChange("fecha_compra", e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
