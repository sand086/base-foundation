import { useState } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  Route,
  ArrowRight,
  MapPin,
  Clock,
  Ruler,
  Loader2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { toast } from "sonner";

// 🚀 Imports reales
import { cn } from "@/lib/utils";
import { useRutasAutorizadas } from "@/hooks/useRutasAutorizadas";
import { RutaAutorizada } from "@/types/api.types";

export const RutasAutorizadasConfig = () => {
  const {
    rutas,
    isLoading,
    addRuta,
    updateRuta,
    deleteRuta,
    toggleRutaActivo,
  } = useRutasAutorizadas();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [rutaToDelete, setRutaToDelete] = useState<number | null>(null); // 🚀 ID numérico
  const [editingRuta, setEditingRuta] = useState<RutaAutorizada | null>(null);

  // 🚀 Estado usando snake_case para coincidir con backend
  const [formData, setFormData] = useState({
    origen: "",
    destino: "",
    descripcion: "",
    distancia_km: "",
    tiempo_estimado_horas: "",
  });

  const handleOpenDialog = (ruta?: RutaAutorizada) => {
    if (ruta) {
      setEditingRuta(ruta);
      setFormData({
        origen: ruta.origen,
        destino: ruta.destino,
        descripcion: ruta.descripcion || "",
        distancia_km: ruta.distancia_km?.toString() || "",
        tiempo_estimado_horas: ruta.tiempo_estimado_horas?.toString() || "",
      });
    } else {
      setEditingRuta(null);
      setFormData({
        origen: "",
        destino: "",
        descripcion: "",
        distancia_km: "",
        tiempo_estimado_horas: "",
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.origen.trim() || !formData.destino.trim()) {
      toast.error("Origen y Destino son obligatorios");
      return;
    }

    const rutaData = {
      origen: formData.origen.trim(),
      destino: formData.destino.trim(),
      descripcion: formData.descripcion.trim() || undefined,
      distancia_km: formData.distancia_km
        ? parseInt(formData.distancia_km)
        : undefined,
      tiempo_estimado_horas: formData.tiempo_estimado_horas
        ? parseInt(formData.tiempo_estimado_horas)
        : undefined,
      activo: editingRuta ? editingRuta.activo : true, // Mantiene el estado si se edita, o true si es nueva
    };

    let success = false;
    if (editingRuta) {
      success = await updateRuta(editingRuta.id, rutaData);
      if (success) toast.success("Ruta actualizada correctamente");
    } else {
      success = await addRuta(rutaData);
      if (success) toast.success("Nueva ruta agregada al catálogo");
    }

    if (success) setDialogOpen(false);
  };

  const handleConfirmDelete = async () => {
    if (rutaToDelete) {
      const success = await deleteRuta(rutaToDelete);
      if (success) toast.success("Ruta eliminada del catálogo");
      setDeleteDialogOpen(false);
      setRutaToDelete(null);
    }
  };

  const handleToggleActivo = async (id: number, currentState: boolean) => {
    const success = await toggleRutaActivo(id, currentState);
    if (success)
      toast.success(currentState ? "Ruta desactivada" : "Ruta activada");
  };

  return (
    <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden">
      <CardHeader className="bg-slate-50/50 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-brand-navy">
              <Route className="h-5 w-5 text-sky-500" />
              Rutas Autorizadas
            </CardTitle>
            <CardDescription>
              Catálogo de rutas disponibles para cálculo de tarifas y asignación
              de despachos
            </CardDescription>
          </div>
          <Button
            onClick={() => handleOpenDialog()}
            className="gap-2 bg-brand-navy text-white hover:bg-brand-navy/90 rounded-xl"
          >
            <Plus className="h-4 w-4" /> Nueva Ruta
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        {isLoading ? (
          <div className="flex justify-center items-center py-12 text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="space-y-3">
            {rutas.map((ruta) => (
              <div
                key={ruta.id}
                className={cn(
                  "flex items-center justify-between p-4 rounded-xl border transition-colors",
                  ruta.activo
                    ? "bg-white hover:bg-slate-50 border-slate-200"
                    : "bg-slate-50 border-slate-200 opacity-60 grayscale-[50%]",
                )}
              >
                <div className="flex items-center gap-4">
                  <div className="p-2.5 rounded-xl bg-sky-50 border border-sky-100">
                    <MapPin className="h-5 w-5 text-sky-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 font-bold text-slate-800">
                      <span>{ruta.origen}</span>
                      <ArrowRight className="h-4 w-4 text-slate-400" />
                      <span>{ruta.destino}</span>
                    </div>
                    {ruta.descripcion && (
                      <p className="text-sm text-slate-500 mt-0.5">
                        {ruta.descripcion}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-2">
                      {ruta.distancia_km && (
                        <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-md">
                          <Ruler className="h-3 w-3" /> {ruta.distancia_km} km
                        </span>
                      )}
                      {ruta.tiempo_estimado_horas && (
                        <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-md">
                          <Clock className="h-3 w-3" /> ~
                          {ruta.tiempo_estimado_horas} hrs
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <Badge
                    variant={ruta.activo ? "default" : "secondary"}
                    className={
                      ruta.activo
                        ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                        : ""
                    }
                  >
                    {ruta.activo ? "Activa" : "Inactiva"}
                  </Badge>

                  <div className="flex items-center gap-2 border-r pr-4 mr-2">
                    <Switch
                      checked={ruta.activo}
                      onCheckedChange={() =>
                        handleToggleActivo(ruta.id, ruta.activo)
                      }
                    />
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenDialog(ruta)}
                    className="text-slate-400 hover:text-brand-navy"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-slate-400 hover:text-red-600 hover:bg-red-50"
                    onClick={() => {
                      setRutaToDelete(ruta.id);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            {rutas.length === 0 && (
              <div className="text-center py-12 text-slate-400 border-2 border-dashed rounded-xl">
                <Route className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p className="font-bold text-slate-500">
                  No hay rutas registradas
                </p>
                <p className="text-sm">
                  Agrega la primera ruta al catálogo para utilizarla en tarifas.
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-brand-navy font-black">
              {editingRuta ? "Editar Ruta Autorizada" : "Nueva Ruta Autorizada"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label
                  htmlFor="origen"
                  className="text-xs font-bold text-slate-500 uppercase"
                >
                  Origen *
                </Label>
                <Input
                  id="origen"
                  placeholder="Ej: CDMX"
                  value={formData.origen}
                  onChange={(e) =>
                    setFormData({ ...formData, origen: e.target.value })
                  }
                  className="rounded-lg"
                />
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="destino"
                  className="text-xs font-bold text-slate-500 uppercase"
                >
                  Destino *
                </Label>
                <Input
                  id="destino"
                  placeholder="Ej: Veracruz Puerto"
                  value={formData.destino}
                  onChange={(e) =>
                    setFormData({ ...formData, destino: e.target.value })
                  }
                  className="rounded-lg"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="descripcion"
                className="text-xs font-bold text-slate-500 uppercase"
              >
                Descripción Corta
              </Label>
              <Input
                id="descripcion"
                placeholder="Ej: Ruta principal corredor automotriz"
                value={formData.descripcion}
                onChange={(e) =>
                  setFormData({ ...formData, descripcion: e.target.value })
                }
                className="rounded-lg"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label
                  htmlFor="distancia_km"
                  className="text-xs font-bold text-slate-500 uppercase"
                >
                  Distancia Total (km)
                </Label>
                <Input
                  id="distancia_km"
                  type="number"
                  placeholder="Ej: 420"
                  value={formData.distancia_km}
                  onChange={(e) =>
                    setFormData({ ...formData, distancia_km: e.target.value })
                  }
                  className="rounded-lg font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="tiempo_estimado_horas"
                  className="text-xs font-bold text-slate-500 uppercase"
                >
                  Tiempo Estimado (hrs)
                </Label>
                <Input
                  id="tiempo_estimado_horas"
                  type="number"
                  placeholder="Ej: 6"
                  value={formData.tiempo_estimado_horas}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      tiempo_estimado_horas: e.target.value,
                    })
                  }
                  className="rounded-lg font-mono"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="pt-6">
            <Button
              variant="ghost"
              onClick={() => setDialogOpen(false)}
              className="rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              className="bg-brand-navy text-white hover:bg-brand-navy/90 rounded-xl"
            >
              {editingRuta ? "Guardar Cambios" : "Registrar Ruta"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600 font-black flex items-center gap-2">
              <Trash2 className="h-5 w-5" /> ¿Eliminar ruta del catálogo?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600">
              Esta acción no se puede deshacer. Los viajes y tarifas existentes
              que ya utilizan esta ruta conservarán los datos históricos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel className="rounded-xl font-bold">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 text-white hover:bg-red-700 rounded-xl font-bold"
            >
              Sí, eliminar ruta
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
