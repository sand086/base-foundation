import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HardHat } from "lucide-react";
import { Mechanic } from "@/types/api.types";

// Importamos los submódulos que acabamos de crear
import { MechanicDetail } from "./MechanicDetail";
import { MechanicDocuments } from "./MechanicDocuments";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mechanic: Mechanic | null;
}

export function MechanicExpedienteModal({
  open,
  onOpenChange,
  mechanic,
}: Props) {
  if (!mechanic) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
        {/* HEADER OSCURO (Estático) */}
        <div className="bg-slate-950 text-white p-6">
          <DialogHeader className="space-y-0">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-slate-800 flex items-center justify-center border-2 border-slate-700">
                  <HardHat className="h-8 w-8 text-slate-400" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold flex items-center gap-2">
                    {mechanic.nombre} {mechanic.apellido}
                    <Badge
                      variant={mechanic.activo ? "default" : "destructive"}
                      className="text-xs"
                    >
                      {mechanic.activo ? "Activo" : "Inactivo"}
                    </Badge>
                  </DialogTitle>
                  <DialogDescription className="text-slate-400 mt-1">
                    {mechanic.especialidad || "Mecánico General"} • ID:{" "}
                    {mechanic.id}
                  </DialogDescription>
                </div>
              </div>
              <div className="text-right text-xs text-slate-400">
                <p>Fecha Ingreso</p>
                <p className="font-mono text-white">
                  {mechanic.fecha_contratacion
                    ? new Date(mechanic.fecha_contratacion).toLocaleDateString()
                    : "N/A"}
                </p>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* CONTENIDO CON TABS */}
        <Tabs
          defaultValue="info"
          className="flex-1 flex flex-col overflow-hidden"
        >
          <div className="px-6 pt-4 border-b bg-white">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="info">Información General</TabsTrigger>
              <TabsTrigger value="docs">Documentación Digital</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="info" className="flex-1 overflow-y-auto m-0 p-0">
            <MechanicDetail mechanic={mechanic} />
          </TabsContent>

          <TabsContent value="docs" className="flex-1 overflow-y-auto m-0 p-0">
            <MechanicDocuments mechanic={mechanic} />
          </TabsContent>
        </Tabs>

        {/* FOOTER */}
        <div className="p-4 border-t bg-slate-50 flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar Expediente
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
