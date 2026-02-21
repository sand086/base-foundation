import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pencil, Trash2, Save, X, LayoutDashboard } from "lucide-react";
import { ModuleData } from "@/services/roleService";

interface ManageModulesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modules: ModuleData[];
  onUpdate: (id: string, data: ModuleData) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
}

export function ManageModulesModal({
  open,
  onOpenChange,
  modules,
  onUpdate,
  onDelete,
}: ManageModulesModalProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");

  const startEdit = (mod: ModuleData) => {
    setEditingId(mod.id);
    setEditName(mod.nombre);
    setEditDesc(mod.descripcion || "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditDesc("");
  };

  const handleSave = async (mod: ModuleData) => {
    const success = await onUpdate(mod.id, {
      ...mod,
      nombre: editName,
      descripcion: editDesc,
    });
    if (success) cancelEdit();
  };

  const handleDelete = async (id: string) => {
    if (
      confirm(
        "¿Estás seguro de eliminar este módulo? Los roles perderán este permiso.",
      )
    ) {
      await onDelete(id);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LayoutDashboard className="h-5 w-5 text-primary" />
            Administrar Catálogo de Permisos (Módulos)
          </DialogTitle>
          <DialogDescription>
            Edita o elimina los módulos existentes en el sistema.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 border rounded-lg overflow-hidden">
          <Table>
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead>Key ID</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {modules.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-mono text-xs">{m.id}</TableCell>

                  {editingId === m.id ? (
                    <>
                      <TableCell>
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="h-8 text-xs"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={editDesc}
                          onChange={(e) => setEditDesc(e.target.value)}
                          className="h-8 text-xs"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleSave(m)}
                          className="h-8 w-8 text-green-600"
                        >
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={cancelEdit}
                          className="h-8 w-8 text-muted-foreground"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell className="text-sm font-medium">
                        {m.nombre}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {m.descripcion || "--"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => startEdit(m)}
                          className="h-8 w-8"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(m.id)}
                          className="h-8 w-8 text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
