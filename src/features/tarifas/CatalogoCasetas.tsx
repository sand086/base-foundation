import { useState, useEffect } from "react";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  MoreHorizontal,
  MapPin,
  DollarSign,
  Loader2,
} from "lucide-react";
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
import { TollBooth } from "@/types/api.types";
import { tollService } from "@/services/tollService";
import { toast } from "sonner";

export const CatalogoCasetas = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [tollBooths, setTollBooths] = useState<TollBooth[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedToll, setSelectedToll] = useState<TollBooth | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state alineado al backend
  const [formData, setFormData] = useState<Partial<TollBooth>>({
    nombre: "",
    tramo: "",
    costo_5_ejes_sencillo: 0,
    costo_5_ejes_full: 0,
    costo_9_ejes_sencillo: 0,
    costo_9_ejes_full: 0,
    forma_pago: "Ambos",
  });

  const loadTolls = async () => {
    setIsLoading(true);
    try {
      const data = await tollService.getTolls(searchTerm);
      setTollBooths(data);
    } catch (error) {
      toast.error("Error al cargar el catálogo de casetas");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(loadTolls, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(amount);
  };

  const getFormaPagoBadge = (formaPago: string) => {
    const styles = {
      TAG: "bg-blue-100 text-blue-700 border-blue-200",
      EFECTIVO: "bg-amber-100 text-amber-700 border-amber-200",
      AMBOS: "bg-slate-100 text-slate-700 border-slate-200",
    };
    return (
      <Badge
        className={`${styles[formaPago as keyof typeof styles]} hover:opacity-80`}
      >
        {formaPago}
      </Badge>
    );
  };

  const handleOpenCreate = () => {
    setSelectedToll(null);
    setFormData({
      nombre: "",
      tramo: "",
      costo_5_ejes_sencillo: 0,
      costo_5_ejes_full: 0,
      costo_9_ejes_sencillo: 0,
      costo_9_ejes_full: 0,
      forma_pago: "Ambos",
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (toll: TollBooth) => {
    setSelectedToll(toll);
    setFormData({ ...toll });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.nombre || !formData.tramo) {
      toast.error("Nombre y tramo son obligatorios");
      return;
    }

    setIsSubmitting(true);
    try {
      if (selectedToll) {
        await tollService.updateToll(selectedToll.id, formData);
        toast.success("Caseta actualizada correctamente");
      } else {
        await tollService.createToll(formData);
        toast.success("Caseta agregada al catálogo");
      }
      loadTolls();
      setDialogOpen(false);
    } catch (error) {
      toast.error("No se pudo guardar la caseta");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedToll) return;
    try {
      await tollService.deleteToll(selectedToll.id);
      toast.success("Caseta eliminada");
      loadTolls();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Error al eliminar");
    } finally {
      setDeleteDialogOpen(false);
    }
  };

  return (
    <div className="space-y-4">
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

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-primary opacity-50" />
        </div>
      ) : (
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
              <DataTableHead className="text-[10px] text-center uppercase">
                Sencillo
              </DataTableHead>
              <DataTableHead className="text-[10px] text-center uppercase">
                Full
              </DataTableHead>
              <DataTableHead className="text-[10px] text-center uppercase">
                Sencillo
              </DataTableHead>
              <DataTableHead className="text-[10px] text-center uppercase">
                Full
              </DataTableHead>
              <DataTableHead></DataTableHead>
              <DataTableHead></DataTableHead>
            </DataTableRow>
          </DataTableHeader>
          <DataTableBody>
            {tollBooths.map((toll) => (
              <DataTableRow key={toll.id}>
                <DataTableCell className="font-medium">
                  {toll.nombre}
                </DataTableCell>
                <DataTableCell className="text-slate-600">
                  {toll.tramo}
                </DataTableCell>
                <DataTableCell className="text-center font-mono text-xs">
                  {formatCurrency(toll.costo_5_ejes_sencillo)}
                </DataTableCell>
                <DataTableCell className="text-center font-mono text-xs bg-emerald-50/30">
                  {formatCurrency(toll.costo_5_ejes_full)}
                </DataTableCell>
                <DataTableCell className="text-center font-mono text-xs">
                  {formatCurrency(toll.costo_9_ejes_sencillo)}
                </DataTableCell>
                <DataTableCell className="text-center font-mono text-xs bg-emerald-50/30">
                  {formatCurrency(toll.costo_9_ejes_full)}
                </DataTableCell>
                <DataTableCell>
                  {getFormaPagoBadge(toll.forma_pago)}
                </DataTableCell>
                <DataTableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleOpenEdit(toll)}>
                        <Edit className="h-4 w-4 mr-2" /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedToll(toll);
                          setDeleteDialogOpen(true);
                        }}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" /> Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </DataTableCell>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedToll ? "Editar Caseta" : "Nueva Caseta"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input
                value={formData.nombre}
                onChange={(e) =>
                  setFormData({ ...formData, nombre: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Tramo *</Label>
              <Input
                value={formData.tramo}
                onChange={(e) =>
                  setFormData({ ...formData, tramo: e.target.value })
                }
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Forma de Pago</Label>
              <Select
                value={formData.forma_pago}
                onValueChange={(v) =>
                  setFormData({ ...formData, forma_pago: v as any })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TAG">TAG</SelectItem>
                  <SelectItem value="EFECTIVO">Efectivo</SelectItem>
                  <SelectItem value="AMBOS">Ambos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 grid grid-cols-2 gap-4 p-3 bg-muted rounded-lg">
              <div className="space-y-2">
                <p className="text-xs font-bold text-blue-700 uppercase">
                  Costos 5 Ejes
                </p>
                <Label className="text-[10px]">Sencillo</Label>
                <Input
                  type="number"
                  value={formData.costo_5_ejes_sencillo}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      costo_5_ejes_sencillo: +e.target.value,
                    })
                  }
                />
                <Label className="text-[10px]">Full</Label>
                <Input
                  type="number"
                  value={formData.costo_5_ejes_full}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      costo_5_ejes_full: +e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <p className="text-xs font-bold text-amber-700 uppercase">
                  Costos 9 Ejes
                </p>
                <Label className="text-[10px]">Sencillo</Label>
                <Input
                  type="number"
                  value={formData.costo_9_ejes_sencillo}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      costo_9_ejes_sencillo: +e.target.value,
                    })
                  }
                />
                <Label className="text-[10px]">Full</Label>
                <Input
                  type="number"
                  value={formData.costo_9_ejes_full}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      costo_9_ejes_full: +e.target.value,
                    })
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <ActionButton onClick={handleSave} disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : "Guardar"}
            </ActionButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
