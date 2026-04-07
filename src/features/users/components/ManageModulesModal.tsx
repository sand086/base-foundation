import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { ModuleData } from "../types";

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
  const [deleteId, setDeleteId] = useState<string | null>(null);

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

  const handleConfirmDelete = async () => {
    if (deleteId) {
      await onDelete(deleteId);
      setDeleteId(null);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[95vw] sm:max-w-[750px] max-h-[90vh] p-0 overflow-hidden glass-panel border-none shadow-2xl animate-modal-show">
          {/* HEADER */}
          <DialogHeader className="px-5 sm:px-8 py-5 sm:py-6 bg-brand-navy/95 backdrop-blur-md shrink-0 relative overflow-hidden border-b border-white/10">
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
            <div className="relative z-10 flex items-center gap-4">
              <div className="icon-plate p-2.5 rounded-xl">
                <LayoutDashboard className="h-5 w-5 text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]" />
              </div>
              <div className="flex flex-col">
                <DialogTitle className="text-xl sm:text-2xl font-black heading-crisp text-white text-shadow-premium uppercase tracking-tighter">
                  Catálogo de Permisos
                </DialogTitle>
                <DialogDescription className="text-[10px] font-bold text-white/50 uppercase tracking-[0.3em] mt-1">
                  Administración de Módulos del Sistema
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* TABLE */}
          <div className="p-4 sm:p-6 bg-card/40 dark:bg-card/20 backdrop-blur-sm overflow-y-auto max-h-[60vh] custom-scrollbar">
            <div className="rounded-2xl border border-border overflow-hidden shadow-sm">
              {/* Mobile: card view, Desktop: table */}
              <div className="hidden sm:block overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/50 sticky top-0 backdrop-blur-md z-20">
                    <TableRow className="hover:bg-transparent border-b border-border">
                      <TableHead className="w-[100px] text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        Key ID
                      </TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        Nombre
                      </TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        Descripción
                      </TableHead>
                      <TableHead className="text-right text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        Acciones
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {modules.map((m) => (
                      <TableRow
                        key={m.id}
                        className="hover:bg-muted/30 transition-all border-b border-border/50"
                      >
                        <TableCell className="font-mono text-[11px] font-bold text-muted-foreground">
                          <span className="bg-muted px-2 py-0.5 rounded border border-border">
                            {m.id}
                          </span>
                        </TableCell>

                        {editingId === m.id ? (
                          <>
                            <TableCell>
                              <Input
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="h-9 text-xs glass-card border-brand-red/20 focus:ring-brand-red/20 font-bold"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                value={editDesc}
                                onChange={(e) => setEditDesc(e.target.value)}
                                className="h-9 text-xs glass-card border-brand-red/20 focus:ring-brand-red/20"
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleSave(m)}
                                  className="h-8 w-8 text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700"
                                >
                                  <Save className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={cancelEdit}
                                  className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </>
                        ) : (
                          <>
                            <TableCell className="text-sm font-black text-foreground uppercase tracking-tight">
                              {m.nombre}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground font-medium italic">
                              {m.descripcion || "--"}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => startEdit(m)}
                                  className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setDeleteId(m.id)}
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile: stacked cards */}
              <div className="sm:hidden divide-y divide-border">
                {modules.map((m) => (
                  <div key={m.id} className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded border border-border">
                        {m.id}
                      </span>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => startEdit(m)} className="h-7 w-7 text-muted-foreground">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(m.id)} className="h-7 w-7 text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm font-black text-foreground uppercase tracking-tight">{m.nombre}</p>
                    <p className="text-xs text-muted-foreground font-medium italic">{m.descripcion || "--"}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* FOOTER */}
          <div className="px-5 sm:px-8 py-3 border-t border-border bg-card/60 backdrop-blur-xl flex items-center justify-end">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-transparent"
            >
              Cerrar Catálogo
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* AlertDialog for destructive delete action */}
      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent className="glass-panel border-none shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="heading-crisp text-xl text-foreground">
              ¿Eliminar módulo?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              Los roles perderán este permiso. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-bold text-xs uppercase">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold text-xs uppercase"
            >
              Sí, Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
