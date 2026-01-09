import { useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/ui/page-header";
import { CatalogoCasetas } from "@/features/tarifas/CatalogoCasetas";
import { ArmadorRutas } from "@/features/tarifas/ArmadorRutas";

const GestionTarifas = () => {
  return (
    <div className="space-y-6">
      <PageHeader 
        title="GESTIÓN DE TARIFAS" 
        description="Catálogo maestro de casetas y armador de rutas"
      />

      <Tabs defaultValue="catalogo" className="w-full">
        <TabsList className="bg-slate-100 p-1">
          <TabsTrigger 
            value="catalogo" 
            className="data-[state=active]:bg-white data-[state=active]:text-slate-900"
          >
            Catálogo Maestro
          </TabsTrigger>
          <TabsTrigger 
            value="armador" 
            className="data-[state=active]:bg-white data-[state=active]:text-slate-900"
          >
            Armador de Rutas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="catalogo" className="mt-6">
          <CatalogoCasetas />
        </TabsContent>

        <TabsContent value="armador" className="mt-6">
          <ArmadorRutas />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default GestionTarifas;
