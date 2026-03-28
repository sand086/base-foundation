import * as React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/ui/page-header";
import { CatalogoCasetas } from "@/features/tarifas/CatalogoCasetas";
import { ArmadorRutas } from "@/features/tarifas/ArmadorRutas";
import { Calculator, Map, Route } from "lucide-react";

const GestionTarifas = () => {
  return (
    <div className="p-4 md:p-8 space-y-8 animate-page-enter">
      {/* 🚀 PAGE HEADER TAHOE */}
      <PageHeader
        title="Gestión de Tarifas"
        description="Catálogo maestro de peajes y armador logístico de rutas operativas."
        icon={<Calculator className="h-8 w-8" />}
      />

      <Tabs defaultValue="catalogo" className="w-full">
        {/* 🚀 TABS LIST: Estilo Switch de macOS en cristal */}
        <div className="flex justify-start mb-6">
          <TabsList className="grid w-full max-w-md grid-cols-2 bg-slate-900/5 p-1 rounded-xl border border-slate-200/50 backdrop-blur-md shadow-inner">
            <TabsTrigger
              value="catalogo"
              className="gap-2 font-bold text-[10px] uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-brand-navy transition-all haptic-press"
            >
              <Map className="h-3.5 w-3.5 text-emerald-600" />
              Catálogo Maestro
            </TabsTrigger>
            <TabsTrigger
              value="armador"
              className="gap-2 font-bold text-[10px] uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-brand-navy transition-all haptic-press"
            >
              <Route className="h-3.5 w-3.5 text-blue-600" />
              Armador de Rutas
            </TabsTrigger>
          </TabsList>
        </div>

        {/* 🚀 TABS CONTENT: Con animaciones fluidas al cambiar */}
        <TabsContent
          value="catalogo"
          className="mt-8 m-0 animate-in fade-in slide-in-from-bottom-4 duration-500"
        >
          <CatalogoCasetas />
        </TabsContent>

        <TabsContent
          value="armador"
          className="mt-8 m-0 animate-in fade-in slide-in-from-bottom-4 duration-500"
        >
          <ArmadorRutas />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default GestionTarifas;
