// src/pages/Despacho.tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header"; //  Importado nuestro Header estándar
import { DispatchWizard } from "@/features/trips/components/DispatchWizard";
import { TripPlanner } from "@/features/trips/components/TripPlanner";
import { StandByTrips } from "@/features/trips/components/StandByTrips";

import { Clock, LayoutDashboard, PlusCircle, Route } from "lucide-react";
import { cn } from "@/lib/utils";

const Despacho = () => {
  return (
    <div className="p-4 md:p-6 space-y-6 min-h-[calc(100vh-4rem)] flex flex-col animate-page-enter pb-20 bg-slate-50/30 dark:bg-transparent">
      {/*  PAGE HEADER TAHOE */}
      <PageHeader
        title="Centro de Despacho"
        description="Gestión de salida, asignación de unidades y monitoreo de equipos en stand-by."
        icon={
          <Route className="h-8 w-8 text-brand-navy dark:text-white drop-shadow-sm" />
        }
      />

      {/*  TABS CONTENEDOR FLEX PARA SCROLL PERFECTO */}
      <Tabs
        defaultValue="planner"
        className="w-full flex-1 flex flex-col min-h-0"
      >
        {/*  TABS LIST TAHOE */}
        <div className="w-full overflow-x-auto hide-scrollbar pb-2 sm:pb-0">
          <TabsList className="bg-slate-200/50 dark:bg-slate-800/80 backdrop-blur-md p-1 h-12 rounded-xl border border-slate-300/50 dark:border-white/5 inline-flex min-w-max sm:w-full max-w-[600px] grid-cols-3 shadow-sm">
            <TabsTrigger
              value="planner"
              className="gap-2 text-[10px] font-black uppercase tracking-widest rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-brand-navy dark:data-[state=active]:text-white data-[state=active]:shadow-sm h-full px-4 transition-all"
            >
              <LayoutDashboard className="h-3.5 w-3.5" /> Planeador
            </TabsTrigger>

            <TabsTrigger
              value="standby"
              className="gap-2 text-[10px] font-black uppercase tracking-widest rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-brand-navy dark:data-[state=active]:text-white data-[state=active]:shadow-sm h-full px-4 transition-all"
            >
              <Clock className="h-3.5 w-3.5" /> Stand-By
              <Badge className="ml-1 h-4 px-1.5 bg-amber-500 text-white border-none shadow-sm text-[8px] font-black uppercase tracking-widest leading-none flex items-center justify-center">
                New
              </Badge>
            </TabsTrigger>

            <TabsTrigger
              value="wizard"
              className="gap-2 text-[10px] font-black uppercase tracking-widest rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-brand-navy dark:data-[state=active]:text-white data-[state=active]:shadow-sm h-full px-4 transition-all"
            >
              <PlusCircle className="h-3.5 w-3.5 text-brand-red dark:text-rose-500" />{" "}
              Nuevo Viaje
            </TabsTrigger>
          </TabsList>
        </div>

        {/*  TABS CONTENT (Con animación de entrada) */}
        <div className="flex-1 mt-6">
          <TabsContent
            value="planner"
            className="m-0 h-full animate-in fade-in slide-in-from-bottom-2 duration-500 focus-visible:outline-none"
          >
            <TripPlanner />
          </TabsContent>

          <TabsContent
            value="standby"
            className="m-0 h-full animate-in fade-in slide-in-from-bottom-2 duration-500 focus-visible:outline-none"
          >
            <StandByTrips />
          </TabsContent>

          <TabsContent
            value="wizard"
            className="m-0 h-full animate-in fade-in slide-in-from-bottom-2 duration-500 focus-visible:outline-none"
          >
            <DispatchWizard />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default Despacho;
