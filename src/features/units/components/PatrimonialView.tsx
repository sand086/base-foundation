// src/features/flota/PatrimonialView.tsx
import { useState, useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  EnhancedDataTable,
  ColumnDef,
} from "@/components/ui/enhanced-data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Truck,
  Package,
  DollarSign,
  AlertTriangle,
  MoreHorizontal,
  Eye,
  Ban,
  FileText,
  TrendingDown,
  Car,
  Warehouse,
  Loader2,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { useUnits } from "@/features/units/hooks/useUnits";
import { Unit } from "@/features/units/types";

import { cn } from "@/lib/utils";

// Form Components
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

// =====================
// ESQUEMA ZOD (VALIDACIÓN)
// =====================
const bajaSchema = z.object({
  motivoBaja: z.enum(["venta", "siniestro", "chatarra"], {
    required_error: "Debe seleccionar un motivo de baja",
  }),
  fechaBaja: z.string().min(1, "La fecha de baja es obligatoria"),
  observaciones: z.string().optional(),
});

type BajaFormData = z.infer<typeof bajaSchema>;

// Definimos la interfaz local que usa tu vista
export interface ActivoPatrimonial {
  id: string;
  numero_economico: string;
  tipoUnidad: string;
  marca: string;
  modelo: string;
  year: number;
  vin: string;
  valorAdquisicion: number;
  fechaAdquisicion: string;
  estatus:
    | "operativo"
    | "baja_venta"
    | "baja_siniestro"
    | "baja_chatarra"
    | "en_tramite";
  motivoBaja?: string;
  fechaBaja?: string;
  observaciones?: string;
}

export function PatrimonialView() {
  // 1. Conectar al Hook Real
  const { unidades, isLoading, updateUnit } = useUnits();

  // 2. Adaptar datos del backend al formato patrimonial
  const activos: ActivoPatrimonial[] = useMemo(() => {
    return unidades.map((u) => ({
      id: String(u.id),
      numero_economico: u.numero_economico,
      tipoUnidad: u.tipo,
      marca: u.marca,
      modelo: u.modelo,
      year: u.year || new Date().getFullYear(),
      vin: u.vin || "SIN-VIN",
      valorAdquisicion:
        u.tipo === "full" ? 3500000 : u.tipo === "sencillo" ? 2800000 : 1500000,
      fechaAdquisicion: "2022-01-15",
      estatus: ([
        "disponible",
        "en_ruta",
        "mantenimiento",
        "bloqueado",
      ].includes(u.status)
        ? "operativo"
        : u.status) as ActivoPatrimonial["estatus"],
    }));
  }, [unidades]);

  const [isBajaModalOpen, setIsBajaModalOpen] = useState(false);
  const [activoToBaja, setActivoToBaja] = useState<ActivoPatrimonial | null>(
    null,
  );
  const [isSaving, setIsSaving] = useState(false);

  // 3. Inicializar React Hook Form
  const form = useForm<BajaFormData>({
    resolver: zodResolver(bajaSchema),
    defaultValues: {
      fechaBaja: new Date().toISOString().split("T")[0],
      observaciones: "",
    },
  });

  // Calcular resumen agrupado
  const resumenAgrupado = useMemo(() => {
    const operativos = activos.filter((a) => a.estatus === "operativo");
    const grupos: Record<
      string,
      { total: number; detalle: Record<string, number> }
    > = {};

    operativos.forEach((activo) => {
      const tipo = activo.tipoUnidad.toLowerCase();
      if (!grupos[tipo]) {
        grupos[tipo] = { total: 0, detalle: {} };
      }
      grupos[tipo].total++;

      const marcaModelo = `${activo.marca} ${activo.modelo}`;
      grupos[tipo].detalle[marcaModelo] =
        (grupos[tipo].detalle[marcaModelo] || 0) + 1;
    });

    return grupos;
  }, [activos]);

  // KPIs
  const totalActivos = activos.length;
  const operativos = activos.filter((a) => a.estatus === "operativo").length;
  const bajas = activos.filter((a) => a.estatus !== "operativo").length;
  const valorTotal = activos
    .filter((a) => a.estatus === "operativo")
    .reduce((sum, a) => sum + a.valorAdquisicion, 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getEstatusBadge = (estatus: ActivoPatrimonial["estatus"]) => {
    const baseClass =
      "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 shadow-sm";
    switch (estatus) {
      case "operativo":
        return (
          <Badge
            variant="outline"
            className={cn(
              baseClass,
              "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-500/30",
            )}
          >
            Operativo
          </Badge>
        );
      case "baja_venta":
        return (
          <Badge
            variant="outline"
            className={cn(
              baseClass,
              "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-500/30",
            )}
          >
            Baja - Venta
          </Badge>
        );
      case "baja_siniestro":
        return (
          <Badge
            variant="outline"
            className={cn(
              baseClass,
              "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-500/30",
            )}
          >
            Baja - Siniestro
          </Badge>
        );
      case "baja_chatarra":
        return (
          <Badge
            variant="outline"
            className={cn(
              baseClass,
              "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600",
            )}
          >
            Baja - Chatarra
          </Badge>
        );
      case "en_tramite":
        return (
          <Badge
            variant="outline"
            className={cn(
              baseClass,
              "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-500/30",
            )}
          >
            En Trámite
          </Badge>
        );
      default:
        return (
          <Badge
            variant="outline"
            className={cn(
              baseClass,
              "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-white/10",
            )}
          >
            {estatus}
          </Badge>
        );
    }
  };

  const getTipoIcon = (tipo: string) => {
    const tipoLower = tipo.toLowerCase();
    if (tipoLower.includes("full") || tipoLower.includes("sencillo"))
      return <Truck className="h-5 w-5" />;
    if (tipoLower.includes("caja") || tipoLower.includes("refrigerado"))
      return <Package className="h-5 w-5" />;
    if (tipoLower.includes("montacargas"))
      return <Warehouse className="h-5 w-5" />;
    if (tipoLower.includes("utilitario")) return <Car className="h-5 w-5" />;
    if (tipoLower.includes("tractocamion")) return <Car className="h-5 w-5" />;
    return <Truck className="h-5 w-5" />;
  };

  const handleOpenBaja = (activo: ActivoPatrimonial) => {
    setActivoToBaja(activo);
    form.reset({
      motivoBaja: undefined,
      observaciones: "",
      fechaBaja: new Date().toISOString().split("T")[0],
    });
    setIsBajaModalOpen(true);
  };

  const onSubmitBaja = async (data: BajaFormData) => {
    if (!activoToBaja) return;
    setIsSaving(true);

    try {
      // En un sistema real enviarías { estatus_patrimonial: data.motivoBaja, fecha_baja: data.fechaBaja, observaciones: data.observaciones }
      await updateUnit(Number(activoToBaja.id), {
        status: "bloqueado",
      });

      toast.success("Activo dado de baja", {
        description: `ECO-${activoToBaja.numero_economico} ha sido removido de la disponibilidad operativa.`,
      });

      setIsBajaModalOpen(false);
      setActivoToBaja(null);
    } catch (error) {
      toast.error("Error al procesar la baja");
    } finally {
      setIsSaving(false);
    }
  };

  // Columns for EnhancedDataTable
  const columns: ColumnDef<ActivoPatrimonial>[] = useMemo(
    () => [
      {
        key: "numero_economico",
        header: "No. Económico",
        sortable: true,
        render: (value) => (
          <span className="font-black text-brand-navy dark:text-white uppercase tracking-tight">
            ECO-{value}
          </span>
        ),
      },
      {
        key: "tipoUnidad",
        header: "Tipo",
        sortable: true,
        render: (value) => (
          <Badge
            variant="outline"
            className="text-[9px] font-black uppercase tracking-widest bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10 shadow-sm"
          >
            {value}
          </Badge>
        ),
      },
      {
        key: "marca",
        header: "Marca / Modelo",
        sortable: true,
        render: (_, row) => (
          <div className="flex flex-col">
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {row.marca}
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              {row.modelo}
            </span>
          </div>
        ),
      },
      {
        key: "year",
        header: "Año",
        type: "number",
        sortable: true,
        render: (value) => (
          <span className="font-mono font-bold text-slate-600 dark:text-slate-400">
            {value}
          </span>
        ),
      },
      {
        key: "valorAdquisicion",
        header: "Valor Adquisición",
        type: "number",
        sortable: true,
        render: (value) => (
          <span className="font-mono font-black text-sm text-brand-navy dark:text-slate-200">
            {formatCurrency(value as number)}
          </span>
        ),
      },
      {
        key: "fechaAdquisicion",
        header: "Fecha Adquisición",
        type: "date",
        sortable: true,
        render: (value) => (
          <span className="font-mono text-xs font-medium text-muted-foreground">
            {value}
          </span>
        ),
      },
      {
        key: "estatus",
        header: "Estatus",
        type: "status",
        statusOptions: [
          "operativo",
          "baja_venta",
          "baja_siniestro",
          "baja_chatarra",
          "en_tramite",
        ],
        sortable: true,
        render: (value) =>
          getEstatusBadge(value as ActivoPatrimonial["estatus"]),
      },
      {
        key: "id",
        header: "Acciones",
        sortable: false,
        width: "w-[80px]",
        render: (_, activo) => (
          <div
            className="flex justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl shadow-sm border border-slate-200/50 dark:border-white/10 bg-white dark:bg-slate-900/50"
                >
                  <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="glass-panel border-white/20 min-w-[180px] z-50 dark:bg-slate-900/90"
              >
                <DropdownMenuItem className="gap-2 font-bold text-xs uppercase tracking-tight cursor-pointer dark:text-slate-300 dark:focus:bg-slate-800">
                  <Eye className="h-4 w-4 text-brand-navy dark:text-slate-400" />
                  Ver expediente
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2 font-bold text-xs uppercase tracking-tight cursor-pointer dark:text-slate-300 dark:focus:bg-slate-800">
                  <FileText className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                  Documentos
                </DropdownMenuItem>
                {activo.estatus === "operativo" && (
                  <>
                    <DropdownMenuSeparator className="dark:bg-white/10" />
                    <DropdownMenuItem
                      className="gap-2 font-bold text-xs uppercase tracking-tight text-rose-600 dark:text-rose-500 cursor-pointer dark:focus:bg-rose-950/30"
                      onClick={() => handleOpenBaja(activo)}
                    >
                      <Ban className="h-4 w-4" />
                      Dar de baja
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    [],
  );

  if (isLoading)
    return (
      <div className="flex justify-center items-center p-20">
        <Loader2 className="animate-spin h-10 w-10 text-brand-red" />
      </div>
    );

  return (
    <div className="space-y-6">
      {/*  KPI Cards (Industrial Premium) */}
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card
          variant="default"
          className="p-6 flex items-center gap-5 group hover:border-brand-navy/30 dark:hover:border-white/20 transition-all cursor-default"
        >
          <div className="p-3.5 bg-slate-100 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-white/10 shadow-inner group-hover:scale-110 transition-transform duration-500 ease-out">
            <Truck className="h-6 w-6 text-brand-navy dark:text-slate-300" />
          </div>
          <div className="flex flex-col justify-center">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/80 mb-1">
              Total Activos
            </p>
            <p className="text-3xl font-black text-brand-navy dark:text-white leading-none tracking-tighter">
              {totalActivos}
            </p>
          </div>
        </Card>

        <Card
          variant="default"
          className="p-6 flex items-center gap-5 group hover:border-emerald-300 dark:hover:border-emerald-500/50 transition-all cursor-default"
        >
          <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-100 dark:border-emerald-900/50 shadow-inner group-hover:scale-110 transition-transform duration-500 ease-out">
            <Package className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex flex-col justify-center">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/80 mb-1">
              Operativos
            </p>
            <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400 leading-none tracking-tighter">
              {operativos}
            </p>
          </div>
        </Card>

        <Card
          variant="default"
          className="p-6 flex items-center gap-5 group hover:border-rose-300 dark:hover:border-rose-500/50 transition-all cursor-default"
        >
          <div className="p-3.5 bg-rose-50 dark:bg-rose-950/30 rounded-2xl border border-rose-100 dark:border-rose-900/50 shadow-inner group-hover:scale-110 transition-transform duration-500 ease-out">
            <TrendingDown className="h-6 w-6 text-rose-600 dark:text-rose-400" />
          </div>
          <div className="flex flex-col justify-center">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/80 mb-1">
              Bajas Históricas
            </p>
            <p className="text-3xl font-black text-rose-600 dark:text-rose-400 leading-none tracking-tighter">
              {bajas}
            </p>
          </div>
        </Card>

        <Card
          variant="default"
          className="p-6 flex items-center gap-5 group hover:border-blue-300 dark:hover:border-blue-500/50 transition-all cursor-default"
        >
          <div className="p-3.5 bg-blue-50 dark:bg-blue-950/30 rounded-2xl border border-blue-100 dark:border-blue-900/50 shadow-inner group-hover:scale-110 transition-transform duration-500 ease-out">
            <DollarSign className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex flex-col justify-center">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/80 mb-1">
              Valor Patrimonial
            </p>
            <p className="text-xl font-black font-mono text-blue-600 dark:text-blue-400 leading-none tracking-tighter mt-1">
              {formatCurrency(valorTotal)}
            </p>
          </div>
        </Card>
      </div>

      {/*  Resumen Agrupado */}
      <Card variant="default" className="border-none shadow-xl overflow-hidden">
        <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-border p-6">
          <CardTitle className="text-xl font-black uppercase tracking-tighter text-brand-navy dark:text-white heading-crisp">
            Inventario Total por Tipo
          </CardTitle>
          <CardDescription className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-1">
            Resumen de activos operativos agrupados por categoría
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 bg-muted/20 dark:bg-transparent">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(resumenAgrupado).map(([tipo, data]) => (
              <div
                key={tipo}
                className="p-5 border border-border rounded-2xl bg-card shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-4 mb-4 pb-4 border-b border-slate-100 dark:border-white/5">
                  <div className="p-3 bg-brand-navy/5 dark:bg-slate-800 rounded-xl text-brand-navy dark:text-slate-300">
                    {getTipoIcon(tipo)}
                  </div>
                  <div>
                    <h4 className="font-black text-sm uppercase tracking-tight text-slate-800 dark:text-slate-200">
                      {tipo}
                    </h4>
                    <p className="text-3xl font-black text-brand-navy dark:text-white leading-none mt-1">
                      {data.total}
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  {Object.entries(data.detalle).map(([modelo, cantidad]) => (
                    <div
                      key={modelo}
                      className="flex items-center justify-between"
                    >
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-tight">
                        {modelo}
                      </span>
                      <Badge
                        variant="secondary"
                        className="font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                      >
                        {cantidad} ud
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/*  Tabla de Activos */}
      <Card
        variant="default"
        className="border-none shadow-2xl overflow-hidden"
      >
        <CardHeader className="flex flex-row items-center justify-between border-b border-border bg-muted/50 dark:bg-muted/20 py-6 px-6">
          <div>
            <CardTitle className="text-xl font-black uppercase tracking-tighter text-brand-navy dark:text-white heading-crisp">
              Detalle de Activos Patrimoniales
            </CardTitle>
            <CardDescription className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-1">
              Listado completo de vehículos, remolques y equipos del patrimonio
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0 bg-white dark:bg-slate-950 [&_thead]:bg-slate-50/80 dark:[&_thead]:bg-slate-900/80 [&_thead]:backdrop-blur-xl [&_th]:bg-transparent [&_th]:border-b [&_th]:border-slate-200 dark:[&_th]:border-white/10 [&_th]:text-[10px] [&_th]:font-black [&_th]:uppercase [&_th]:tracking-[0.2em] [&_th]:text-slate-500 dark:[&_th]:text-slate-400 [&_th]:h-12 [&_td]:border-b [&_td]:border-slate-100 dark:[&_td]:border-white/5">
          <EnhancedDataTable
            data={activos}
            columns={columns}
            exportFileName="activos_patrimoniales"
            className="border-none"
          />
        </CardContent>
      </Card>

      {/*  MODAL DE BAJA (ZOD + RHF + TAHOE UI) */}
      <Dialog open={isBajaModalOpen} onOpenChange={setIsBajaModalOpen}>
        <DialogContent className="w-[95vw] sm:max-w-2xl flex-col max-h-[90vh] overflow-hidden p-0 border-none shadow-2xl animate-modal-show bg-card/90 dark:bg-card/95 backdrop-blur-xl rounded-2xl">
          <DialogHeader className="p-6 sm:p-8 bg-brand-navy/95 dark:bg-slate-900 backdrop-blur-md shrink-0 border-b border-white/10 relative overflow-hidden z-10">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
            <div className="relative z-10 flex items-center gap-4 sm:gap-5">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-rose-500/20 flex items-center justify-center shadow-inner shrink-0 icon-plate">
                <Ban className="h-7 w-7 sm:h-8 sm:w-8 text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.4)]" />
              </div>
              <div className="flex flex-col gap-1 text-left">
                <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-white text-shadow-premium heading-crisp leading-none">
                  Dar de Baja Activo
                </DialogTitle>
                <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-brand-secondary dark:text-slate-400 mt-1">
                  Desincorporación Operativa • Patrimonio
                </p>
              </div>
            </div>
          </DialogHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmitBaja)}
              className="flex-1 overflow-y-auto flex flex-col custom-scrollbar bg-muted/30 dark:bg-transparent"
            >
              <div className="flex-1 p-6 sm:p-8 space-y-6">
                {/* INFO DEL ACTIVO (Solo lectura) */}
                <div className="p-5 bg-card border border-border rounded-2xl shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/80 mb-1">
                      Activo Seleccionado
                    </p>
                    <p className="text-lg font-black text-brand-navy dark:text-white uppercase tracking-tight">
                      ECO-{activoToBaja?.numero_economico}
                    </p>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">
                      {activoToBaja?.marca} {activoToBaja?.modelo} (
                      {activoToBaja?.year})
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/80 mb-1">
                      VIN Identificador
                    </p>
                    <p className="font-mono font-bold text-slate-700 dark:text-slate-300 text-sm bg-slate-100 dark:bg-slate-900 px-3 py-1 rounded-lg border border-slate-200 dark:border-white/5">
                      {activoToBaja?.vin}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="motivoBaja"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel variant="brand" required>
                          Motivo de Baja
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="h-11 font-black uppercase text-xs bg-card border-border shadow-sm text-slate-800 dark:text-slate-200">
                              <SelectValue placeholder="Seleccionar motivo..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-card/90 dark:bg-card/90 backdrop-blur-xl border-border">
                            <SelectItem
                              value="venta"
                              className="font-bold text-xs uppercase text-blue-600 dark:text-blue-400"
                            >
                              Venta a terceros
                            </SelectItem>
                            <SelectItem
                              value="siniestro"
                              className="font-bold text-xs uppercase text-rose-600 dark:text-rose-400"
                            >
                              Siniestro / Pérdida Total
                            </SelectItem>
                            <SelectItem
                              value="chatarra"
                              className="font-bold text-xs uppercase text-slate-600 dark:text-slate-400"
                            >
                              Chatarra / Desecho
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="fechaBaja"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel variant="brand" required>
                          Fecha Efectiva de Baja
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                            className="h-11 font-mono font-bold bg-card border-border shadow-sm"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="observaciones"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel variant="brand">
                          Observaciones Adicionales
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Detalles sobre el siniestro, venta o desincorporación..."
                            {...field}
                            className="min-h-[100px] resize-none bg-card border-border font-medium text-sm shadow-sm"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* FOOTER */}
              <DialogFooter className="p-6 sm:p-8 bg-card/80 dark:bg-card/80 backdrop-blur-xl border-t border-border shrink-0">
                <div className="flex flex-col-reverse sm:flex-row sm:flex-wrap justify-end items-stretch sm:items-center gap-3 w-full">
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={() => setIsBajaModalOpen(false)}
                    disabled={isSaving}
                    className="w-full sm:w-auto haptic-press flex-shrink-0"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    variant="destructive"
                    size="lg"
                    disabled={isSaving}
                    className="w-full sm:w-auto haptic-press shadow-rose-600/10 flex-shrink-0"
                  >
                    {isSaving ? (
                      <Loader2 className="animate-spin h-4 w-4 mr-2" />
                    ) : (
                      <Ban className="h-4 w-4 mr-2" />
                    )}
                    Confirmar Baja Definitiva
                  </Button>
                </div>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
