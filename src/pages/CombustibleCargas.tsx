// src/features/combustible/CombustibleCargas.tsx
import { useState, useEffect, useMemo } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Fuel,
  Plus,
  AlertTriangle,
  Image,
  ImageOff,
  FileText,
  TrendingUp,
  Gauge,
  Droplets,
  MoreVertical,
  Eye,
  Pencil,
  Trash2,
  Loader2,
} from "lucide-react";

import type { CargaCombustible, TipoCombustible } from "@/data/combustibleData";
import { unidadesCombustible } from "@/data/combustibleData";

import {
  AddTicketModal,
  type TicketFormData,
} from "@/features/combustible/AddTicketModal";
import { ViewCargaModal } from "@/features/combustible/ViewCargaModal";
import { EditCargaModal } from "@/features/combustible/EditCargaModal";

import {
  EnhancedDataTable,
  ColumnDef,
} from "@/components/ui/enhanced-data-table";
import { cn } from "@/lib/utils";

import { toast } from "sonner";
import { fuelService } from "@/services/fuelService";

// ✅ Alert UI
import { Alert, AlertDescription } from "@/components/ui/alert";

// ✅ Dropdown actions
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

/**
 * ✅ Nota importante:
 * En tu último update agregaste `checkRouteGap` usando `segments`, pero este módulo
 * NO maneja segmentos (eso es de Tarifas). Aquí lo correcto es mostrar "Estado" con
 * base en `excedeTanque` (y si quieres, `capacidadTanque`).
 * Por eso: eliminé `checkRouteGap` y la columna "Estado" ahora se basa en `excedeTanque`.
 */

const CombustibleCargas = () => {
  const [cargas, setCargas] = useState<CargaCombustible[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [cargaToView, setCargaToView] = useState<CargaCombustible | null>(null);
  const [cargaToEdit, setCargaToEdit] = useState<CargaCombustible | null>(null);

  // 1) Cargar datos del API al montar
  useEffect(() => {
    const loadCargas = async () => {
      try {
        const data = await fuelService.getAll();
        setCargas(data);
      } catch (error) {
        console.error(error);
        toast.error("Error al obtener la bitácora");
      } finally {
        setIsLoading(false);
      }
    };

    void loadCargas();
  }, []);

  // --- Totales ---
  const dieselCargas = useMemo(
    () => cargas.filter((c) => c.tipoCombustible === "diesel"),
    [cargas],
  );
  const ureaCargas = useMemo(
    () => cargas.filter((c) => c.tipoCombustible === "urea"),
    [cargas],
  );

  const totalLitrosDiesel = useMemo(
    () => dieselCargas.reduce((sum, c) => sum + (c.litros || 0), 0),
    [dieselCargas],
  );
  const totalLitrosUrea = useMemo(
    () => ureaCargas.reduce((sum, c) => sum + (c.litros || 0), 0),
    [ureaCargas],
  );
  const totalMontoDiesel = useMemo(
    () => dieselCargas.reduce((sum, c) => sum + (c.total || 0), 0),
    [dieselCargas],
  );
  const totalMontoUrea = useMemo(
    () => ureaCargas.reduce((sum, c) => sum + (c.total || 0), 0),
    [ureaCargas],
  );
  const cargasConAlerta = useMemo(
    () => cargas.filter((c) => c.excedeTanque).length,
    [cargas],
  );

  const FuelTypeBadge = ({ type }: { type: TipoCombustible }) => (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 font-medium transition-all",
        type === "diesel"
          ? "bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-200"
          : "bg-sky-100 text-sky-700 border-sky-300 hover:bg-sky-200",
      )}
    >
      {type === "diesel" ? (
        <Fuel className="h-3 w-3" />
      ) : (
        <Droplets className="h-3 w-3" />
      )}
      {type === "diesel" ? "Diesel" : "Urea"}
    </Badge>
  );

  // 2) Envío real al backend con snapshot/alerta y refresh completo
  const handleAddTicket = async (data: TicketFormData) => {
    const toastId = toast.loading("Registrando ticket y subiendo evidencia...");

    try {
      // Snapshot: capacidad por unidad (de tu catálogo local)
      const unit = unidadesCombustible.find((u) => u.id === data.unidadId);
      const tankCapacity =
        data.tipoCombustible === "diesel"
          ? unit?.capacidadTanqueDiesel
          : unit?.capacidadTanqueUrea;

      const payload = {
        ...data,
        capacidad_tanque_snapshot: tankCapacity ?? null,
        excede_tanque: data.litros > (tankCapacity || 0),
      };

      await fuelService.create(payload);

      const updatedList = await fuelService.getAll();
      setCargas(updatedList);

      toast.success("Ticket registrado correctamente", { id: toastId });
      setIsModalOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("No se pudo guardar el ticket", { id: toastId });
    }
  };

  // Edit (placeholder si todavía no tienes endpoint)
  const handleEditCarga = async (updatedCarga: CargaCombustible) => {
    setCargas((prev) =>
      prev.map((c) => (c.id === updatedCarga.id ? updatedCarga : c)),
    );
    toast.success("Cambios aplicados");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este registro? Esta acción no se puede deshacer."))
      return;

    try {
      await fuelService.delete(id);
      setCargas((prev) => prev.filter((c) => c.id !== id));
      toast.success("Registro eliminado");
    } catch (error) {
      console.error(error);
      toast.error("No se pudo eliminar");
    }
  };

  // Columns
  const columns: ColumnDef<CargaCombustible>[] = useMemo(
    () => [
      {
        key: "fechaHora",
        header: "Fecha/Hora",
        type: "date",
        render: (value) => (
          <span className="font-mono text-sm">{String(value ?? "")}</span>
        ),
      },
      {
        key: "tipoCombustible",
        header: "Tipo",
        type: "status",
        statusOptions: ["diesel", "urea"],
        render: (value) => <FuelTypeBadge type={value as TipoCombustible} />,
      },
      {
        key: "unidadNumero",
        header: "Unidad",
        render: (value) => (
          <Badge variant="outline" className="font-mono">
            {String(value ?? "")}
          </Badge>
        ),
      },
      {
        key: "operadorNombre",
        header: "Operador",
        render: (value) => (
          <span className="text-sm max-w-[150px] truncate">
            {String(value ?? "")}
          </span>
        ),
      },
      {
        key: "estacion",
        header: "Estación",
        render: (value) => (
          <span className="text-sm max-w-[200px] truncate text-muted-foreground">
            {String(value ?? "")}
          </span>
        ),
      },
      {
        key: "litros",
        header: "Litros",
        type: "number",
        render: (value, row) => (
          <div className="flex items-center justify-end gap-1">
            {row.excedeTanque && (
              <AlertTriangle className="h-4 w-4 text-status-warning" />
            )}
            <span
              className={
                row.excedeTanque
                  ? "text-status-warning font-semibold"
                  : "font-mono"
              }
            >
              {Number(value ?? 0).toFixed(1)} L
            </span>
          </div>
        ),
      },
      {
        key: "precioPorLitro",
        header: "Precio/L",
        type: "number",
        render: (value) => (
          <span className="font-mono text-sm text-right">
            ${Number(value ?? 0).toFixed(2)}
          </span>
        ),
      },
      {
        key: "total",
        header: "Total",
        type: "number",
        render: (value) => (
          <span className="font-semibold text-right">
            $
            {Number(value ?? 0).toLocaleString("es-MX", {
              minimumFractionDigits: 2,
            })}
          </span>
        ),
      },
      {
        key: "odometro",
        header: "Odómetro",
        type: "number",
        render: (value) => (
          <div className="flex items-center justify-end gap-1 text-muted-foreground">
            <Gauge className="h-3 w-3" />
            <span className="font-mono text-sm">
              {Number(value ?? 0).toLocaleString()}
            </span>
          </div>
        ),
      },

      /**
       * ✅ Reemplazo de la columna "Estado":
       * Antes estabas intentando usar checkRouteGap(idx) (que depende de segments)
       * Aquí lo correcto: mostrar alerta si excede tanque, si no "OK".
       */
      {
        key: "estado",
        header: "Estado",
        render: (_, row) => (
          <div className="flex justify-center">
            {row.excedeTanque ? (
              <Badge
                variant="outline"
                className="text-[10px] bg-amber-50 text-amber-700 border-amber-200"
                title="Los litros exceden la capacidad configurada para la unidad"
              >
                ALERTA
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200"
              >
                OK
              </Badge>
            )}
          </div>
        ),
      },

      {
        key: "tieneEvidencia",
        header: "Evidencia",
        render: (value) => <div className="flex justify-center">{value}</div>,
      },

      // ✅ Acciones (Dropdown)
      {
        key: "acciones",
        header: "Acciones",
        render: (_, row) => (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setCargaToView(row)}>
                  <Eye className="mr-2 h-4 w-4" /> Ver Detalles
                </DropdownMenuItem>

                <DropdownMenuItem onClick={() => setCargaToEdit(row)}>
                  <Pencil className="mr-2 h-4 w-4" /> Editar
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => handleDelete(String(row.id))}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    [cargas],
  );

  const handleRowClick = (row: CargaCombustible) => setCargaToView(row);

  if (isLoading) {
    return (
      <div className="flex justify-center p-20">
        <Loader2 className="animate-spin h-10 w-10 text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bitácora de Cargas"
        description="Registro de tickets de combustible (Diesel y Urea/DEF)"
      />

      {/* Help */}
      <Alert className="bg-amber-50 border-amber-200 mb-6">
        <Fuel className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800 text-xs">
          <span className="font-bold">Sistema de Control de Combustible:</span>{" "}
          Registra cargas de Diesel y Urea. El sistema validará automáticamente
          si los litros ingresados exceden la capacidad configurada en la{" "}
          <span className="font-bold">Ficha de la Unidad</span>. Es obligatorio
          subir la foto del ticket para auditoría.
        </AlertDescription>
      </Alert>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Cargas</p>
                <p className="text-3xl font-bold">{cargas.length}</p>
              </div>
              <FileText className="h-8 w-8 text-primary opacity-60" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {dieselCargas.length} Diesel • {ureaCargas.length} Urea
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/10 rounded-bl-full" />
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Fuel className="h-3 w-3" /> Litros Diesel
                </p>
                <p className="text-3xl font-bold text-amber-600">
                  {totalLitrosDiesel.toLocaleString()}
                </p>
              </div>
              <Fuel className="h-8 w-8 text-amber-500 opacity-60" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              ${totalMontoDiesel.toLocaleString("es-MX")} MXN
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-sky-500 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-16 h-16 bg-sky-500/10 rounded-bl-full" />
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Droplets className="h-3 w-3" /> Litros Urea/DEF
                </p>
                <p className="text-3xl font-bold text-sky-600">
                  {totalLitrosUrea.toLocaleString()}
                </p>
              </div>
              <Droplets className="h-8 w-8 text-sky-500 opacity-60" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              ${totalMontoUrea.toLocaleString("es-MX")} MXN
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-status-success">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Monto Total</p>
                <p className="text-2xl font-bold">
                  ${(totalMontoDiesel + totalMontoUrea).toLocaleString("es-MX")}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-status-success opacity-60" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-status-warning">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Con Alerta</p>
                <p className="text-3xl font-bold text-status-warning">
                  {cargasConAlerta}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-status-warning opacity-60" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex justify-end">
        <Button
          onClick={() => setIsModalOpen(true)}
          className="h-9 gap-2 bg-action hover:bg-action-hover text-action-foreground"
        >
          <Plus className="h-4 w-4" />
          Agregar Ticket
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          <EnhancedDataTable
            data={cargas}
            columns={columns}
            onRowClick={handleRowClick}
            exportFileName="cargas_combustible"
          />
        </CardContent>
      </Card>

      {/* Modals */}
      <AddTicketModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onSubmit={handleAddTicket}
      />

      <ViewCargaModal
        open={!!cargaToView}
        onOpenChange={() => setCargaToView(null)}
        carga={cargaToView}
      />

      <EditCargaModal
        open={!!cargaToEdit}
        onOpenChange={() => setCargaToEdit(null)}
        carga={cargaToEdit}
        onSave={handleEditCarga}
      />
    </div>
  );
};

export default CombustibleCargas;
