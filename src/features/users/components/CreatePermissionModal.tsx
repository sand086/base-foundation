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
  {
    id: "crear",
    nombre: "Crear",
    descripcion: "Permite crear nuevos registros",
  },
  {
    id: "leer",
    nombre: "Leer",
    descripcion: "Permite ver/consultar información",
  },
  {
    id: "actualizar",
    nombre: "Actualizar",
    descripcion: "Permite modificar registros existentes",
  },
  {
    id: "eliminar",
    nombre: "Eliminar",
    descripcion: "Permite borrar registros",
  },
  {
    id: "exportar",
    nombre: "Exportar",
    descripcion: "Permite descargar/exportar datos",
  },
  {
    id: "aprobar",
    nombre: "Aprobar",
    descripcion: "Permite aprobar solicitudes o procesos",
  },
  {
    id: "otro",
    nombre: "Otro (Especificar)",
    descripcion: "Acción personalizada",
  },
];

export function CreatePermissionModal({
  open,
  onOpenChange,
  onSubmit,
}: CreatePermissionModalProps) {
  // Traemos los módulos desde el backend usando nuestro hook
  const { modules } = useRoles();

  const [isSaving, setIsSaving] = useState(false);
  const [selectedModulo, setSelectedModulo] = useState("");
  const [selectedAccion, setSelectedAccion] = useState("");
  const [customAccion, setCustomAccion] = useState("");
  const [generatedKey, setGeneratedKey] = useState("");

  // Generate key automatically from selections
  const generateKey = (modulo: string, accion: string, custom?: string) => {
    if (!modulo) return "";

    const moduloKey = modulo.toLowerCase().replace(/\s+/g, "_");

    if (accion === "otro" && custom) {
      const customKey = custom
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/[^a-z0-9_]/g, "");
      return `${moduloKey}_${customKey}`;
    }

    if (accion) {
      return `${moduloKey}_${accion}`;
    }

    return moduloKey;
  };

  const handleModuloChange = (value: string) => {
    setSelectedModulo(value);
    setGeneratedKey(generateKey(value, selectedAccion, customAccion));
  };

  const handleAccionChange = (value: string) => {
    setSelectedAccion(value);
    if (value !== "otro") {
      setCustomAccion("");
    }
    setGeneratedKey(generateKey(selectedModulo, value, customAccion));
  };

  const handleCustomAccionChange = (value: string) => {
    setCustomAccion(value);
    setGeneratedKey(generateKey(selectedModulo, selectedAccion, value));
  };

  const getDescripcion = () => {
    const moduloNombre =
      modules.find((m) => m.id === selectedModulo)?.nombre || "";
    const accionNombre =
      acciones.find((a) => a.id === selectedAccion)?.nombre || "";

    if (selectedAccion === "otro" && customAccion) {
      return `Permite ${customAccion.toLowerCase()} en ${moduloNombre}`;
    }

    if (moduloNombre && accionNombre) {
      return `Permite ${accionNombre.toLowerCase()} en ${moduloNombre}`;
    }

    return "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedModulo || !selectedAccion) {
      toast.error("Campos requeridos", {
        description: "Selecciona un módulo y una acción.",
      });
      return;
    }

    if (selectedAccion === "otro" && !customAccion.trim()) {
      toast.error("Acción requerida", {
        description: "Especifica la acción personalizada.",
      });
      return;
    }

    setIsSaving(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 800));

    const descripcion = getDescripcion();
    const accionFinal =
      selectedAccion === "otro" ? customAccion : selectedAccion;

    onSubmit({
      key: generatedKey,
      descripcion,
      modulo: selectedModulo,
      accion: accionFinal,
    });

    setIsSaving(false);
    toast.success("Permiso creado", {
      description: `El permiso "${generatedKey}" ha sido agregado.`,
    });

    // Reset form
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
      {/* CONTAINER: Estandarizado con glass-panel y la animación corregida */}
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden glass-panel border-none shadow-2xl animate-modal-show">
        {/* HEADER: Deep Navy con Spotlight y Placa de Icono */}
        <DialogHeader className="px-8 py-6 bg-brand-navy/95 backdrop-blur-md shrink-0 relative overflow-hidden border-b border-white/10">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />

          <div className="relative z-10 flex items-center gap-4">
            <div className="icon-plate p-2.5 rounded-xl">
              <Key className="h-5 w-5 text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]" />
            </div>
            <div className="flex flex-col">
              <DialogTitle className="text-2xl font-black heading-crisp text-slate-600 text-shadow-premium uppercase tracking-tighter">
                Nuevo Permiso
              </DialogTitle>
              <DialogDescription className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.3em] mt-1">
                Generación de Llave de Acceso
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* FORM BODY: Fondo de cristal translúcido */}
        <form
          onSubmit={handleSubmit}
          className="p-8 space-y-6 bg-white/40 backdrop-blur-sm"
        >
          {/* Module Select */}
          <div className="space-y-2">
            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
              Módulo del Sistema
            </Label>
            <Select value={selectedModulo} onValueChange={handleModuloChange}>
              <SelectTrigger className="h-12 glass-card border-slate-200 focus:ring-brand-red/20 font-bold text-slate-700 shadow-sm">
                <SelectValue placeholder="Selecciona un módulo..." />
              </SelectTrigger>
              <SelectContent className="glass-panel border-white/20">
                {modules.map((modulo) => (
                  <SelectItem
                    key={modulo.id}
                    value={modulo.id}
                    className="font-semibold"
                  >
                    {modulo.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Action Select */}
          <div className="space-y-2">
            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
              Acción a Permitir
            </Label>
            <Select value={selectedAccion} onValueChange={handleAccionChange}>
              <SelectTrigger className="h-12 glass-card border-slate-200 font-bold text-slate-700 shadow-sm">
                <SelectValue placeholder="Selecciona una acción..." />
              </SelectTrigger>
              <SelectContent className="glass-panel border-white/20">
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

          {/* Generated Key Preview: Usamos un diseño de "Tarjeta Industrial" */}
          {generatedKey && (
            <div className="p-5 bg-slate-900 rounded-2xl border border-white/10 shadow-2xl space-y-4 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent pointer-events-none" />

              <div className="flex items-center gap-2 relative z-10">
                <Sparkles className="h-4 w-4 text-emerald-400 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">
                  Permiso Generado
                </span>
              </div>

              <div className="space-y-3 relative z-10">
                <div className="flex items-center gap-3 bg-black/40 p-3 rounded-xl border border-white/5 shadow-inner">
                  <span className="text-[9px] font-black text-slate-500 uppercase w-12">
                    Key:
                  </span>
                  <code className="text-sm font-mono font-bold text-slate-600 tracking-tight">
                    {generatedKey}
                  </code>
                </div>
                <div className="flex items-start gap-3 px-3">
                  <span className="text-[9px] font-black text-slate-500 uppercase w-12 mt-1">
                    Desc:
                  </span>
                  <span className="text-xs text-slate-300 font-medium leading-relaxed">
                    {getDescripcion()}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Info Box: Estilo Tahoe Alert */}
          <div className="flex items-start gap-3 p-4 bg-blue-500/5 rounded-2xl border border-blue-500/10 backdrop-blur-sm">
            <AlertCircle className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
            <p className="text-[11px] text-blue-700/80 font-semibold leading-relaxed">
              El permiso se agregará automáticamente a la matriz y podrá
              asignarse a cualquier rol del sistema.
            </p>
          </div>

          {/* FOOTER: Barra de acciones Safari-style */}
          <div className="flex justify-end gap-3 pt-6 border-t border-white/20">
            <Button
              type="button"
              variant="ghost"
              onClick={handleClose}
              className="h-11 px-6 text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 hover:bg-transparent"
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
