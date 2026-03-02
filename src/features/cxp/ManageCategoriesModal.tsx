// src/features/cxp/ManageCategoriesModal.tsx
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Edit2, Check, X, Settings2 } from "lucide-react";
import { IndirectCategory } from "@/types/api.types";
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-brand-dark" />
            Administrar Categorías de Gasto
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2 mt-4 max-h-[60vh] overflow-y-auto pr-2">
          {categories.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-4">
              No hay categorías registradas.
            </p>
          )}

          {categories.map((cat) => (
            <div
              key={cat.id}
              className="flex items-center justify-between p-3 border rounded-lg bg-slate-50"
            >
              {editingId === cat.id ? (
                <div className="flex items-center gap-2 flex-1 mr-4">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="h-8 text-sm"
                    autoFocus
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => saveEdit(cat.id)}
                    className="h-8 w-8 text-emerald-600"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setEditingId(null)}
                    className="h-8 w-8 text-slate-400"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex flex-col">
                    <span className="font-medium text-sm text-slate-800">
                      {cat.nombre}
                    </span>
                    <Badge
                      variant="outline"
                      className="w-fit text-[9px] mt-1 bg-white"
                    >
                      {cat.tipo.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-blue-600"
                      onClick={() => startEdit(cat)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-red-500"
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
      </DialogContent>
    </Dialog>
  );
}
