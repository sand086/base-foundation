import { useState, useMemo } from "react";
import { Plus, Trash2, AlertTriangle, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActionButton } from "@/components/ui/action-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  mockInventory,
  mockMechanics,
  mockFleetUnits,
  InventoryItem,
} from "@/data/mantenimientoData";
import { cn } from "@/lib/utils";

interface SelectedPart {
  item: InventoryItem;
  cantidad: number;
}

interface WorkOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const WorkOrderModal = ({ open, onOpenChange }: WorkOrderModalProps) => {
  const [selectedUnit, setSelectedUnit] = useState("");
  const [selectedMechanic, setSelectedMechanic] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [selectedParts, setSelectedParts] = useState<SelectedPart[]>([]);
  const [addingPart, setAddingPart] = useState(false);
  const [selectedSku, setSelectedSku] = useState("");
  const [partQuantity, setPartQuantity] = useState(1);

  const availableParts = useMemo(() => {
    const usedIds = selectedParts.map((p) => p.item.id);
    return mockInventory.filter((item) => !usedIds.includes(item.id));
  }, [selectedParts]);

  const totalDeduction = useMemo(() => {
    return selectedParts.reduce((sum, p) => sum + p.cantidad, 0);
  }, [selectedParts]);

  const handleAddPart = () => {
    const item = mockInventory.find((i) => i.id === selectedSku);
    if (item && partQuantity > 0) {
      setSelectedParts([...selectedParts, { item, cantidad: partQuantity }]);
      setSelectedSku("");
      setPartQuantity(1);
      setAddingPart(false);
    }
  };

  const handleRemovePart = (itemId: string) => {
    setSelectedParts(selectedParts.filter((p) => p.item.id !== itemId));
  };

  const handleUpdateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    setSelectedParts(
      selectedParts.map((p) =>
        p.item.id === itemId ? { ...p, cantidad: newQuantity } : p
      )
    );
  };

  const handleClose = () => {
    setSelectedUnit("");
    setSelectedMechanic("");
    setDescripcion("");
    setSelectedParts([]);
    setAddingPart(false);
    setSelectedSku("");
    setPartQuantity(1);
    onOpenChange(false);
  };

  const handleSubmit = () => {
    // Here you would typically save the work order
    console.log({
      unit: selectedUnit,
      mechanic: selectedMechanic,
      descripcion,
      parts: selectedParts,
    });
    handleClose();
  };

  const isValid = selectedUnit && selectedMechanic && descripcion.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-800">
            <Package className="h-5 w-5" />
            Abrir Orden de Trabajo
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Unit Selection */}
          <div className="space-y-2">
            <Label htmlFor="unit">Unidad</Label>
            <Select value={selectedUnit} onValueChange={setSelectedUnit}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar unidad..." />
              </SelectTrigger>
              <SelectContent>
                {mockFleetUnits.map((unit) => (
                  <SelectItem key={unit.id} value={unit.id}>
                    <span className="font-semibold">{unit.numero}</span>
                    <span className="text-slate-500 ml-2">
                      - {unit.marca} {unit.modelo}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Mechanic Selection */}
          <div className="space-y-2">
            <Label htmlFor="mechanic">Mecánico Asignado</Label>
            <Select value={selectedMechanic} onValueChange={setSelectedMechanic}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar mecánico..." />
              </SelectTrigger>
              <SelectContent>
                {mockMechanics.map((mech) => (
                  <SelectItem key={mech.id} value={mech.id}>
                    <span className="font-medium">{mech.nombre}</span>
                    <span className="text-slate-500 ml-2">
                      ({mech.especialidad})
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Issue Description */}
          <div className="space-y-2">
            <Label htmlFor="descripcion">Descripción del Problema</Label>
            <Textarea
              id="descripcion"
              placeholder="Describa el problema o trabajo a realizar..."
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={3}
            />
          </div>

          {/* Parts Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Refacciones Requeridas</Label>
              {!addingPart && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAddingPart(true)}
                  className="h-8"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Agregar Refacción
                </Button>
              )}
            </div>

            {/* Add Part Form */}
            {addingPart && (
              <div className="p-4 border rounded-lg bg-slate-50 space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <Label className="text-xs">SKU / Refacción</Label>
                    <Select value={selectedSku} onValueChange={setSelectedSku}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Seleccionar..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableParts.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs">
                                {item.sku}
                              </span>
                              <span className="text-slate-600 text-sm truncate max-w-[200px]">
                                {item.descripcion}
                              </span>
                              {item.stockActual < item.stockMinimo && (
                                <AlertTriangle className="h-3 w-3 text-red-500" />
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Cantidad</Label>
                    <Input
                      type="number"
                      min={1}
                      value={partQuantity}
                      onChange={(e) =>
                        setPartQuantity(parseInt(e.target.value) || 1)
                      }
                      className="mt-1"
                    />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setAddingPart(false);
                      setSelectedSku("");
                      setPartQuantity(1);
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleAddPart}
                    disabled={!selectedSku}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    Agregar
                  </Button>
                </div>
              </div>
            )}

            {/* Selected Parts List */}
            {selectedParts.length > 0 ? (
              <div className="space-y-2">
                {selectedParts.map((part) => {
                  const isLowStock = part.item.stockActual < part.cantidad;
                  return (
                    <div
                      key={part.item.id}
                      className={cn(
                        "flex items-center gap-3 p-3 border rounded-lg",
                        isLowStock ? "bg-red-50 border-red-200" : "bg-white"
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-xs text-slate-600">
                          {part.item.sku}
                        </p>
                        <p className="text-sm font-medium text-slate-800 truncate">
                          {part.item.descripcion}
                        </p>
                        <p className="text-xs text-slate-500">
                          Stock disponible: {part.item.stockActual}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={1}
                          max={part.item.stockActual}
                          value={part.cantidad}
                          onChange={(e) =>
                            handleUpdateQuantity(
                              part.item.id,
                              parseInt(e.target.value) || 1
                            )
                          }
                          className="w-20 h-8 text-center"
                        />
                        <button
                          onClick={() => handleRemovePart(part.item.id)}
                          className="p-1.5 hover:bg-red-100 rounded-md transition-colors"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </button>
                      </div>
                      {isLowStock && (
                        <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 text-slate-400 border border-dashed rounded-lg">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No hay refacciones asignadas</p>
              </div>
            )}

            {/* Deduction Warning */}
            {selectedParts.length > 0 && (
              <Alert className="bg-amber-50 border-amber-200">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  <strong>Nota:</strong> Al cerrar esta orden, se descontarán{" "}
                  <strong>{totalDeduction} artículo{totalDeduction !== 1 ? "s" : ""}</strong>{" "}
                  del inventario.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <ActionButton onClick={handleSubmit} disabled={!isValid}>
            Crear Orden de Trabajo
          </ActionButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
