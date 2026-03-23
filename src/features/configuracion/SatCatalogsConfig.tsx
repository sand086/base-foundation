// src/features/configuracion/SatCatalogsConfig.tsx
import { useState, useEffect, useMemo } from "react";
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
  Search,
  Download,
  Copy,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { useSatCatalogs, SatProduct } from "@/hooks/useSatCatalogs";

export function SatCatalogsConfig() {
  const { products, loading, saveProduct, deleteProduct } = useSatCatalogs();
  const [localProducts, setLocalProducts] = useState<SatProduct[]>([]);

  // ==========================================
  // ESTADOS PARA LA TABLA INTERACTIVA
  // ==========================================
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof SatProduct;
    direction: "asc" | "desc";
  } | null>(null);

  useEffect(() => {
    if (!loading && products) {
      setLocalProducts(products);
    }
  }, [products, loading]);

  // Estados del modal y formulario
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SatProduct | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    id: 0,
    clave: "",
    descripcion: "",
    es_material_peligroso: "0",
  });

  // ==========================================
  // LÓGICA DE FILTRADO, ORDENAMIENTO Y PAGINACIÓN
  // ==========================================
  const processedData = useMemo(() => {
    let result = [...localProducts];

    // 1. Búsqueda (Filtro)
    if (searchTerm) {
      const lowercasedTerm = searchTerm.toLowerCase();
      result = result.filter(
        (p) =>
          p.clave.toLowerCase().includes(lowercasedTerm) ||
          p.descripcion.toLowerCase().includes(lowercasedTerm),
      );
    }

    // 2. Ordenamiento
    if (sortConfig !== null) {
      result.sort((a, b) => {
        const aValue = String(a[sortConfig.key]).toLowerCase();
        const bValue = String(b[sortConfig.key]).toLowerCase();
        if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [localProducts, searchTerm, sortConfig]);

  // 3. Paginación
  const totalPages =
    pageSize === 0 ? 1 : Math.ceil(processedData.length / pageSize);
  const paginatedData = useMemo(() => {
    if (pageSize === 0) return processedData; // "0" significa mostrar todos
    const startIndex = (currentPage - 1) * pageSize;
    return processedData.slice(startIndex, startIndex + pageSize);
  }, [processedData, currentPage, pageSize]);

  // Resetear a la página 1 si se busca o cambia el tamaño
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, pageSize]);

  const handleSort = (key: keyof SatProduct) => {
    let direction: "asc" | "desc" = "asc";
    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === "asc"
    ) {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  // ==========================================
  // FUNCIONES DE EXPORTAR Y COPIAR
  // ==========================================
  const handleCopy = () => {
    if (processedData.length === 0)
      return toast.info("No hay datos para copiar");
    const header = "Clave\tDescripción\tMat. Peligroso\n";
    const rows = processedData
      .map((p) => `${p.clave}\t${p.descripcion}\t${p.es_material_peligroso}`)
      .join("\n");
    navigator.clipboard.writeText(header + rows);
    toast.success("Catálogo copiado al portapapeles");
  };

  const handleExportCSV = () => {
    if (processedData.length === 0)
      return toast.info("No hay datos para exportar");
    const header = "Clave,Descripción,Mat. Peligroso\n";
    const rows = processedData
      .map(
        (p) =>
          `"${p.clave}","${p.descripcion.replace(/"/g, '""')}","${p.es_material_peligroso}"`,
      )
      .join("\n");

    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "catalogo_sat_productos.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Archivo Excel (CSV) descargado");
  };

  // ==========================================
  // HANDLERS CRUD
  // ==========================================
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
      await saveProduct(formData);
      let updatedArray: SatProduct[];
      if (editingItem) {
        updatedArray = localProducts.map((p) =>
          p.id === editingItem.id ? { ...p, ...formData } : p,
        );
      } else {
        const newItem: SatProduct = { ...formData, id: Date.now() };
        updatedArray = [...localProducts, newItem];
      }
      setLocalProducts(updatedArray);
      toast.success(editingItem ? "Producto actualizado" : "Producto guardado");
      setIsModalOpen(false);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Error al guardar");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteProduct(deleteId);
      setLocalProducts(localProducts.filter((p) => p.id !== deleteId));
      toast.success("Producto eliminado del catálogo");
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Error al eliminar");
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden mt-8">
      <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-brand-navy">
              <Tags className="h-5 w-5 text-emerald-600" />
              Catálogo de Productos y Servicios (SAT)
            </CardTitle>
            <CardDescription>
              Administra las claves ProdServ autorizadas para la facturación
            </CardDescription>
          </div>
          <Button
            type="button"
            onClick={handleOpenNew}
            className="gap-2 bg-brand-navy hover:bg-brand-navy/90 text-white rounded-xl shrink-0"
            disabled={loading}
          >
            <Plus className="h-4 w-4" />
            Agregar Clave
          </Button>
        </div>

        {/* BARRA DE HERRAMIENTAS (Buscador y Botones) */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4 items-center justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar por clave o descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-10 rounded-xl"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="rounded-lg text-slate-600 h-10"
              title="Copiar al portapapeles"
            >
              <Copy className="h-4 w-4 mr-2" /> Copiar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="rounded-lg text-emerald-700 border-emerald-200 hover:bg-emerald-50 h-10"
              title="Exportar a Excel (CSV)"
            >
              <Download className="h-4 w-4 mr-2" /> Excel
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {loading ? (
          <div className="flex justify-center items-center py-12 text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : processedData.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm bg-slate-50/30">
            No se encontraron resultados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead
                    className="w-[120px] font-bold text-slate-600 cursor-pointer hover:text-brand-navy transition-colors"
                    onClick={() => handleSort("clave")}
                  >
                    <div className="flex items-center gap-1">
                      Clave <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="font-bold text-slate-600 cursor-pointer hover:text-brand-navy transition-colors"
                    onClick={() => handleSort("descripcion")}
                  >
                    <div className="flex items-center gap-1">
                      Descripción <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="w-[150px] text-center font-bold text-slate-600 cursor-pointer hover:text-brand-navy transition-colors"
                    onClick={() => handleSort("es_material_peligroso")}
                  >
                    <div className="flex items-center justify-center gap-1">
                      Mat. Peligroso <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </TableHead>
                  <TableHead className="w-[100px] text-right font-bold text-slate-600">
                    Acciones
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.map((product) => (
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
          </div>
        )}

        {/* FOOTER DE PAGINACIÓN */}
        {processedData.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-slate-100 bg-white gap-4">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span>Mostrar</span>
              <select
                className="border border-slate-200 rounded-md p-1 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-navy"
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={0}>Todas</option>
              </select>
              <span>registros</span>
            </div>

            <div className="text-sm text-slate-500 font-medium">
              Mostrando{" "}
              {pageSize === 0 ? processedData.length : paginatedData.length} de{" "}
              {processedData.length}
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1 || pageSize === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium text-slate-600 min-w-[3rem] text-center">
                {pageSize === 0 ? 1 : currentPage} / {totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages || pageSize === 0}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      {/* MODALES DE EDICIÓN Y ELIMINACIÓN */}
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
