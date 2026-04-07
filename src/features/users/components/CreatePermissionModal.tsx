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
      <DialogContent className="w-[95vw] sm:max-w-[500px] max-h-[90vh] p-0 overflow-hidden glass-panel border-none shadow-2xl animate-modal-show">
        {/* HEADER */}
        <DialogHeader className="px-5 sm:px-8 py-5 sm:py-6 bg-brand-navy/95 backdrop-blur-md shrink-0 relative overflow-hidden border-b border-white/10">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
          <div className="relative z-10 flex items-center gap-4">
            <div className="icon-plate p-2.5 rounded-xl">
              <Key className="h-5 w-5 text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]" />
            </div>
            <div className="flex flex-col">
              <DialogTitle className="text-xl sm:text-2xl font-black heading-crisp text-white text-shadow-premium uppercase tracking-tighter">
                Nuevo Permiso
              </DialogTitle>
              <DialogDescription className="text-[10px] font-bold text-white/50 uppercase tracking-[0.3em] mt-1">
                Generación de Llave de Acceso
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* FORM BODY */}
        <form
          onSubmit={handleSubmit}
          className="p-5 sm:p-8 space-y-5 sm:space-y-6 bg-card/40 dark:bg-card/20 backdrop-blur-sm overflow-y-auto max-h-[calc(90vh-10rem)]"
        >
          {/* Module Select */}
          <div className="space-y-2">
            <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">
              Módulo del Sistema
            </Label>
            <Select value={selectedModulo} onValueChange={handleModuloChange}>
              <SelectTrigger className="h-12 glass-card border-border focus:ring-brand-red/20 font-bold text-foreground shadow-sm">
                <SelectValue placeholder="Selecciona un módulo..." />
              </SelectTrigger>
              <SelectContent className="glass-panel border-border">
                {modules.map((modulo) => (
                  <SelectItem key={modulo.id} value={modulo.id} className="font-semibold">
                    {modulo.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Action Select */}
          <div className="space-y-2">
            <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">
              Acción a Permitir
            </Label>
            <Select value={selectedAccion} onValueChange={handleAccionChange}>
              <SelectTrigger className="h-12 glass-card border-border font-bold text-foreground shadow-sm">
                <SelectValue placeholder="Selecciona una acción..." />
              </SelectTrigger>
              <SelectContent className="glass-panel border-border">
                {acciones.map((accion) => (
                  <SelectItem key={accion.id} value={accion.id}>
                    <span className="font-semibold">{accion.nombre}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Custom Action Input */}
          {selectedAccion === "otro" && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
              <Label className="text-[10px] font-black text-brand-red uppercase tracking-[0.2em] ml-1">
                Especificar Acción Personalizada
              </Label>
              <Input
                value={customAccion}
                onChange={(e) => handleCustomAccionChange(e.target.value)}
                placeholder="Ej: Aprobar solicitudes..."
                className="h-12 glass-card border-brand-red/20 focus:ring-brand-red/20 font-medium"
              />
            </div>
          )}

          {/* Generated Key Preview */}
          {generatedKey && (
            <div className="p-5 bg-foreground/95 dark:bg-card rounded-2xl border border-border shadow-2xl space-y-4 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent pointer-events-none" />

              <div className="flex items-center gap-2 relative z-10">
                <Sparkles className="h-4 w-4 text-emerald-400 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">
                  Permiso Generado
                </span>
              </div>

              <div className="space-y-3 relative z-10">
                <div className="flex items-center gap-3 bg-black/40 p-3 rounded-xl border border-white/5 shadow-inner">
                  <span className="text-[9px] font-black text-white/40 uppercase w-12">Key:</span>
                  <code className="text-sm font-mono font-bold text-white tracking-tight">
                    {generatedKey}
                  </code>
                </div>
                <div className="flex items-start gap-3 px-3">
                  <span className="text-[9px] font-black text-white/40 uppercase w-12 mt-1">Desc:</span>
                  <span className="text-xs text-white/70 font-medium leading-relaxed">
                    {getDescripcion()}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Info Box */}
          <div className="flex items-start gap-3 p-4 bg-accent rounded-2xl border border-border backdrop-blur-sm">
            <AlertCircle className="h-4 w-4 text-accent-foreground/60 mt-0.5 flex-shrink-0" />
            <p className="text-[11px] text-accent-foreground/80 font-semibold leading-relaxed">
              El permiso se agregará automáticamente a la matriz y podrá asignarse a cualquier rol del sistema.
            </p>
          </div>

          {/* FOOTER */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-6 border-t border-border">
            <Button
              type="button"
              variant="ghost"
              onClick={handleClose}
              className="h-11 px-6 text-[11px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-transparent"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSaving || !generatedKey}
              className="btn-primary-gradient h-11 px-8 font-black uppercase text-[11px] tracking-[0.2em] shadow-lg disabled:opacity-50"
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
        </form>
      </DialogContent>
    </Dialog>
  );
}
