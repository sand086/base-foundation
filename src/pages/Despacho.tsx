import { useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/ui/page-header";
import { DespachoWizard } from "@/features/despacho/DespachoWizard";
import { TripPlanner } from "@/features/despacho/TripPlanner";

const Despacho = () => {
  return (
    <div className="space-y-6">
      <PageHeader 
        title="DESPACHO DE SERVICIOS" 
        description="Creación, planeación y asignación de viajes"
      />
      
      <Tabs defaultValue="planner" className="w-full">
        <TabsList className="bg-slate-100 p-1">
          <TabsTrigger 
            value="planner" 
            className="data-[state=active]:bg-white data-[state=active]:text-slate-900"
          >
            Planeador
          </TabsTrigger>
          <TabsTrigger 
            value="wizard" 
            className="data-[state=active]:bg-white data-[state=active]:text-slate-900"
          >
            Nuevo Viaje
          </TabsTrigger>
        </TabsList>

        <TabsContent value="planner" className="mt-6">
          <TripPlanner />
        </TabsContent>

        <TabsContent value="wizard" className="mt-6">
          <DespachoWizard />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Despacho;
