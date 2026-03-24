import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { Plus, Pencil, Trash2, Search, Loader2, Truck } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface GenericItem {
  id?: number;
  nombre: string;
  activo: boolean;
  [key: string]: any;
}

interface Props<T extends GenericItem> {
  title: string;
  items: T[];
  loading: boolean;
  onSave: (payload: T[]) => Promise<boolean>;
  extraFields?: (data: any, setData: any) => React.ReactNode;
  columns?: { header: string; key: keyof T }[];
}

export function GenericCatalogManager<T extends GenericItem>({
  title,
  items,
  loading,
  onSave,
  extraFields,
  columns,
}: Props<T>) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<T | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [formData, setFormData] = useState<any>({ nombre: "", activo: true });

  const filteredItems = useMemo(
    () =>
      items.filter((i) =>
        i.nombre.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    [items, searchTerm],
  );

  const handleOpenModal = (item?: T) => {
    if (item) {
      setEditingItem(item);
      setFormData(item);
    } else {
      setEditingItem(null);
      setFormData({ nombre: "", activo: true });
    }
    setIsModalOpen(true);
  };

  const handleProcessSave = async () => {
    if (!formData.nombre.trim()) return toast.error("El nombre es obligatorio");

    let newArray: T[];
    if (editingItem) {
      newArray = items.map((i) =>
        i.id === editingItem.id ? { ...formData } : i,
      );
    } else {
      newArray = [...items, { ...formData }];
    }

    const success = await onSave(newArray);
    if (success) setIsModalOpen(false);
  };

  const handleDelete = async () => {
    if (deleteId === null) return;
    const newArray = items.filter((i) => i.id !== deleteId);
    await onSave(newArray);
    setDeleteId(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder={`Buscar en ${title}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          onClick={() => handleOpenModal()}
          className="bg-brand-navy gap-2 rounded-xl"
        >
          <Plus className="h-4 w-4" /> Agregar
        </Button>
      </div>

      <div className="border rounded-xl overflow-hidden bg-white">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="font-bold">Nombre</TableHead>
              {columns?.map((col) => (
                <TableHead key={String(col.key)} className="font-bold">
                  {col.header}
                </TableHead>
              ))}
              <TableHead className="w-[100px] text-center font-bold">
                Estado
              </TableHead>
              <TableHead className="w-[100px] text-right font-bold">
                Acciones
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-10">
                  <Loader2 className="animate-spin mx-auto text-slate-400" />
                </TableCell>
              </TableRow>
            ) : filteredItems.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center py-10 text-slate-400"
                >
                  No hay registros
                </TableCell>
              </TableRow>
            ) : (
              filteredItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-bold text-slate-700">
                    {item.nombre}
                  </TableCell>
                  {columns?.map((col) => (
                    <TableCell key={String(col.key)}>{item[col.key]}</TableCell>
                  ))}
                  <TableCell className="text-center">
                    <Badge
                      className={
                        item.activo
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      }
                    >
                      {item.activo ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleOpenModal(item)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500"
                        onClick={() => setDeleteId(item.id!)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal Formulario */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Editar" : "Nuevo"} {title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nombre / Razón Social</Label>
              <Input
                value={formData.nombre}
                onChange={(e) =>
                  setFormData({ ...formData, nombre: e.target.value })
                }
              />
            </div>
            {extraFields && extraFields(formData, setFormData)}
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.activo}
                onCheckedChange={(val) =>
                  setFormData({ ...formData, activo: val })
                }
              />
              <Label>Registro Activo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleProcessSave} className="bg-brand-navy">
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmar Borrado */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600">
              Sí, eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
