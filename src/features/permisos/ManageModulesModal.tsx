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
      {/* CONTAINER: Estandarizado con glass-panel y la animación modal-show corregida */}
      <DialogContent className="sm:max-w-[750px] p-0 overflow-hidden glass-panel border-none shadow-2xl animate-modal-show">
        {/* HEADER: Deep Navy Translúcido con Spotlight */}
        <DialogHeader className="px-8 py-6 bg-brand-navy/95 backdrop-blur-md shrink-0 relative overflow-hidden border-b border-white/10">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />

          <div className="relative z-10 flex items-center gap-4">
            <div className="icon-plate p-2.5 rounded-xl">
              <LayoutDashboard className="h-5 w-5 text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]" />
            </div>
            <div className="flex flex-col">
              <DialogTitle className="text-2xl font-black heading-crisp text-slate-600 text-shadow-premium uppercase tracking-tighter">
                Catálogo de Permisos
              </DialogTitle>
              <DialogDescription className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.3em] mt-1">
                Administración de Módulos del Sistema
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* ÁREA DE TABLA: Enmarcada en un fondo translúcido con scroll controlado */}
        <div className="p-6 bg-white/40 backdrop-blur-sm overflow-y-auto max-h-[60vh] custom-scrollbar">
          <div className="rounded-2xl border border-white/40 bg-white/30 overflow-hidden shadow-xl">
            <Table className="liquid-glass-table">
              <TableHeader className="bg-slate-900/5 sticky top-0 backdrop-blur-md z-20">
                <TableRow className="hover:bg-transparent border-b border-white/20">
                  <TableHead className="w-[100px] text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Key ID
                  </TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Nombre
                  </TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Descripción
                  </TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Acciones
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {modules.map((m) => (
                  <TableRow
                    key={m.id}
                    className="hover:bg-white/50 transition-all border-b border-white/10 interactive-row"
                  >
                    {/* ID: Estilo Mono Industrial */}
                    <TableCell className="font-mono text-[11px] font-bold text-slate-400">
                      <span className="bg-slate-100/50 px-2 py-0.5 rounded border border-slate-200/50">
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
                              className="h-8 w-8 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 haptic-press"
                            >
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={cancelEdit}
                              className="h-8 w-8 text-rose-500 hover:bg-rose-50 haptic-press"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell className="text-sm font-black text-brand-navy uppercase tracking-tight">
                          {m.nombre}
                        </TableCell>
                        <TableCell className="text-xs text-slate-500 font-medium italic">
                          {m.descripcion || "--"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => startEdit(m)}
                              className="h-8 w-8 text-slate-400 hover:text-brand-navy hover:bg-white/60 transition-all haptic-press"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(m.id)}
                              className="h-8 w-8 text-slate-300 hover:text-destructive hover:bg-rose-50/50 transition-all haptic-press"
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
        </div>

        {/* FOOTER: Barra de estado mínima para cerrar el estilo Tahoe */}
        <div className="px-8 py-3 border-t border-white/20 bg-white/60 backdrop-blur-xl flex items-center justify-end">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 hover:bg-transparent"
          >
            Cerrar Catálogo
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
