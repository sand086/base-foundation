import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ActionButton } from "@/components/ui/action-button";
import { Progress } from "@/components/ui/progress";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Plus, 
  Trash2, 
  CalendarIcon, 
  Package, 
  Wrench, 
  Receipt,
  ChevronLeft,
  ChevronRight,
  Check
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  PurchaseOrder,
  OrderItem,
  OrderType,
  CostCenter,
  IndirectCategory,
  getOrderTypeLabel,
  getCostCenterLabel,
  getIndirectCategoryLabel,
} from "./types";
import { mockSuppliers, mockInventoryItems, generateFolio } from "./data";

interface CreateOrderWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (order: PurchaseOrder) => void;
  editingOrder?: PurchaseOrder | null;
}

const STEPS = [
  { id: 1, title: 'Encabezado', description: 'Datos generales' },
  { id: 2, title: 'Detalle', description: 'Productos o servicios' },
  { id: 3, title: 'Económico', description: 'Precios y totales' },
];

export function CreateOrderWizard({ open, onOpenChange, onSave, editingOrder }: CreateOrderWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  
  // Step 1: Header
  const [tipo, setTipo] = useState<OrderType>(editingOrder?.tipo || 'compra');
  const [proveedorId, setProveedorId] = useState(editingOrder?.proveedorId || '');
  const [fechaRequerida, setFechaRequerida] = useState<Date | undefined>(editingOrder?.fechaRequerida);
  const [centroCostos, setCentroCostos] = useState<CostCenter>(editingOrder?.centroCostos || 'mantenimiento');
  const [categoriaIndirecto, setCategoriaIndirecto] = useState<IndirectCategory | undefined>(editingOrder?.categoriaIndirecto);
  const [solicitante, setSolicitante] = useState(editingOrder?.solicitante || '');
  
  // Step 2: Detail
  const [items, setItems] = useState<OrderItem[]>(editingOrder?.items || []);
  const [descripcionServicio, setDescripcionServicio] = useState(editingOrder?.descripcionServicio || '');
  const [selectedInventoryItem, setSelectedInventoryItem] = useState('');
  const [itemCantidad, setItemCantidad] = useState(1);
  
  // Step 3: Economic
  const [moneda, setMoneda] = useState<'MXN' | 'USD'>(editingOrder?.moneda || 'MXN');

  const filteredSuppliers = mockSuppliers.filter(s => {
    if (tipo === 'compra') return s.tipo === 'refacciones' || s.tipo === 'general';
    if (tipo === 'servicio') return s.tipo === 'servicios' || s.tipo === 'general';
    return true;
  });

  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0) || 
    (tipo === 'servicio' && descripcionServicio ? parseFloat(descripcionServicio.match(/\$?([\d,]+)/)?.[1]?.replace(',', '') || '0') : 0);
  const iva = subtotal * 0.16;
  const total = subtotal + iva;

  const handleAddItem = () => {
    const inventoryItem = mockInventoryItems.find(i => i.id === selectedInventoryItem);
    if (!inventoryItem || itemCantidad <= 0) {
      toast.error('Selecciona un ítem y cantidad válida');
      return;
    }

    const newItem: OrderItem = {
      id: `item-${Date.now()}`,
      descripcion: inventoryItem.nombre,
      cantidad: itemCantidad,
      unidad: inventoryItem.unidad,
      precioUnitario: inventoryItem.precioPromedio,
      subtotal: inventoryItem.precioPromedio * itemCantidad,
    };

    setItems([...items, newItem]);
    setSelectedInventoryItem('');
    setItemCantidad(1);
  };

  const handleRemoveItem = (itemId: string) => {
    setItems(items.filter(i => i.id !== itemId));
  };

  const handleUpdateItemPrice = (itemId: string, newPrice: number) => {
    setItems(items.map(item => 
      item.id === itemId 
        ? { ...item, precioUnitario: newPrice, subtotal: newPrice * item.cantidad }
        : item
    ));
  };

  const handleSubmit = () => {
    const proveedor = mockSuppliers.find(s => s.id === proveedorId);
    
    const order: PurchaseOrder = {
      id: editingOrder?.id || `po-${Date.now()}`,
      folio: editingOrder?.folio || generateFolio(tipo),
      tipo,
      proveedorId,
      proveedorNombre: proveedor?.nombre || '',
      solicitante,
      fechaCreacion: editingOrder?.fechaCreacion || new Date(),
      fechaRequerida: fechaRequerida || new Date(),
      centroCostos,
      categoriaIndirecto: tipo === 'gasto_indirecto' ? categoriaIndirecto : undefined,
      items,
      descripcionServicio: tipo === 'servicio' ? descripcionServicio : undefined,
      subtotal,
      iva,
      total,
      moneda,
      estatus: editingOrder?.estatus || 'borrador',
      convertidoACxP: editingOrder?.convertidoACxP || false,
    };

    onSave(order);
    handleReset();
    onOpenChange(false);
  };

  const handleReset = () => {
    setCurrentStep(1);
    setTipo('compra');
    setProveedorId('');
    setFechaRequerida(undefined);
    setCentroCostos('mantenimiento');
    setCategoriaIndirecto(undefined);
    setSolicitante('');
    setItems([]);
    setDescripcionServicio('');
    setMoneda('MXN');
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return proveedorId && fechaRequerida && solicitante;
      case 2:
        if (tipo === 'compra' || tipo === 'gasto_indirecto') return items.length > 0;
        if (tipo === 'servicio') return descripcionServicio.length > 10;
        return false;
      case 3:
        return subtotal > 0;
      default:
        return false;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: moneda,
    }).format(amount);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleReset(); onOpenChange(o); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {editingOrder ? 'Editar Orden' : 'Nueva Orden de Compra / Servicio'}
          </DialogTitle>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-between px-4 py-3 bg-muted rounded-lg">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center gap-2">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                currentStep > step.id 
                  ? "bg-primary text-primary-foreground"
                  : currentStep === step.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted-foreground/20 text-muted-foreground"
              )}>
                {currentStep > step.id ? <Check className="h-4 w-4" /> : step.id}
              </div>
              <div className="hidden sm:block">
                <p className={cn(
                  "text-sm font-medium",
                  currentStep >= step.id ? "text-foreground" : "text-muted-foreground"
                )}>
                  {step.title}
                </p>
                <p className="text-xs text-muted-foreground">{step.description}</p>
              </div>
              {index < STEPS.length - 1 && (
                <div className={cn(
                  "w-12 h-0.5 mx-2",
                  currentStep > step.id ? "bg-primary" : "bg-muted-foreground/20"
                )} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto py-4 px-1">
          {/* Step 1: Header */}
          {currentStep === 1 && (
            <div className="space-y-6">
              {/* Order Type Selection */}
              <div className="space-y-3">
                <Label>Tipo de Orden *</Label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => { setTipo('compra'); setItems([]); }}
                    className={cn(
                      "p-4 rounded-lg border-2 transition-all text-left",
                      tipo === 'compra' 
                        ? "border-primary bg-primary/5" 
                        : "border-muted hover:border-muted-foreground/50"
                    )}
                  >
                    <Package className="h-6 w-6 mb-2 text-blue-600" />
                    <p className="font-medium">Compra</p>
                    <p className="text-xs text-muted-foreground">Bienes / Refacciones</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setTipo('servicio'); setItems([]); }}
                    className={cn(
                      "p-4 rounded-lg border-2 transition-all text-left",
                      tipo === 'servicio' 
                        ? "border-primary bg-primary/5" 
                        : "border-muted hover:border-muted-foreground/50"
                    )}
                  >
                    <Wrench className="h-6 w-6 mb-2 text-purple-600" />
                    <p className="font-medium">Servicio</p>
                    <p className="text-xs text-muted-foreground">Trabajos externos</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setTipo('gasto_indirecto'); setItems([]); }}
                    className={cn(
                      "p-4 rounded-lg border-2 transition-all text-left",
                      tipo === 'gasto_indirecto' 
                        ? "border-primary bg-primary/5" 
                        : "border-muted hover:border-muted-foreground/50"
                    )}
                  >
                    <Receipt className="h-6 w-6 mb-2 text-slate-600" />
                    <p className="font-medium">Gasto Indirecto</p>
                    <p className="text-xs text-muted-foreground">Administrativo</p>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Proveedor *</Label>
                  <Select value={proveedorId} onValueChange={setProveedorId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar proveedor..." />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredSuppliers.map(s => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Fecha Requerida *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {fechaRequerida 
                          ? format(fechaRequerida, "dd/MM/yyyy", { locale: es })
                          : "Seleccionar fecha..."
                        }
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={fechaRequerida}
                        onSelect={setFechaRequerida}
                        locale={es}
                        disabled={(date) => date < new Date()}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Centro de Costos *</Label>
                  <Select value={centroCostos} onValueChange={(v) => setCentroCostos(v as CostCenter)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mantenimiento">Mantenimiento</SelectItem>
                      <SelectItem value="operativo">Operativo</SelectItem>
                      <SelectItem value="administrativo">Administrativo / Indirecto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {tipo === 'gasto_indirecto' && (
                  <div className="space-y-2">
                    <Label>Categoría de Gasto</Label>
                    <Select value={categoriaIndirecto} onValueChange={(v) => setCategoriaIndirecto(v as IndirectCategory)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="papeleria">Papelería</SelectItem>
                        <SelectItem value="renta">Renta</SelectItem>
                        <SelectItem value="limpieza">Limpieza</SelectItem>
                        <SelectItem value="servicios">Servicios Públicos</SelectItem>
                        <SelectItem value="otros">Otros</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Solicitante *</Label>
                <Input
                  placeholder="Nombre del solicitante (ej: Juan Pérez - Mantenimiento)"
                  value={solicitante}
                  onChange={(e) => setSolicitante(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Step 2: Detail */}
          {currentStep === 2 && (
            <div className="space-y-6">
              {(tipo === 'compra' || tipo === 'gasto_indirecto') && (
                <>
                  {/* Add Item */}
                  <div className="p-4 bg-muted rounded-lg space-y-4">
                    <Label>Agregar Ítem del Inventario</Label>
                    <div className="flex gap-3">
                      <Select value={selectedInventoryItem} onValueChange={setSelectedInventoryItem}>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Seleccionar producto..." />
                        </SelectTrigger>
                        <SelectContent>
                          {mockInventoryItems.map(item => (
                            <SelectItem key={item.id} value={item.id}>
                              <div className="flex items-center justify-between gap-4 w-full">
                                <span>{item.codigo} - {item.nombre}</span>
                                <span className="text-muted-foreground text-xs">
                                  Stock: {item.stockActual}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        placeholder="Cant."
                        className="w-24"
                        value={itemCantidad}
                        onChange={(e) => setItemCantidad(parseInt(e.target.value) || 0)}
                        min={1}
                      />
                      <Button onClick={handleAddItem}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Items List */}
                  {items.length > 0 ? (
                    <div className="space-y-2">
                      {items.map((item, index) => (
                        <div 
                          key={item.id} 
                          className="flex items-center gap-3 p-3 bg-background border rounded-lg"
                        >
                          <span className="text-xs text-muted-foreground w-6">{index + 1}</span>
                          <div className="flex-1">
                            <p className="font-medium">{item.descripcion}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.cantidad} {item.unidad}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-mono">${item.subtotal.toLocaleString()}</p>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-destructive"
                            onClick={() => handleRemoveItem(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No hay ítems agregados</p>
                    </div>
                  )}
                </>
              )}

              {tipo === 'servicio' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Descripción del Servicio *</Label>
                    <Textarea
                      placeholder="Describe detalladamente el trabajo a realizar. Ej: Reparación de transmisión completa para unidad T-03. Incluye diagnóstico, mano de obra y refacciones menores."
                      value={descripcionServicio}
                      onChange={(e) => setDescripcionServicio(e.target.value)}
                      rows={6}
                      className="resize-none"
                    />
                    <p className="text-xs text-muted-foreground">
                      Mínimo 10 caracteres. Sé específico para evitar malentendidos.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Economic */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label>Moneda</Label>
                <Select value={moneda} onValueChange={(v) => setMoneda(v as 'MXN' | 'USD')}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MXN">MXN (Pesos)</SelectItem>
                    <SelectItem value="USD">USD (Dólares)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Items with editable prices */}
              {(tipo === 'compra' || tipo === 'gasto_indirecto') && items.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-3">Descripción</th>
                        <th className="text-center p-3">Cantidad</th>
                        <th className="text-right p-3">Precio Unit.</th>
                        <th className="text-right p-3">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map(item => (
                        <tr key={item.id} className="border-t">
                          <td className="p-3">{item.descripcion}</td>
                          <td className="p-3 text-center">{item.cantidad} {item.unidad}</td>
                          <td className="p-3">
                            <Input
                              type="number"
                              value={item.precioUnitario}
                              onChange={(e) => handleUpdateItemPrice(item.id, parseFloat(e.target.value) || 0)}
                              className="w-28 text-right ml-auto"
                            />
                          </td>
                          <td className="p-3 text-right font-mono font-medium">
                            {formatCurrency(item.subtotal)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {tipo === 'servicio' && (
                <div className="space-y-2">
                  <Label>Monto del Servicio *</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={subtotal || ''}
                    onChange={(e) => {
                      // Store in a dummy item
                      const val = parseFloat(e.target.value) || 0;
                      setItems([{ 
                        id: 'servicio', 
                        descripcion: 'Servicio', 
                        cantidad: 1, 
                        unidad: 'SRV', 
                        precioUnitario: val, 
                        subtotal: val 
                      }]);
                    }}
                    className="text-lg"
                  />
                </div>
              )}

              <Separator />

              {/* Totals */}
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-mono">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">IVA (16%)</span>
                  <span className="font-mono">{formatCurrency(iva)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total</span>
                  <span className="font-mono text-primary">{formatCurrency(total)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <DialogFooter className="flex-row justify-between sm:justify-between border-t pt-4">
          <Button 
            variant="outline" 
            onClick={() => setCurrentStep(s => s - 1)}
            disabled={currentStep === 1}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Anterior
          </Button>
          
          {currentStep < 3 ? (
            <Button 
              onClick={() => setCurrentStep(s => s + 1)}
              disabled={!canProceed()}
            >
              Siguiente
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <ActionButton onClick={handleSubmit} disabled={!canProceed()}>
              {editingOrder ? 'Actualizar Orden' : 'Crear Orden'}
            </ActionButton>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
