import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/ui/page-header";
import { InventoryTable } from "@/features/inventory/components/InventoryTable";
import { WorkOrdersTable } from "@/features/maintenance/components/WorkOrdersTable";
import { Settings2, Package, Wrench } from "lucide-react";

const Mantenimiento = () => {
  return (
    <div className="p-4 md:p-8 space-y-8 animate-page-enter pb-20">
      {/*  PAGE HEADER TAHOE */}
      <PageHeader
        title="Mantenimiento & Inventario"
        description="Gestión centralizada de refacciones y control de órdenes de trabajo operativas."
        icon={<Settings2 className="h-8 w-8 text-brand-navy dark:text-white" />}
      />

      <Tabs defaultValue="inventario" className="w-full space-y-6">
        {/*  TABS LIST TAHOE (Glassmorphism + Dark Mode) */}
        <div className="w-full overflow-x-auto hide-scrollbar pb-2 sm:pb-0">
          <TabsList className="bg-slate-100/50 dark:bg-slate-900/50 backdrop-blur-md p-1 h-14 rounded-xl border border-slate-200/50 dark:border-white/10 inline-flex min-w-max sm:w-auto">
            <TabsTrigger
              value="inventario"
              className="gap-2 text-[11px] font-black uppercase tracking-widest rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-brand-navy dark:data-[state=active]:text-white data-[state=active]:shadow-sm h-full px-6 transition-all"
            >
              <Package className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              Inventario de Refacciones
            </TabsTrigger>
            <TabsTrigger
              value="ordenes"
              className="gap-2 text-[11px] font-black uppercase tracking-widest rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-brand-navy dark:data-[state=active]:text-white data-[state=active]:shadow-sm h-full px-6 transition-all"
            >
              <Wrench className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              Órdenes de Trabajo
            </TabsTrigger>
          </TabsList>
        </div>

        {/*  TABS CONTENT */}
        <TabsContent
          value="inventario"
          className="m-0 focus-visible:outline-none animate-in fade-in slide-in-from-bottom-2 duration-500"
        >
          <InventoryTable />
        </TabsContent>

        <TabsContent
          value="ordenes"
          className="m-0 focus-visible:outline-none animate-in fade-in slide-in-from-bottom-2 duration-500"
        >
          <WorkOrdersTable />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Mantenimiento;
