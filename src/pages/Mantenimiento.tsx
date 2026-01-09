import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/ui/page-header";
import { InventarioTable } from "@/features/mantenimiento/InventarioTable";
import { OrdenesTrabajoTable } from "@/features/mantenimiento/OrdenesTrabajoTable";

const Mantenimiento = () => {
  return (
    <div className="space-y-6">
      <PageHeader 
        title="MANTENIMIENTO & INVENTARIO" 
        description="Gestión de refacciones y órdenes de trabajo"
      />

      <Tabs defaultValue="inventario" className="w-full">
        <TabsList className="bg-slate-100 p-1">
          <TabsTrigger 
            value="inventario" 
            className="data-[state=active]:bg-white data-[state=active]:text-slate-900"
          >
            Inventario
          </TabsTrigger>
          <TabsTrigger 
            value="ordenes" 
            className="data-[state=active]:bg-white data-[state=active]:text-slate-900"
          >
            Órdenes de Trabajo
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inventario" className="mt-6">
          <InventarioTable />
        </TabsContent>

        <TabsContent value="ordenes" className="mt-6">
          <OrdenesTrabajoTable />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Mantenimiento;
