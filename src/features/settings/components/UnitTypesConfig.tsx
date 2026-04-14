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
import { Switch } from "@/components/ui/switch";
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
import { Plus, Pencil, Trash2, Truck, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

//  Imports reales desde los tipos y el hook
import { UnitType } from "../types";
import { useUnitTypes } from "@/features/settings/hooks/useUnitTypes";
import { cn } from "@/lib/utils";

const emojis = [
  "🚛",
  "🚚",
  "📦",
  "❄️",
  "🛻",
  "🏗️",
  "🏭",
  "🚗",
  "🚐",
  "🚌",
  "🏎️",
  "🚜",
  "🚒",
  "🚑",
  "🚓",
  "🚕",
  "🚙",
  "🚎",
  "🚲",
  "🛴",
  "🛵",
  "🚤",
  "⛴️",
  "",
  "🛸",
];

export function UnitTypesConfig() {
  const { tiposUnidad, saveTiposUnidad, loading } = useUnitTypes();
  const [tipos, setTipos] = useState<UnitType[]>([]);

  // 1. Sincronizar el estado local cuando llegan los datos de Python
  useEffect(() => {
    if (!loading && tiposUnidad) {
      setTipos(tiposUnidad);
    }
  }, [tiposUnidad, loading]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTipo, setEditingTipo] = useState<UnitType | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // 2. Estado del formulario limpio y seguro
  const [formData, setFormData] = useState({
    id: "",
    nombre: "",
    descripcion: "",
    icono: "🚛",
  });

  const handleOpenNew = () => {
    setEditingTipo(null);
    setFormData({ id: "", nombre: "", descripcion: "", icono: "🚛" });
    setIsModalOpen(true);
  };

  const handleEdit = (tipo: UnitType) => {
    setEditingTipo(tipo);
    setFormData({
      id: tipo.id, // Es importante preservar el ID para no crear duplicados
      nombre: tipo.nombre,
      descripcion: tipo.descripcion || "",
      icono: tipo.icono,
    });
    setIsModalOpen(true);
  };

  // 3. Función de guardado dinámico (Crear o Actualizar)
  const handleSave = async () => {
    if (!formData.nombre.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }

    let updatedArray: UnitType[];

    if (editingTipo) {
      updatedArray = tipos.map((t) =>
        t.id === editingTipo.id ? { ...t, ...formData } : t,
      );
    } else {
      // Generar un ID único basado en el nombre (slug)
      const newId = formData.nombre
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-");

      // Validar que el ID no exista
      if (tipos.some((t) => t.id === newId)) {
        toast.error("Ya existe un tipo de unidad con ese nombre");
        return;
      }

      const newTipo: UnitType = {
        id: newId,
        nombre: formData.nombre,
        descripcion: formData.descripcion,
        icono: formData.icono,
        activo: true,
      };
      updatedArray = [...tipos, newTipo];
    }

    setTipos(updatedArray);
    await saveTiposUnidad(updatedArray); // Mandamos al backend
    setIsModalOpen(false);
  };

  const handleToggleActive = async (id: string) => {
    const updated = tipos.map((t) =>
      t.id === id ? { ...t, activo: !t.activo } : t,
    );
    setTipos(updated);
    await saveTiposUnidad(updated); // Mandamos al backend
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const updated = tipos.filter((t) => t.id !== deleteId);
    setTipos(updated);
    await saveTiposUnidad(updated); // Mandamos al backend
    setDeleteId(null);
  };

  return (
    <Card className="border-0 shadow-none bg-transparent">
      <CardHeader className="bg-slate-50/50 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-brand-navy">
              <Truck className="h-5 w-5 text-amber-500" />
              Catálogo de Vehículos
            </CardTitle>
            <CardDescription>
              Configura los tipos de unidades y remolques disponibles en la
              flota
            </CardDescription>
          </div>
          <Button
            onClick={handleOpenNew}
            className="gap-2 bg-brand-navy hover:bg-brand-navy/90 text-white rounded-xl"
            disabled={loading}
          >
            <Plus className="h-4 w-4" />
            Agregar Tipo
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        {loading ? (
          <div className="flex justify-center items-center py-12 text-slate-600">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tipos.map((tipo) => (
              <div
                key={tipo.id}
                className={cn(
                  "p-4 border rounded-xl transition-all",
                  tipo.activo
                    ? "bg-white hover:bg-slate-50 border-slate-200"
                    : "bg-slate-50 border-slate-200 opacity-60 grayscale-[50%]",
                )}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center text-2xl border border-slate-200 shadow-inner">
                      {tipo.icono}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800">
                        {tipo.nombre}
                      </h4>
                      <p className="text-[10px] text-slate-600 font-mono">
                        ID: {tipo.id}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={tipo.activo ? "default" : "secondary"}
                    className={
                      tipo.activo
                        ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                        : ""
                    }
                  >
                    {tipo.activo ? "Activo" : "Inactivo"}
                  </Badge>
                </div>

                {tipo.descripcion && (
                  <p className="text-xs text-slate-500 mb-4 h-8 line-clamp-2 leading-tight">
                    {tipo.descripcion}
                  </p>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={tipo.activo}
                      onCheckedChange={() => handleToggleActive(tipo.id)}
                    />
                  </div>
                  <div className="flex gap-1 border-l pl-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-slate-600 hover:text-brand-navy"
                      onClick={() => handleEdit(tipo)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-slate-600 hover:text-red-600 hover:bg-red-50"
                      onClick={() => setDeleteId(tipo.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Add/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-brand-navy font-black">
              {editingTipo
                ? "Editar Tipo de Vehículo"
                : "Nuevo Tipo de Vehículo"}
            </DialogTitle>
            <DialogDescription>
              Añade un icono representativo y una descripción para la asignación
              operativa.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-500 uppercase">
                Nombre de la Unidad *
              </Label>
              <Input
                placeholder="Ej: Tractor de Patio, Dolly..."
                value={formData.nombre}
                onChange={(e) =>
                  setFormData({ ...formData, nombre: e.target.value })
                }
                className="rounded-lg"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-500 uppercase">
                Descripción (Opcional)
              </Label>
              <Input
                placeholder="Descripción para los operadores"
                value={formData.descripcion}
                onChange={(e) =>
                  setFormData({ ...formData, descripcion: e.target.value })
                }
                className="rounded-lg"
              />
            </div>

            <div className="space-y-2 pt-2">
              <Label className="text-xs font-bold text-slate-500 uppercase">
                Seleccionar Icono Visual
              </Label>
              <div className="flex flex-wrap gap-2 p-3 bg-slate-50 border rounded-xl">
                {emojis.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setFormData({ ...formData, icono: emoji })}
                    className={cn(
                      "w-12 h-12 text-2xl rounded-xl border-2 transition-all flex items-center justify-center bg-white",
                      formData.icono === emoji
                        ? "border-brand-navy bg-brand-navy/5 shadow-inner scale-105"
                        : "border-slate-200 hover:border-brand-navy/30",
                    )}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="pt-6">
            <Button
              variant="ghost"
              onClick={() => setIsModalOpen(false)}
              className="rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              className="bg-brand-navy hover:bg-brand-navy/90 text-white rounded-xl"
            >
              {editingTipo ? "Guardar Cambios" : "Agregar Vehículo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="w-[95vw] sm:max-w-2xl flex-col max-h-[90vh] overflow-hidden p-0 border-none shadow-2xl animate-modal-show bg-white/90 dark:bg-brand-navy/95 backdrop-blur-xl rounded-2xl">
          <AlertDialogHeader className="p-6 sm:p-8 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-white/10 shrink-0 relative overflow-hidden z-10">
            <div className="absolute inset-0 bg-gradient-to-br from-black/5 dark:from-white/5 to-transparent pointer-events-none" />
            <div className="relative z-10 flex items-center gap-4 sm:gap-5">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center shadow-inner shrink-0 icon-plate border border-rose-200 dark:border-rose-500/20">
                <AlertTriangle className="h-7 w-7 sm:h-8 sm:w-8 text-rose-600 dark:text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.4)]" />
              </div>
              <div className="flex flex-col gap-1 text-left">
                <AlertDialogTitle className="text-2xl font-black uppercase tracking-tighter text-rose-600 dark:text-rose-500 heading-crisp leading-none">
                  ¿Eliminar tipo de unidad?
                </AlertDialogTitle>
                <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 mt-1">
                  Acción Irreversible • Configuración Flota
                </p>
              </div>
            </div>
          </AlertDialogHeader>

          <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar bg-slate-50/50 dark:bg-transparent">
            <AlertDialogDescription className="text-slate-600 dark:text-slate-300 block space-y-6">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Esta acción no se puede deshacer.
              </p>
              <div className="p-5 sm:p-6 bg-rose-50 dark:bg-rose-950/20 border-l-4 border-rose-500 rounded-r-2xl shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                  <h4 className="text-[10px] sm:text-[11px] font-black text-rose-800 dark:text-rose-400 uppercase tracking-widest">
                    Consecuencia
                  </h4>
                </div>
                <p className="text-xs sm:text-sm leading-relaxed text-rose-900 dark:text-rose-200/80">
                  Las unidades existentes de este tipo conservarán su identificador interno, pero <b className="font-black">perderán su icono</b> en la plataforma.
                </p>
              </div>
            </AlertDialogDescription>
          </div>

          <AlertDialogFooter className="p-6 sm:p-8 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-t border-slate-200 dark:border-white/10 shrink-0 z-10">
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
                onClick={handleDelete}
                className="w-full sm:w-auto haptic-press shadow-rose-600/10 flex-shrink-0 border-none bg-rose-600 hover:bg-rose-700 text-white font-black uppercase tracking-widest text-[10px]"
              >
                <Trash2 className="h-4 w-4 mr-2" /> Sí, Eliminar
              </AlertDialogAction>
            </div>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
