import {
  EnhancedDataTable,
  ColumnDef,
} from "@/components/ui/enhanced-data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Edit, FileText, Phone, Mail, Wrench, FileSearch } from "lucide-react";
import { Mechanic } from "@/features/maintenance/types";
import { cn } from "@/lib/utils";

interface Props {
  data: Mechanic[];
  isLoading: boolean;
  onEdit: (mechanic: Mechanic) => void;
  onOpenExpediente: (mechanic: Mechanic) => void;
}

export function MechanicsTable({
  data,
  isLoading,
  onEdit,
  onOpenExpediente,
}: Props) {
  const columns: ColumnDef<Mechanic>[] = [
    {
      key: "nombre_completo",
      header: "Mecánico",
      sortable: true,
      render: (_: any, row: Mechanic) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-white/10 shadow-inner shrink-0 icon-plate">
            <Wrench className="h-5 w-5 text-slate-500 dark:text-slate-400" />
          </div>
          <div className="flex flex-col">
            <span className="font-black text-brand-navy dark:text-white uppercase tracking-tight">
              {row.nombre} {row.apellido}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
              {row.especialidad || "Técnico General"}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "contacto",
      header: "Contacto",
      sortable: false,
      render: (_: any, row: Mechanic) => (
        <div className="flex flex-col text-xs font-medium space-y-1.5">
          {row.telefono ? (
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <Phone className="h-3.5 w-3.5" />
              <span className="font-mono font-bold tracking-tight">
                {row.telefono}
              </span>
            </div>
          ) : (
            <span className="text-slate-400 italic">Sin teléfono</span>
          )}
          {row.email && (
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <Mail className="h-3.5 w-3.5" />
              <span className="truncate max-w-[150px]">{row.email}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      key: "laboral",
      header: "Datos Laborales",
      sortable: false,
      render: (_: any, row: Mechanic) => (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest w-6">
              RFC
            </span>
            <Badge
              variant="outline"
              className="font-mono font-bold text-[10px] bg-slate-50 dark:bg-slate-800/50 shadow-sm border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300"
            >
              {row.rfc || "NO REGISTRADO"}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest w-6">
              NSS
            </span>
            <Badge
              variant="outline"
              className="font-mono font-bold text-[10px] bg-slate-50 dark:bg-slate-800/50 shadow-sm border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300"
            >
              {row.nss || "NO REGISTRADO"}
            </Badge>
          </div>
        </div>
      ),
    },
    {
      key: "activo",
      header: "Estado",
      sortable: true,
      render: (val: boolean) => (
        <Badge
          variant="outline"
          className={cn(
            "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 shadow-sm",
            val
              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-500/30"
              : "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-white/10",
          )}
        >
          {val ? "Activo" : "Inactivo"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Acciones",
      sortable: false,
      width: "w-[100px]",
      render: (_: any, row: Mechanic) => (
        <div className="flex justify-end gap-2 pr-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onOpenExpediente(row)}
                  className="h-8 w-8 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all shadow-sm border border-slate-200/50 dark:border-white/10 bg-white/50 dark:bg-slate-900/50 haptic-press"
                >
                  <FileSearch className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-brand-navy border-white/10 text-[10px] font-black uppercase tracking-widest px-3 py-2 text-white">
                Ver Expediente
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(row)}
                  className="h-8 w-8 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all shadow-sm border border-slate-200/50 dark:border-white/10 bg-white/50 dark:bg-slate-900/50 haptic-press"
                >
                  <Edit className="h-4 w-4 text-brand-green dark:text-[#009740]" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-brand-navy border-white/10 text-[10px] font-black uppercase tracking-widest px-3 py-2 text-white">
                Editar Mecánico
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      ),
    },
  ];

  return (
    <Card
      variant="default"
      className="shadow-2xl border-slate-200/50 dark:border-white/10 overflow-hidden"
    >
      <CardHeader className="border-b border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-xl py-4 px-6">
        <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-2">
          Catálogo Activo
        </CardTitle>
      </CardHeader>

      <CardContent className="p-0 bg-white dark:bg-slate-950 [&_thead]:bg-slate-50/80 dark:[&_thead]:bg-slate-900/80 [&_thead]:backdrop-blur-xl [&_th]:bg-transparent [&_th]:border-b [&_th]:border-slate-200 dark:[&_th]:border-white/10 [&_th]:text-[10px] [&_th]:font-black [&_th]:uppercase [&_th]:tracking-[0.2em] [&_th]:text-slate-500 dark:[&_th]:text-slate-400">
        <EnhancedDataTable
          columns={columns}
          data={data}
          isLoading={isLoading}
          searchPlaceholder="Buscar por nombre o especialidad..."
          exportFileName="catalogo-mecanicos"
          className="border-none"
        />
      </CardContent>
    </Card>
  );
}
