import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HardHat } from "lucide-react";
import { Mechanic } from "@/features/maintenance/types";

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
      {/* CAPA 1: CASCARÓN */}
      <DialogContent className="w-[95vw] sm:max-w-2xl p-0 flex flex-col max-h-[90vh] bg-card/95 backdrop-blur-xl border border-border shadow-2xl rounded-2xl overflow-hidden">
        {/* CAPA 2: HEADER TAHOE */}
        <DialogHeader className="p-6 bg-card border-b border-border shrink-0 relative z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-black/5 dark:from-white/5 to-transparent pointer-events-none" />
          <div className="relative z-10 flex items-center gap-4 sm:gap-5">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-inner shrink-0 bg-slate-100 dark:bg-slate-800/50">
              <HardHat className="h-6 w-6 text-slate-500 dark:text-slate-400" />
            </div>
            <div className="flex flex-col text-left min-w-0 flex-1">
              <div className="flex items-center gap-3">
                <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-foreground heading-crisp leading-none">
                  {mechanic.nombre} {mechanic.apellido}
                </DialogTitle>
                <Badge
                  variant={mechanic.activo ? "success" : "destructive"}
                  className="text-[9px] font-black uppercase tracking-widest"
                >
                  {mechanic.activo ? "Activo" : "Inactivo"}
                </Badge>
              </div>
              <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-1">
                {mechanic.especialidad || "Mecánico General"} · Ingreso:{" "}
                {mechanic.fecha_contratacion
                  ? new Date(mechanic.fecha_contratacion).toLocaleDateString()
                  : "N/A"}
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* CAPA 3: BODY CON TABS */}
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          <Tabs
            defaultValue="info"
            className="flex-1 flex flex-col overflow-hidden"
          >
            <div className="px-6 sm:px-8 pt-4 bg-muted/50">
              <TabsList className="grid w-full max-w-md grid-cols-2 bg-muted/50 p-1 rounded-xl border border-border backdrop-blur-md">
                <TabsTrigger value="info" className="gap-2 font-bold text-[10px] uppercase tracking-wider data-[state=active]:bg-card data-[state=active]:text-foreground">
                  Información General
                </TabsTrigger>
                <TabsTrigger value="docs" className="gap-2 font-bold text-[10px] uppercase tracking-wider data-[state=active]:bg-card data-[state=active]:text-foreground">
                  Documentación Digital
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="info" className="flex-1 overflow-y-auto m-0 p-0 custom-scrollbar">
              <MechanicDetail mechanic={mechanic} />
            </TabsContent>

            <TabsContent value="docs" className="flex-1 overflow-y-auto m-0 p-0 custom-scrollbar">
              <MechanicDocuments mechanic={mechanic} />
            </TabsContent>
          </Tabs>
        </div>

        {/* CAPA 5: FOOTER TAHOE */}
        <DialogFooter className="p-6 sm:p-8 bg-muted/50 border-t border-slate-200 dark:border-white/10 shrink-0">
          <div className="flex flex-col-reverse sm:flex-row justify-end items-stretch sm:items-center gap-3 w-full">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto haptic-press font-black uppercase tracking-widest text-[10px]"
            >
              Cerrar Expediente
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
