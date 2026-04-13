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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Key, Loader2, Sparkles, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useRoles } from "@/features/users/hooks/useRoles";

interface CreatePermissionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    key: string;
    descripcion: string;
    modulo: string;
    accion: string;
  }) => void;
}

const acciones = [
  { id: "crear", nombre: "Crear", descripcion: "Permite crear nuevos registros" },
  { id: "leer", nombre: "Leer", descripcion: "Permite ver/consultar información" },
  { id: "actualizar", nombre: "Actualizar", descripcion: "Permite modificar registros existentes" },
  { id: "eliminar", nombre: "Eliminar", descripcion: "Permite borrar registros" },
  { id: "exportar", nombre: "Exportar", descripcion: "Permite descargar/exportar datos" },
  { id: "aprobar", nombre: "Aprobar", descripcion: "Permite aprobar solicitudes o procesos" },
  { id: "otro", nombre: "Otro (Especificar)", descripcion: "Acción personalizada" },
];

export function CreatePermissionModal({
  open,
  onOpenChange,
  onSubmit,
}: CreatePermissionModalProps) {
  const { modules } = useRoles();

  const [isSaving, setIsSaving] = useState(false);
  const [selectedModulo, setSelectedModulo] = useState("");
  const [selectedAccion, setSelectedAccion] = useState("");
  const [customAccion, setCustomAccion] = useState("");
  const [generatedKey, setGeneratedKey] = useState("");

  const generateKey = (modulo: string, accion: string, custom?: string) => {
    if (!modulo) return "";
    const moduloKey = modulo.toLowerCase().replace(/\s+/g, "_");
    if (accion === "otro" && custom) {
      const customKey = custom.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
      return `${moduloKey}_${customKey}`;
    }
    if (accion) return `${moduloKey}_${accion}`;
    return moduloKey;
  };

  const handleModuloChange = (value: string) => {
    setSelectedModulo(value);
    setGeneratedKey(generateKey(value, selectedAccion, customAccion));
  };

  const handleAccionChange = (value: string) => {
    setSelectedAccion(value);
    if (value !== "otro") setCustomAccion("");
    setGeneratedKey(generateKey(selectedModulo, value, customAccion));
  };

  const handleCustomAccionChange = (value: string) => {
    setCustomAccion(value);
    setGeneratedKey(generateKey(selectedModulo, selectedAccion, value));
  };

  const getDescripcion = () => {
    const moduloNombre = modules.find((m) => m.id === selectedModulo)?.nombre || "";
    const accionNombre = acciones.find((a) => a.id === selectedAccion)?.nombre || "";
    if (selectedAccion === "otro" && customAccion) return `Permite ${customAccion.toLowerCase()} en ${moduloNombre}`;
    if (moduloNombre && accionNombre) return `Permite ${accionNombre.toLowerCase()} en ${moduloNombre}`;
    return "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedModulo || !selectedAccion) {
      toast.error("Campos requeridos", { description: "Selecciona un módulo y una acción." });
      return;
    }

    if (selectedAccion === "otro" && !customAccion.trim()) {
      toast.error("Acción requerida", { description: "Especifica la acción personalizada." });
      return;
    }

    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 800));

    const descripcion = getDescripcion();
    const accionFinal = selectedAccion === "otro" ? customAccion : selectedAccion;

    onSubmit({ key: generatedKey, descripcion, modulo: selectedModulo, accion: accionFinal });

    setIsSaving(false);
    toast.success("Permiso creado", { description: `El permiso "${generatedKey}" ha sido agregado.` });

    setSelectedModulo("");
    setSelectedAccion("");
    setCustomAccion("");
    setGeneratedKey("");
    onOpenChange(false);
  };

  const handleClose = () => {
    setSelectedModulo("");
    setSelectedAccion("");
    setCustomAccion("");
    setGeneratedKey("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      {/* CAPA 1: CASCARÓN */}
      <DialogContent className="w-[95vw] sm:max-w-[520px] flex flex-col max-h-[90vh] overflow-hidden p-0 border-none shadow-2xl animate-modal-show bg-card/90 dark:bg-card/95 backdrop-blur-xl rounded-2xl">
        {/* CAPA 2: HEADER TAHOE */}
        <DialogHeader className="p-6 sm:px-8 sm:py-6 bg-card dark:bg-card border-b border-border shrink-0 relative overflow-hidden z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-black/5 dark:from-white/5 to-transparent pointer-events-none" />
          <div className="relative z-10 flex items-center gap-4 sm:gap-5">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shadow-inner shrink-0 icon-plate border bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-white/10">
              <Key className="h-7 w-7 sm:h-8 sm:w-8 text-slate-500 dark:text-slate-400 drop-shadow-md" />
            </div>
            <div className="flex flex-col text-left min-w-0">
              <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-foreground heading-crisp leading-none">
                Nuevo Permiso
              </DialogTitle>
              <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-1">
                Generación de Llave de Acceso
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* CAPA 3: BODY FORMULARIO */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 min-h-0 overflow-hidden flex flex-col"
        >
          <div className="flex-1 overflow-y-auto px-6 pb-6 sm:px-8 sm:pb-8 bg-muted/30 dark:bg-transparent custom-scrollbar space-y-8 mt-4">
            {/* Tarjeta: Módulo y Acción */}
            <div className="p-5 border border-border rounded-2xl bg-card shadow-sm space-y-5">
              <div className="space-y-1.5">
                <Label variant="brand" required>
                  Módulo del Sistema
                </Label>
                <Select value={selectedModulo} onValueChange={handleModuloChange}>
                  <SelectTrigger className="h-11 shadow-sm font-bold">
                    <SelectValue placeholder="Selecciona un módulo..." />
                  </SelectTrigger>
                  <SelectContent className="glass-panel border-border dark:border-white/10 backdrop-blur-xl">
                    {modules.map((modulo) => (
                      <SelectItem key={modulo.id} value={modulo.id} className="font-semibold">
                        {modulo.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label variant="brand" required>
                  Acción a Permitir
                </Label>
                <Select value={selectedAccion} onValueChange={handleAccionChange}>
                  <SelectTrigger className="h-11 shadow-sm font-bold">
                    <SelectValue placeholder="Selecciona una acción..." />
                  </SelectTrigger>
                  <SelectContent className="glass-panel border-border dark:border-white/10 backdrop-blur-xl">
                    {acciones.map((accion) => (
                      <SelectItem key={accion.id} value={accion.id}>
                        <span className="font-semibold">{accion.nombre}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedAccion === "otro" && (
                <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-300">
                  <Label variant="brand" required className="text-destructive">
                    Especificar Acción Personalizada
                  </Label>
                  <Input
                    value={customAccion}
                    onChange={(e) => handleCustomAccionChange(e.target.value)}
                    placeholder="Ej: Aprobar solicitudes..."
                    className="h-11 shadow-sm font-bold uppercase"
                  />
                </div>
              )}
            </div>

            {/* Generated Key Preview */}
            {generatedKey && (
              <div className="p-5 border border-border rounded-2xl bg-card shadow-sm space-y-4 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent pointer-events-none" />

                <div className="flex items-center gap-2 relative z-10">
                  <Sparkles className="h-4 w-4 text-emerald-500 dark:text-emerald-400 animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">
                    Permiso Generado
                  </span>
                </div>

                <div className="space-y-3 relative z-10">
                  <div className="flex items-center gap-3 bg-muted/50 p-3 rounded-xl border border-border">
                    <span className="text-[9px] font-black text-muted-foreground uppercase w-12">Key:</span>
                    <code className="text-sm font-mono font-bold text-foreground tracking-tight">
                      {generatedKey}
                    </code>
                  </div>
                  <div className="flex items-start gap-3 px-3">
                    <span className="text-[9px] font-black text-muted-foreground uppercase w-12 mt-1">Desc:</span>
                    <span className="text-xs text-muted-foreground font-medium leading-relaxed">
                      {getDescripcion()}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Info Box */}
            <div className="flex items-start gap-3 p-4 border border-border rounded-2xl bg-card shadow-sm">
              <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <p className="text-[11px] text-muted-foreground font-semibold leading-relaxed">
                El permiso se agregará automáticamente a la matriz y podrá asignarse a cualquier rol del sistema.
              </p>
            </div>
          </div>

          {/* CAPA 5: FOOTER TAHOE */}
          <DialogFooter className="p-6 sm:p-8 bg-card/80 dark:bg-card/80 backdrop-blur-xl border-t border-border shrink-0 z-10">
            <div className="flex flex-col-reverse sm:flex-row justify-end items-stretch sm:items-center gap-3 w-full">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="w-full sm:w-auto haptic-press font-black uppercase tracking-widest text-[10px]"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSaving || !generatedKey}
                className="w-full sm:w-auto haptic-press border-none text-white bg-brand-red hover:bg-brand-red/90 shadow-[0_4px_15px_rgba(190,8,17,0.3)] font-black uppercase tracking-widest text-[10px]"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Procesando...
                  </>
                ) : (
                  "Crear Permiso"
                )}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
