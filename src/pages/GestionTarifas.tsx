import * as React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/ui/page-header";
import { TollBoothCatalog } from "@/features/clients/components/TollBoothCatalog";
import { RouteBuilder } from "@/features/clients/components/RouteBuilder";
import { Calculator, Map, Route } from "lucide-react";

const GestionTarifas = () => {
  return (
    <div className="p-4 md:p-8 space-y-8 animate-page-enter">
      {/*  PAGE HEADER TAHOE */}
      <PageHeader
        title="Gestión de Tarifas"
        description="Catálogo maestro de peajes y armador logístico de rutas operativas."
        icon={<Calculator className="h-8 w-8" />}
      />

      <Tabs defaultValue="catalogo" className="w-full">
        {/*  TABS LIST: Estilo Switch de macOS en cristal */}
        <div className="flex justify-start mb-6">
          <TabsList className="bg-slate-100/50 dark:bg-slate-900/50 backdrop-blur-md p-1 h-14 rounded-xl border border-slate-200/50 dark:border-white/10 w-full sm:w-auto inline-flex">
            <TabsTrigger
              value="catalogo"
              className="gap-2 text-[11px] font-black uppercase tracking-widest rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-brand-navy dark:data-[state=active]:text-white data-[state=active]:shadow-sm h-full px-6 transition-all"
            >
              <Map className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              Catálogo Maestro
            </TabsTrigger>

            <TabsTrigger
              value="armador"
              className="gap-2 text-[11px] font-black uppercase tracking-widest rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-brand-navy dark:data-[state=active]:text-white data-[state=active]:shadow-sm h-full px-6 transition-all"
            >
              <Route className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              Armador de Rutas
            </TabsTrigger>
          </TabsList>
        </div>

        {/*  TABS CONTENT: Con animaciones fluidas al cambiar */}
        <TabsContent
          value="catalogo"
          className="mt-8 m-0 animate-in fade-in slide-in-from-bottom-4 duration-500"
        >
          <TollBoothCatalog />
        </TabsContent>

        <TabsContent
          value="armador"
          className="mt-8 m-0 animate-in fade-in slide-in-from-bottom-4 duration-500"
        >
          <RouteBuilder />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default GestionTarifas;
