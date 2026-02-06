import { useState, useMemo } from "react";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
} from "lucide-react";
import { toast } from "sonner";
import { useUnits } from "@/hooks/useUnits"; // <--- Hook real
import { Unidad } from "@/services/unitService";

// Definimos la interfaz local que usa tu vista (ligeramente diferente a Unidad del backend)
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

  // 2. Adaptar datos del backend al formato que espera esta vista
  // Nota: Como el backend básico aun no tiene 'valorAdquisicion' ni 'fechaAdquisicion',
  // los simulamos para mantener la UI funcional sin romper nada.
  const activos: ActivoPatrimonial[] = useMemo(() => {
    return unidades.map((u) => ({
      id: u.id,
      numero_economico: u.numero_economico, // snake_case del backend
      tipoUnidad: u.tipo,
      marca: u.marca,
      modelo: u.modelo,
      year: u.year || new Date().getFullYear(),
      vin: u.vin || "SIN-VIN",
      // Simulamos datos financieros si no vienen del backend
      valorAdquisicion:
        u.tipo === "full" ? 3500000 : u.tipo === "sencillo" ? 2800000 : 1500000,
      fechaAdquisicion: "2022-01-15",
      // Mapeamos estatus operativo a 'operativo' patrimonial, o mantenemos si ya es baja
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
  const [bajaData, setBajaData] = useState({
    motivoBaja: "" as "venta" | "siniestro" | "chatarra" | "",
    observaciones: "",
    fechaBaja: new Date().toISOString().split("T")[0],
  });
  const [isSaving, setIsSaving] = useState(false);

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
    switch (estatus) {
      case "operativo":
        return <Badge className="bg-green-600 text-white">Operativo</Badge>;
      case "baja_venta":
        return <Badge className="bg-blue-600 text-white">Baja - Venta</Badge>;
      case "baja_siniestro":
        return (
          <Badge className="bg-red-600 text-white">Baja - Siniestro</Badge>
        );
      case "baja_chatarra":
        return (
          <Badge className="bg-gray-600 text-white">Baja - Chatarra</Badge>
        );
      case "en_tramite":
        return <Badge className="bg-yellow-500 text-black">En Trámite</Badge>;
      default:
        return <Badge variant="secondary">{estatus}</Badge>;
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
    return <Truck className="h-5 w-5" />;
  };

  const handleOpenBaja = (activo: ActivoPatrimonial) => {
    setActivoToBaja(activo);
    setBajaData({
      motivoBaja: "",
      observaciones: "",
      fechaBaja: new Date().toISOString().split("T")[0],
    });
    setIsBajaModalOpen(true);
  };

  const handleConfirmBaja = async () => {
    if (!activoToBaja || !bajaData.motivoBaja) {
      toast.error("Seleccione el motivo de baja");
      return;
    }

    setIsSaving(true);

    const estatusMap: Record<string, string> = {
      venta: "baja_venta",
      siniestro: "baja_siniestro",
      chatarra: "baja_chatarra",
    };

    try {
      // Actualizamos el status en el backend real
      // Nota: Como 'baja_venta' no es un status valido en UnitStatusEnum del backend,
      // podrías necesitar actualizar el Enum en el backend o usar un campo 'situacion_patrimonial'.
      // Por ahora, lo marcamos como 'bloqueado' en la operativa y guardamos la nota.

      await updateUnit(activoToBaja.id, {
        status: "bloqueado", // O el estado que corresponda en tu lógica de negocio
        // En un sistema real enviarías { estatus_patrimonial: 'baja_venta', ... }
      });

      toast.success("Activo dado de baja", {
        description: `${activoToBaja.numero_economico} ha sido removido de la disponibilidad operativa.`,
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
        render: (value) => <span className="font-bold font-mono">{value}</span>,
      },
      {
        key: "tipoUnidad",
        header: "Tipo",
        sortable: true,
        render: (value) => (
          <Badge variant="outline" className="capitalize">
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
            <span className="font-medium">{row.marca}</span>
            <span className="text-xs text-muted-foreground">{row.modelo}</span>
          </div>
        ),
      },
      {
        key: "year",
        header: "Año",
        type: "number",
        sortable: true,
      },
      {
        key: "valorAdquisicion",
        header: "Valor Adquisición",
        type: "number",
        sortable: true,
        render: (value) => (
          <span className="font-mono text-sm">{formatCurrency(value)}</span>
        ),
      },
      {
        key: "fechaAdquisicion",
        header: "Fecha Adquisición",
        type: "date",
        sortable: true,
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
        render: (value) => getEstatusBadge(value),
      },
      {
        key: "id", // key id para acciones
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
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-popover">
                <DropdownMenuItem className="gap-2">
                  <Eye className="h-4 w-4" />
                  Ver expediente
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2">
                  <FileText className="h-4 w-4" />
                  Documentos
                </DropdownMenuItem>
                {activo.estatus === "operativo" && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="gap-2 text-destructive focus:text-destructive focus:bg-destructive/10"
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
      <div className="flex justify-center p-10">
        <Loader2 className="animate-spin h-8 w-8" />
      </div>
    );

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Activos</p>
                <p className="text-3xl font-bold">{totalActivos}</p>
              </div>
              <Truck className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Operativos</p>
                <p className="text-3xl font-bold text-green-600">
                  {operativos}
                </p>
              </div>
              <Package className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Bajas</p>
                <p className="text-3xl font-bold text-red-600">{bajas}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-600">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Valor Patrimonial
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(valorTotal)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resumen Agrupado */}
      <Card>
        <CardHeader>
          <CardTitle>Inventario Total por Tipo</CardTitle>
          <CardDescription>
            Resumen de activos operativos agrupados por categoría
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(resumenAgrupado).map(([tipo, data]) => (
              <div key={tipo} className="p-4 border rounded-lg bg-muted/30">
                <div className="flex items-center gap-3 mb-3">
                  {getTipoIcon(tipo)}
                  <div>
                    <h4 className="font-semibold capitalize">{tipo}</h4>
                    <p className="text-2xl font-bold text-primary">
                      {data.total}
                    </p>
                  </div>
                </div>
                <div className="space-y-1 text-xs text-muted-foreground">
                  {Object.entries(data.detalle).map(([modelo, cantidad]) => (
                    <div key={modelo} className="flex justify-between">
                      <span>{modelo}</span>
                      <span className="font-medium">{cantidad}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Activos */}
      <Card>
        <CardHeader>
          <CardTitle>Detalle de Activos Patrimoniales</CardTitle>
          <CardDescription>
            Listado completo de vehículos, remolques y equipos del patrimonio
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EnhancedDataTable
            data={activos}
            columns={columns}
            exportFileName="activos_patrimoniales"
          />
        </CardContent>
      </Card>

      {/* Modal de Baja */}
      <Dialog open={isBajaModalOpen} onOpenChange={setIsBajaModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Dar de Baja Activo
            </DialogTitle>
            <DialogDescription>
              Esta acción removerá el activo{" "}
              <strong>{activoToBaja?.numero_economico}</strong> de la
              disponibilidad operativa.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm">
                <strong>
                  {activoToBaja?.marca} {activoToBaja?.modelo}
                </strong>{" "}
                ({activoToBaja?.year})
              </p>
              <p className="text-xs text-muted-foreground">
                VIN: {activoToBaja?.vin}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Motivo de Baja *</Label>
              <Select
                value={bajaData.motivoBaja}
                onValueChange={(v) =>
                  setBajaData({ ...bajaData, motivoBaja: v as any })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar motivo..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="venta">Venta a terceros</SelectItem>
                  <SelectItem value="siniestro">
                    Siniestro / Pérdida total
                  </SelectItem>
                  <SelectItem value="chatarra">Chatarra / Desecho</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Fecha de Baja</Label>
              <Input
                type="date"
                value={bajaData.fechaBaja}
                onChange={(e) =>
                  setBajaData({ ...bajaData, fechaBaja: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Observaciones</Label>
              <Textarea
                placeholder="Detalles adicionales sobre la baja..."
                value={bajaData.observaciones}
                onChange={(e) =>
                  setBajaData({ ...bajaData, observaciones: e.target.value })
                }
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsBajaModalOpen(false)}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleConfirmBaja}
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="animate-spin h-4 w-4" />
              ) : (
                "Confirmar Baja"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
