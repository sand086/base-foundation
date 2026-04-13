// src/features/cxp/ManageCategoriesModal.tsx
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Edit2, Check, X, Settings2 } from "lucide-react";
import { IndirectCategory } from "@/features/payables/types";
import { Badge } from "@/components/ui/badge";

interface ManageCategoriesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: IndirectCategory[];
  onUpdate: (id: number, data: Partial<IndirectCategory>) => Promise<boolean>;
  onDelete: (id: number) => Promise<boolean>;
}

export function ManageCategoriesModal({
  open,
  onOpenChange,
  categories,
  onUpdate,
  onDelete,
}: ManageCategoriesModalProps) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");

  const startEdit = (cat: IndirectCategory) => {
    setEditingId(cat.id);
    setEditName(cat.nombre);
  };

  const saveEdit = async (id: number) => {
    if (!editName.trim()) return;
    const ok = await onUpdate(id, { nombre: editName.trim() });
    if (ok) setEditingId(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* CAPA 1: CASCARÓN */}
      <DialogContent className="w-[95vw] sm:max-w-[520px] flex flex-col max-h-[90vh] overflow-hidden p-0 border-none shadow-2xl animate-modal-show bg-card/90 dark:bg-card/95 backdrop-blur-xl rounded-2xl">
        {/* CAPA 2: HEADER TAHOE */}
        <DialogHeader className="p-6 sm:px-8 sm:py-6 bg-card dark:bg-card border-b border-border shrink-0 relative overflow-hidden z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-black/5 dark:from-white/5 to-transparent pointer-events-none" />
          <div className="relative z-10 flex items-center gap-4 sm:gap-5">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shadow-inner shrink-0 icon-plate border bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-white/10">
              <Settings2 className="h-7 w-7 sm:h-8 sm:w-8 text-slate-500 dark:text-slate-400 drop-shadow-md" />
            </div>
            <div className="flex flex-col text-left min-w-0">
              <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-foreground heading-crisp leading-none">
                Administrar Categorías
              </DialogTitle>
              <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-1">
                Categorías de Gasto
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* CAPA 3: BODY */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 sm:px-8 sm:pb-8 bg-muted/30 dark:bg-transparent custom-scrollbar space-y-3 mt-4">
          {categories.length === 0 && (
            <p className="text-center text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground py-8">
              No hay categorías registradas.
            </p>
          )}

          {categories.map((cat) => (
            <div
              key={cat.id}
              className="flex items-center justify-between p-4 border border-border rounded-2xl bg-card shadow-sm transition-all duration-300 ease-out hover:shadow-md"
            >
              {editingId === cat.id ? (
                <div className="flex items-center gap-2 flex-1 mr-4">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="h-11 shadow-sm font-bold uppercase"
                    autoFocus
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => saveEdit(cat.id)}
                    className="h-8 w-8 text-emerald-600 dark:text-emerald-400 haptic-press"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setEditingId(null)}
                    className="h-8 w-8 text-muted-foreground haptic-press"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex flex-col">
                    <span className="font-bold text-sm text-foreground tracking-tight uppercase">
                      {cat.nombre}
                    </span>
                    <Badge
                      variant="outline"
                      className="w-fit text-[9px] font-black uppercase tracking-[0.15em] mt-1 border-border"
                    >
                      {cat.tipo.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground haptic-press"
                      onClick={() => startEdit(cat)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive haptic-press"
                      onClick={() => onDelete(cat.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))}
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
  );
}
