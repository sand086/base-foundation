import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Pencil,
  Trash2,
  Tags,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

import { useSatCatalogs, SatProduct } from "@/hooks/useSatCatalogs";

export function SatCatalogsConfig() {
  const { products, loading, saveProduct, deleteProduct } = useSatCatalogs();
  const [localProducts, setLocalProducts] = useState<SatProduct[]>([]);

  useEffect(() => {
    if (!loading && products) {
      setLocalProducts(products);
    }
  }, [products, loading]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SatProduct | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    id: 0,
    clave: "",
    descripcion: "",
    es_material_peligroso: "0",
  });

  const handleOpenNew = () => {
    setEditingItem(null);
    setFormData({
      id: 0,
      clave: "",
      descripcion: "",
      es_material_peligroso: "0",
    });
    setIsModalOpen(true);
  };

  const handleEdit = (item: SatProduct) => {
    setEditingItem(item);
    setFormData({
      id: item.id,
      clave: item.clave,
      descripcion: item.descripcion,
      es_material_peligroso: item.es_material_peligroso || "0",
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.clave.trim() || !formData.descripcion.trim()) {
      toast.error("La clave y la descripción son obligatorias");
      return;
    }

    try {
      // 1. Mandamos a guardar o actualizar al backend
      await saveProduct(formData);

      // 2. Actualizamos el estado local
      let updatedArray: SatProduct[];

      if (editingItem) {
        updatedArray = localProducts.map((p) =>
          p.id === editingItem.id ? { ...p, ...formData } : p,
        );
      } else {
        const newItem: SatProduct = {
          ...formData,
          id: Date.now(),
        };
        updatedArray = [...localProducts, newItem];
      }

      setLocalProducts(updatedArray);

      toast.success(
        editingItem
          ? "Producto actualizado en el servidor"
          : "Producto guardado en el servidor",
      );
      setIsModalOpen(false);
    } catch (error: any) {
      const errMsg =
        error.response?.data?.detail ||
        "Ocurrió un error al guardar el producto SAT";
      toast.error(errMsg);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      // 1. Disparamos la petición DELETE al backend
      await deleteProduct(deleteId);

      // 2. Eliminamos del estado local
      const updated = localProducts.filter((p) => p.id !== deleteId);
      setLocalProducts(updated);

      toast.success("Producto eliminado del catálogo");
    } catch (error: any) {
      toast.error(
        error.response?.data?.detail || "No se pudo eliminar el producto",
      );
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden mt-8">
      <CardHeader className="bg-slate-50/50 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-brand-navy">
              <Tags className="h-5 w-5 text-emerald-600" />
              Catálogo de Productos y Servicios (SAT)
            </CardTitle>
            <CardDescription>
              Administra las claves ProdServ autorizadas para la facturación y
              Carta Porte
            </CardDescription>
          </div>
          <Button
            type="button"
            onClick={handleOpenNew}
            className="gap-2 bg-brand-navy hover:bg-brand-navy/90 text-white rounded-xl"
            disabled={loading}
          >
            <Plus className="h-4 w-4" />
            Agregar Clave
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {loading ? (
          <div className="flex justify-center items-center py-12 text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : localProducts.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm">
            No hay productos registrados en el catálogo.
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-[120px] font-bold text-slate-600">
                  Clave
                </TableHead>
                <TableHead className="font-bold text-slate-600">
                  Descripción
                </TableHead>
                <TableHead className="w-[150px] text-center font-bold text-slate-600">
                  Mat. Peligroso
                </TableHead>
                <TableHead className="w-[100px] text-right font-bold text-slate-600">
                  Acciones
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {localProducts.map((product) => (
                <TableRow key={product.id} className="hover:bg-slate-50/50">
                  <TableCell className="font-mono font-medium text-emerald-700">
                    {product.clave}
                  </TableCell>
                  <TableCell
                    className="max-w-[300px] truncate"
                    title={product.descripcion}
                  >
                    {product.descripcion}
                  </TableCell>
                  <TableCell className="text-center">
                    {product.es_material_peligroso === "1" ? (
                      <Badge
                        variant="outline"
                        className="border-amber-300 bg-amber-50 text-amber-700 gap-1"
                      >
                        <AlertTriangle className="h-3 w-3" /> Sí
                      </Badge>
                    ) : (
                      <span className="text-slate-500 font-medium">
                        {product.es_material_peligroso}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {/* 🚀 FIX: type="button" y stopPropagation para evitar abrir el finder */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-brand-navy"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleEdit(product);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setDeleteId(product.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Modal Agregar/Editar */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-brand-navy font-black">
              {editingItem ? "Editar Clave SAT" : "Nueva Clave SAT"}
            </DialogTitle>
            <DialogDescription>
              Asegúrate de que la clave coincida exactamente con el catálogo
              oficial del SAT (c_ClaveProdServ).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-500 uppercase">
                Clave ProdServ *
              </Label>
              <Input
                placeholder="Ej: 78101802"
                value={formData.clave}
                onChange={(e) =>
                  setFormData({ ...formData, clave: e.target.value })
                }
                className="rounded-lg font-mono"
                maxLength={8}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-500 uppercase">
                Descripción *
              </Label>
              <Input
                placeholder="Servicios de transporte de carga por carretera..."
                value={formData.descripcion}
                onChange={(e) =>
                  setFormData({ ...formData, descripcion: e.target.value })
                }
                className="rounded-lg"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-500 uppercase">
                ¿Es Material Peligroso?
              </Label>
              <Input
                placeholder="0 = No, 1 = Sí, 0,1 = Opcional"
                value={formData.es_material_peligroso}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    es_material_peligroso: e.target.value,
                  })
                }
                className="rounded-lg font-mono"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Valores válidos según el SAT: "0", "1", "0,1".
              </p>
            </div>
          </div>

          <DialogFooter className="pt-6">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsModalOpen(false)}
              className="rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              className="bg-brand-navy hover:bg-brand-navy/90 text-white rounded-xl"
            >
              {editingItem ? "Guardar Cambios" : "Agregar Clave"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alerta de Eliminación */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600 font-black flex items-center gap-2">
              <Trash2 className="h-5 w-5" /> ¿Eliminar clave SAT?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600">
              Esta acción eliminará la clave del catálogo interno. Los viajes
              que ya hayan sido timbrados con esta clave no se verán afectados,
              pero ya no podrás seleccionarla para nuevos viajes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel className="rounded-xl font-bold">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700 rounded-xl font-bold"
              onClick={handleDelete}
            >
              Sí, eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
