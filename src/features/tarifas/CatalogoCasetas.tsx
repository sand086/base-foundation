import { useState } from "react";
import { Search, Plus, Edit, Trash2, MoreHorizontal, MapPin, DollarSign } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ActionButton } from "@/components/ui/action-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  DataTable,
  DataTableHeader,
  DataTableBody,
  DataTableRow,
  DataTableHead,
  DataTableCell,
} from "@/components/ui/data-table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { mockTollBooths, TollBooth } from "@/data/tarifasData";
import { toast } from "sonner";

export const CatalogoCasetas = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [tollBooths, setTollBooths] = useState<TollBooth[]>(mockTollBooths);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedToll, setSelectedToll] = useState<TollBooth | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<Partial<TollBooth>>({
    nombre: "",
    tramo: "",
    costo5EjesSencillo: 0,
    costo5EjesFull: 0,
    costo9EjesSencillo: 0,
    costo9EjesFull: 0,
    formaPago: "TAG",
  });

  const filteredTolls = tollBooths.filter(
    (toll) =>
      toll.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      toll.tramo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(amount);
  };

  const getFormaPagoBadge = (formaPago: string) => {
    switch (formaPago) {
      case "TAG":
        return (
          <Badge className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100">
            TAG
          </Badge>
        );
      case "Efectivo":
        return (
          <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100">
            Efectivo
          </Badge>
        );
      default:
        return (
          <Badge className="bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-100">
            Ambos
          </Badge>
        );
    }
  };

  const handleOpenCreate = () => {
    setSelectedToll(null);
    setFormData({
      nombre: "",
      tramo: "",
      costo5EjesSencillo: 0,
      costo5EjesFull: 0,
      costo9EjesSencillo: 0,
      costo9EjesFull: 0,
      formaPago: "TAG",
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (toll: TollBooth) => {
    setSelectedToll(toll);
    setFormData({
      nombre: toll.nombre,
      tramo: toll.tramo,
      costo5EjesSencillo: toll.costo5EjesSencillo,
      costo5EjesFull: toll.costo5EjesFull,
      costo9EjesSencillo: toll.costo9EjesSencillo,
      costo9EjesFull: toll.costo9EjesFull,
      formaPago: toll.formaPago,
    });
    setDialogOpen(true);
  };

  const handleOpenDelete = (toll: TollBooth) => {
    setSelectedToll(toll);
    setDeleteDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.nombre || !formData.tramo) {
      toast.error("Completa todos los campos obligatorios");
      return;
    }

    if (selectedToll) {
      // Edit existing
      setTollBooths(tollBooths.map(t => 
        t.id === selectedToll.id 
          ? { ...t, ...formData } as TollBooth
          : t
      ));
      toast.success("Caseta actualizada correctamente");
    } else {
      // Create new
      const newToll: TollBooth = {
        id: `caseta-${Date.now()}`,
        nombre: formData.nombre!,
        tramo: formData.tramo!,
        costo5EjesSencillo: formData.costo5EjesSencillo || 0,
        costo5EjesFull: formData.costo5EjesFull || 0,
        costo9EjesSencillo: formData.costo9EjesSencillo || 0,
        costo9EjesFull: formData.costo9EjesFull || 0,
        formaPago: formData.formaPago || "TAG",
      };
      setTollBooths([...tollBooths, newToll]);
      toast.success("Caseta agregada al catálogo");
    }

    setDialogOpen(false);
    setSelectedToll(null);
  };

  const handleDelete = () => {
    if (selectedToll) {
      setTollBooths(tollBooths.filter(t => t.id !== selectedToll.id));
      toast.success("Caseta eliminada del catálogo");
    }
    setDeleteDialogOpen(false);
    setSelectedToll(null);
  };

  const handleInputChange = (field: keyof TollBooth, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar caseta o tramo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <ActionButton onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Caseta
        </ActionButton>
      </div>

      {/* Table */}
      <DataTable>
        <DataTableHeader>
          <DataTableRow>
            <DataTableHead>Nombre Caseta</DataTableHead>
            <DataTableHead>Tramo</DataTableHead>
            <DataTableHead className="text-center" colSpan={2}>
              5 Ejes
            </DataTableHead>
            <DataTableHead className="text-center" colSpan={2}>
              9 Ejes
            </DataTableHead>
            <DataTableHead>Forma de Pago</DataTableHead>
            <DataTableHead className="text-right">Acciones</DataTableHead>
          </DataTableRow>
          <DataTableRow className="bg-slate-50/50">
            <DataTableHead></DataTableHead>
            <DataTableHead></DataTableHead>
            <DataTableHead className="text-xs text-slate-500 font-medium">
              Sencillo
            </DataTableHead>
            <DataTableHead className="text-xs text-slate-500 font-medium">
              Full
            </DataTableHead>
            <DataTableHead className="text-xs text-slate-500 font-medium">
              Sencillo
            </DataTableHead>
            <DataTableHead className="text-xs text-slate-500 font-medium">
              Full
            </DataTableHead>
            <DataTableHead></DataTableHead>
            <DataTableHead></DataTableHead>
          </DataTableRow>
        </DataTableHeader>
        <DataTableBody>
          {filteredTolls.map((toll) => (
            <DataTableRow key={toll.id}>
              <DataTableCell className="font-medium text-slate-900">
                {toll.nombre}
              </DataTableCell>
              <DataTableCell className="text-slate-600">
                {toll.tramo}
              </DataTableCell>
              <DataTableCell className="text-slate-700 font-mono text-xs">
                {formatCurrency(toll.costo5EjesSencillo)}
              </DataTableCell>
              <DataTableCell className="text-emerald-700 font-mono text-xs font-semibold bg-emerald-50/50">
                {formatCurrency(toll.costo5EjesFull)}
              </DataTableCell>
              <DataTableCell className="text-slate-700 font-mono text-xs">
                {formatCurrency(toll.costo9EjesSencillo)}
              </DataTableCell>
              <DataTableCell className="text-emerald-700 font-mono text-xs font-semibold bg-emerald-50/50">
                {formatCurrency(toll.costo9EjesFull)}
              </DataTableCell>
              <DataTableCell>{getFormaPagoBadge(toll.formaPago)}</DataTableCell>
              <DataTableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleOpenEdit(toll)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => handleOpenDelete(toll)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </DataTableCell>
            </DataTableRow>
          ))}
        </DataTableBody>
      </DataTable>

      {/* Legend */}
      <div className="flex gap-6 text-xs text-slate-500 pt-2">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-slate-100 rounded"></div>
          <span>Sencillo = Ida</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-emerald-100 rounded"></div>
          <span>Full = Ida y Vuelta (Redondo)</span>
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              {selectedToll ? "Editar Caseta" : "Nueva Caseta"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre de Caseta *</Label>
                <Input
                  id="nombre"
                  placeholder="Ej: Caseta Tlalpan"
                  value={formData.nombre}
                  onChange={(e) => handleInputChange("nombre", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tramo">Tramo *</Label>
                <Input
                  id="tramo"
                  placeholder="Ej: CDMX - Cuernavaca"
                  value={formData.tramo}
                  onChange={(e) => handleInputChange("tramo", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Forma de Pago</Label>
              <Select 
                value={formData.formaPago} 
                onValueChange={(v) => handleInputChange("formaPago", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TAG">TAG</SelectItem>
                  <SelectItem value="Efectivo">Efectivo</SelectItem>
                  <SelectItem value="Ambos">Ambos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Costos por Tipo de Unidad (MXN)
              </Label>
              
              <div className="grid grid-cols-2 gap-4 p-3 bg-muted rounded-lg">
                <div className="space-y-3">
                  <p className="text-sm font-medium text-blue-700">5 Ejes</p>
                  <div className="space-y-2">
                    <Label className="text-xs">Sencillo (Ida)</Label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={formData.costo5EjesSencillo || ""}
                      onChange={(e) => handleInputChange("costo5EjesSencillo", parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Full (Redondo)</Label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={formData.costo5EjesFull || ""}
                      onChange={(e) => handleInputChange("costo5EjesFull", parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>
                
                <div className="space-y-3">
                  <p className="text-sm font-medium text-amber-700">9 Ejes</p>
                  <div className="space-y-2">
                    <Label className="text-xs">Sencillo (Ida)</Label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={formData.costo9EjesSencillo || ""}
                      onChange={(e) => handleInputChange("costo9EjesSencillo", parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Full (Redondo)</Label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={formData.costo9EjesFull || ""}
                      onChange={(e) => handleInputChange("costo9EjesFull", parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <ActionButton onClick={handleSave}>
              {selectedToll ? "Actualizar" : "Guardar"}
            </ActionButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta caseta?</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedToll && (
                <>
                  Estás a punto de eliminar la caseta{" "}
                  <strong>{selectedToll.nombre}</strong> del tramo{" "}
                  <strong>{selectedToll.tramo}</strong>.
                  <br /><br />
                  Esta acción no se puede deshacer y puede afectar tarifas existentes.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
