// src/pages/Despacho.tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { DespachoWizard } from "@/features/despacho/DespachoWizard";
import { TripPlanner } from "@/features/despacho/TripPlanner";
import { StandByTrips } from "@/features/despacho/StandByTrips";

import { Clock, LayoutDashboard, PlusCircle } from "lucide-react";

const Despacho = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            CONTROL DE TRÁFICO
          </h1>
          <p className="text-muted-foreground text-sm">
            Gestiona la salida y monitoreo de unidades
          </p>
        </div>
      </div>

      <Tabs defaultValue="planner" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-[600px] bg-slate-100 p-1">
          <TabsTrigger value="planner" className="gap-2">
            <LayoutDashboard className="h-4 w-4" /> Planeador
          </TabsTrigger>
          <TabsTrigger value="standby" className="gap-2">
            <Clock className="h-4 w-4" /> Stand-By
            <Badge className="ml-1 h-5 px-1 bg-amber-500">New</Badge>
          </TabsTrigger>
          <TabsTrigger value="wizard" className="gap-2">
            <PlusCircle className="h-4 w-4" /> Nuevo Viaje
          </TabsTrigger>
        </TabsList>

        <TabsContent value="planner" className="mt-6">
          <TripPlanner />
        </TabsContent>

        <TabsContent value="standby" className="mt-6">
          <StandByTrips />
        </TabsContent>

        <TabsContent value="wizard" className="mt-6">
          <DespachoWizard />
        </TabsContent>
      </Tabs>
    </div>
  );
};
export default Despacho;
