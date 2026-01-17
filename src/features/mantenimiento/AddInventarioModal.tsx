import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Package, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { InventoryItem, InventoryCategory } from '@/data/mantenimientoData';

interface AddInventarioModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemToEdit?: InventoryItem | null;
  onSave: (item: Omit<InventoryItem, 'id'> & { id?: string }) => void;
}

const categories: InventoryCategory[] = ['Motor', 'Frenos', 'Eléctrico', 'Suspensión', 'Transmisión', 'General'];

export function AddInventarioModal({ open, onOpenChange, itemToEdit, onSave }: AddInventarioModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<{
    sku: string;
    descripcion: string;
    categoria: InventoryCategory;
    stockActual: number;
    stockMinimo: number;
    ubicacion: string;
    precioUnitario: number;
  }>({
    sku: '',
    descripcion: '',
    categoria: 'General',
    stockActual: 0,
    stockMinimo: 0,
    ubicacion: '',
    precioUnitario: 0,
  });

  useEffect(() => {
    if (itemToEdit) {
      setFormData({
        sku: itemToEdit.sku,
        descripcion: itemToEdit.descripcion,
        categoria: itemToEdit.categoria,
        stockActual: itemToEdit.stockActual,
        stockMinimo: itemToEdit.stockMinimo,
        ubicacion: itemToEdit.ubicacion,
        precioUnitario: itemToEdit.precioUnitario,
      });
    } else {
      setFormData({
        sku: '',
        descripcion: '',
        categoria: 'General',
        stockActual: 0,
        stockMinimo: 0,
        ubicacion: '',
        precioUnitario: 0,
      });
    }
  }, [itemToEdit, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    onSave({
      ...formData,
      id: itemToEdit?.id,
    });
    
    toast.success(itemToEdit ? 'Refacción actualizada' : 'Refacción agregada', {
      description: `${formData.sku} - ${formData.descripcion}`,
    });
    
    setIsSubmitting(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {itemToEdit ? 'Editar Refacción' : 'Nueva Refacción'}
          </DialogTitle>
          <DialogDescription>
            {itemToEdit ? 'Modifica los datos de la refacción' : 'Agrega una nueva refacción al inventario'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sku">SKU *</Label>
              <Input
                id="sku"
                value={formData.sku}
                onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                placeholder="REF-001"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="categoria">Categoría</Label>
              <Select
                value={formData.categoria}
                onValueChange={(value: InventoryCategory) => setFormData(prev => ({ ...prev, categoria: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
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
              onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
              placeholder="Filtro de aceite motor"
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stockActual">Stock Actual</Label>
              <Input
                id="stockActual"
                type="number"
                min="0"
                value={formData.stockActual}
                onChange={(e) => setFormData(prev => ({ ...prev, stockActual: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stockMinimo">Stock Mínimo</Label>
              <Input
                id="stockMinimo"
                type="number"
                min="0"
                value={formData.stockMinimo}
                onChange={(e) => setFormData(prev => ({ ...prev, stockMinimo: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="precioUnitario">Precio Unit.</Label>
              <Input
                id="precioUnitario"
                type="number"
                min="0"
                step="0.01"
                value={formData.precioUnitario}
                onChange={(e) => setFormData(prev => ({ ...prev, precioUnitario: Number(e.target.value) }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ubicacion">Ubicación</Label>
            <Input
              id="ubicacion"
              value={formData.ubicacion}
              onChange={(e) => setFormData(prev => ({ ...prev, ubicacion: e.target.value }))}
              placeholder="Almacén A - Estante 3"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting} className="gap-2">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {itemToEdit ? 'Guardar Cambios' : 'Agregar Refacción'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
