import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { Pencil, Trash2, Save, X, LayoutDashboard, AlertTriangle } from "lucide-react";
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
        {/* CAPA 1: CASCARÓN */}
        <DialogContent className="w-[95vw] sm:max-w-3xl flex flex-col max-h-[90vh] overflow-hidden p-0 border-none shadow-2xl animate-modal-show bg-card/90 dark:bg-card/95 backdrop-blur-xl rounded-2xl">
          {/* CAPA 2: HEADER TAHOE */}
          <DialogHeader className="p-6 sm:px-8 sm:py-6 bg-card dark:bg-card border-b border-border shrink-0 relative overflow-hidden z-10">
            <div className="absolute inset-0 bg-gradient-to-br from-black/5 dark:from-white/5 to-transparent pointer-events-none" />
            <div className="relative z-10 flex items-center gap-4 sm:gap-5">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shadow-inner shrink-0 icon-plate border bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-white/10">
                <LayoutDashboard className="h-7 w-7 sm:h-8 sm:w-8 text-slate-500 dark:text-slate-400 drop-shadow-md" />
              </div>
              <div className="flex flex-col text-left min-w-0">
                <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-foreground heading-crisp leading-none">
                  Catálogo de Permisos
                </DialogTitle>
                <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-1">
                  Administración de Módulos del Sistema
                </p>
              </div>
            </div>
          </DialogHeader>

          {/* CAPA 3: BODY */}
          <div className="flex-1 overflow-y-auto px-6 pb-6 sm:px-8 sm:pb-8 bg-muted/30 dark:bg-transparent custom-scrollbar mt-4">
            <div className="border border-border rounded-2xl bg-card shadow-sm overflow-hidden">
              {/* Desktop: table */}
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
                                className="h-9 text-xs shadow-sm font-bold"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                value={editDesc}
                                onChange={(e) => setEditDesc(e.target.value)}
                                className="h-9 text-xs shadow-sm"
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleSave(m)}
                                  className="h-8 w-8 text-emerald-600 hover:bg-emerald-500/10 haptic-press"
                                >
                                  <Save className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={cancelEdit}
                                  className="h-8 w-8 text-destructive hover:bg-destructive/10 haptic-press"
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
                                  className="h-8 w-8 text-muted-foreground hover:text-foreground haptic-press"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setDeleteId(m.id)}
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive haptic-press"
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
                        <Button variant="ghost" size="icon" onClick={() => startEdit(m)} className="h-7 w-7 text-muted-foreground haptic-press">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(m.id)} className="h-7 w-7 text-muted-foreground hover:text-destructive haptic-press">
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

          {/* CAPA 5: FOOTER TAHOE */}
          <DialogFooter className="p-6 sm:p-8 bg-card/80 dark:bg-card/80 backdrop-blur-xl border-t border-border shrink-0 z-10">
            <div className="flex flex-col-reverse sm:flex-row justify-end items-stretch sm:items-center gap-3 w-full">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="w-full sm:w-auto haptic-press font-black uppercase tracking-widest text-[10px]"
              >
                Cerrar Catálogo
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog for destructive delete action */}
      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent className="w-[95vw] sm:max-w-2xl flex-col max-h-[90vh] overflow-hidden p-0 border-none shadow-2xl animate-modal-show bg-white/90 dark:bg-brand-navy/95 backdrop-blur-xl rounded-2xl">
          <AlertDialogHeader className="p-6 sm:p-8 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-white/10 shrink-0 relative overflow-hidden z-10">
            <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 dark:from-rose-500/10 to-transparent pointer-events-none" />
            <div className="relative z-10 flex items-center gap-4 sm:gap-5">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center shadow-inner shrink-0 icon-plate border border-rose-200 dark:border-rose-500/20">
                <AlertTriangle className="h-7 w-7 sm:h-8 sm:w-8 text-rose-600 dark:text-rose-400" />
              </div>
              <div className="flex flex-col gap-1 text-left">
                <AlertDialogTitle className="text-2xl font-black uppercase tracking-tighter text-rose-600 dark:text-rose-500 heading-crisp leading-none">
                  ¿Eliminar Módulo?
                </AlertDialogTitle>
                <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mt-1">
                  Acción Irreversible • Gestión de Permisos
                </p>
              </div>
            </div>
          </AlertDialogHeader>

          <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar bg-slate-50/50 dark:bg-transparent">
            <AlertDialogDescription className="text-slate-600 dark:text-slate-300 block space-y-6">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Los roles perderán este permiso de forma permanente.
              </p>

              <div className="p-5 bg-rose-50 dark:bg-rose-950/20 border-l-4 border-rose-500 rounded-r-2xl shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                  <h4 className="text-[10px] sm:text-[11px] font-black text-rose-800 dark:text-rose-400 uppercase tracking-widest">
                    Pérdida de Acceso
                  </h4>
                </div>
                <p className="text-xs sm:text-sm leading-relaxed text-rose-900 dark:text-rose-200/80">
                  Todos los usuarios con roles que incluyan este módulo perderán acceso inmediatamente.{" "}
                  <b className="font-black">Esta acción no se puede deshacer</b>.
                </p>
              </div>
            </AlertDialogDescription>
          </div>

          <AlertDialogFooter className="p-6 sm:p-8 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-t border-slate-200 dark:border-white/10 shrink-0">
            <div className="flex flex-col-reverse sm:flex-row sm:flex-wrap justify-end items-stretch sm:items-center gap-3 w-full">
              <AlertDialogCancel
                variant="outline"
                size="lg"
                className="w-full sm:w-auto haptic-press flex-shrink-0 font-black uppercase tracking-widest text-[10px]"
              >
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                size="lg"
                onClick={handleConfirmDelete}
                className="w-full sm:w-auto haptic-press shadow-rose-600/10 flex-shrink-0 border-none bg-rose-600 hover:bg-rose-700 text-white font-black uppercase tracking-widest text-[10px]"
              >
                Sí, Eliminar
              </AlertDialogAction>
            </div>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
