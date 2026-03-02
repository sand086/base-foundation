// src/features/combustible/CombustibleCargas.tsx
import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Fuel,
  Plus,
  AlertTriangle,
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

import {
  AddTicketModal,
  type TicketFormData,
} from "@/features/combustible/AddTicketModal";
import { ViewCargaModal } from "@/features/combustible/ViewCargaModal";
import { EditCargaModal } from "@/features/combustible/EditCargaModal";

import {
  EnhancedDataTable,
  type ColumnDef,
} from "@/components/ui/enhanced-data-table";
import { cn } from "@/lib/utils";

import { toast } from "sonner";
import { fuelService } from "@/services/fuelService";

import { unitService } from "@/services/unitService";
import { operatorService } from "@/services/operatorService";

import { Alert, AlertDescription } from "@/components/ui/alert";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/** =========================
 * Tipos mínimos (ajusta si ya los tienes tipados en otro archivo)
 * ========================= */
type ID = string | number;

type Unit = {
  id: ID;
  numero_economico?: string | null;
  placas?: string | null;
  capacidad_tanque_diesel?: number | null;
  capacidad_tanque_urea?: number | null;

  // compat opcional
  capacidadTanqueDiesel?: number | null;
  capacidadTanqueUrea?: number | null;
};

type Operator = {
  id: ID;
  name?: string | null;
  // compat opcional
  nombre?: string | null;
};

function unitLabel(u: Unit) {
  const ne = (u.numero_economico ?? "").trim();
  const pl = (u.placas ?? "").trim();
  if (ne && pl) return `${ne} (${pl})`;
  if (ne) return ne;
  if (pl) return pl;
  return `Unidad ${String(u.id)}`;
}

function operatorLabel(o: Operator) {
  const n = (o.name ?? o.nombre ?? "").trim();
  return n || `Operador ${String(o.id)}`;
}

function getDieselCapacity(u: Unit): number | null {
  return (u.capacidad_tanque_diesel ?? u.capacidadTanqueDiesel ?? null) as
    | number
    | null;
}
function getUreaCapacity(u: Unit): number | null {
  return (u.capacidad_tanque_urea ?? u.capacidadTanqueUrea ?? null) as
    | number
    | null;
}

const CombustibleCargas = () => {
  const [units, setUnits] = useState<any[]>([]);
  const [idParaEliminar, setIdParaEliminar] = useState<string | null>(null);
  const [operators, setOperators] = useState<any[]>([]);
  const [cargas, setCargas] = useState<CargaCombustible[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [cargaToView, setCargaToView] = useState<CargaCombustible | null>(null);
  const [cargaToEdit, setCargaToEdit] = useState<CargaCombustible | null>(null);

  /** =========================
   * 1) Carga masiva de catálogos (fuel + unidades + operadores)
   * ========================= */
  useEffect(() => {
    const loadData = async () => {
      try {
        const [uData, oData, fData] = await Promise.all([
          unitService.getAll(),
          operatorService.getAll(),
          fuelService.getAll(),
        ]);

        setUnits(uData || []);
        setOperators(oData || []);

        // ✅ NORMALIZACIÓN: Convertimos snake_case a camelCase para que React lo entienda
        const normalizedFuel = (fData || []).map((item: any) => ({
          ...item,
          // Si el backend manda snake_case, lo mapeamos a lo que el Front usa
          tipoCombustible: item.tipo_combustible || item.tipoCombustible,
          fechaHora: item.fecha_hora || item.fechaHora,
          precioPorLitro: item.precio_por_litro || item.precioPorLitro,
          excedeTanque: item.excede_tanque ?? item.excedeTanque,
          evidenciaUrl: item.evidencia_url || item.evidenciaUrl,
        }));

        setCargas(normalizedFuel);
      } catch (error) {
        console.error("Error cargando catálogos:", error);
        toast.error("Error al sincronizar con el servidor");
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  /** =========================
   * Totales
   * ========================= */
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

  /** =========================
   * 2) Crear ticket (real)
   * - snapshot de capacidad desde UNITS reales (no catálogo local)
   * - refresh completo de fuelService.getAll()
   * ========================= */
  const handleAddTicket = async (data: TicketFormData) => {
    const toastId = toast.loading("Registrando ticket...");
    try {
      await fuelService.create(data);
      const updated = await fuelService.getAll();

      const normalized = updated.map((item: any) => ({
        ...item,
        tipoCombustible: item.tipo_combustible || item.tipoCombustible,
        fechaHora: item.fecha_hora || item.fechaHora,
        precioPorLitro: item.precio_por_litro || item.precioPorLitro,
        excedeTanque: item.excede_tanque ?? item.excedeTanque, // ✅ Faltaba este
        evidenciaUrl: item.evidencia_url || item.evidenciaUrl, // ✅ Faltaba este
      }));

      setCargas(normalized);
      toast.success("Ticket registrado", { id: toastId });
      setIsModalOpen(false);
    } catch (error) {
      toast.error("Error al guardar", { id: toastId });
    }
  };

  /** =========================
   * Edit (placeholder si tu endpoint aún no está)
   * Si ya tienes fuelService.update(id, payload), reemplaza aquí.
   * ========================= */
  const handleEditCarga = async (updatedCarga: CargaCombustible) => {
    setCargas((prev) =>
      prev.map((c) => (c.id === updatedCarga.id ? updatedCarga : c)),
    );
    toast.success("Cambios aplicados");
  };

  const handleDelete = async () => {
    if (!idParaEliminar) return;

    const toastId = toast.loading("Eliminando registro...");
    try {
      await fuelService.delete(idParaEliminar);

      // Actualizamos la UI
      setCargas((prev) => prev.filter((c) => String(c.id) !== idParaEliminar));

      toast.success("Registro eliminado correctamente", { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error("No se pudo eliminar el registro", { id: toastId });
    } finally {
      setIdParaEliminar(null); // Cerramos el modal
    }
  };

  /** =========================
   * Mappers para display en la tabla
   * - si tu API ya trae unidadNumero/operadorNombre, se respeta
   * - si no, se resuelve con catálogos units/operators
   * ========================= */
  const resolveUnidadDisplay = (row: CargaCombustible) => {
    const direct = (row as any).unidadNumero ?? (row as any).unidad_numero;
    if (direct) return String(direct);

    const unitId = (row as any).unidadId ?? (row as any).unidad_id;
    const u = units.find((x) => String(x.id) === String(unitId));
    return u ? unitLabel(u) : "";
  };

  const resolveOperadorDisplay = (row: CargaCombustible) => {
    const direct = (row as any).operadorNombre ?? (row as any).operador_nombre;
    if (direct) return String(direct);

    const opId = (row as any).operadorId ?? (row as any).operador_id;
    const o = operators.find((x) => String(x.id) === String(opId));
    return o ? operatorLabel(o) : "";
  };

  const resolveEvidenciaCell = (row: CargaCombustible) => {
    // si tu API trae un booleano/URL, ajústalo
    const has =
      Boolean((row as any).tieneEvidencia) ||
      Boolean((row as any).evidencia_url) ||
      Boolean((row as any).evidencia);

    return has ? (
      <div className="flex justify-center">
        <Badge
          variant="outline"
          className=" bg-emerald-50 text-emerald-700 border-emerald-200"
        >
          Sí
        </Badge>
      </div>
    ) : (
      <div className="flex justify-center">
        <Badge
          variant="outline"
          className=" bg-slate-50 text-slate-600 border-slate-200"
        >
          No
        </Badge>
      </div>
    );
  };

  /** =========================
   * Columns
   * ========================= */
  const columns: ColumnDef<CargaCombustible>[] = useMemo(
    () => [
      {
        key: "fechaHora",
        header: "Fecha/Hora",
        render: (value) => {
          if (!value) return "---";
          const date = new Date(String(value));
          return (
            <span className="font-mono text-xs">
              {date.toLocaleDateString("es-MX")}{" "}
              {date.toLocaleTimeString("es-MX", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          );
        },
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
        render: (_, row) => (
          <Badge variant="outline" className="font-mono">
            {resolveUnidadDisplay(row)}
          </Badge>
        ),
      },
      {
        key: "operadorNombre",
        header: "Operador",
        render: (_, row) => (
          <span className="text-sm max-w-[150px] truncate">
            {resolveOperadorDisplay(row)}
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
      {
        key: "estado",
        header: "Estado",
        render: (_, row) => (
          <div className="flex justify-center">
            {row.excedeTanque ? (
              <Badge
                variant="outline"
                className=" bg-amber-50 text-amber-700 border-amber-200"
                title="Los litros exceden la capacidad configurada para la unidad"
              >
                ALERTA
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className=" bg-emerald-50 text-emerald-700 border-emerald-200"
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
        render: (_, row) => resolveEvidenciaCell(row),
      },
      {
        key: "acciones",
        header: "Acciones",
        render: (_, row) => (
          <div
            className="flex justify-end"
            onClick={(e) => e.stopPropagation()}
          >
            {" "}
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
                  onClick={(e) => {
                    e.stopPropagation(); // Evita que se abra el modal de detalles
                    setIdParaEliminar(String(row.id)); // 1. Guardamos el ID (esto abre el AlertDialog automáticamente)
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    // dependencias reales que afectan render
    [cargas, units, operators],
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
      <AlertDialog
        open={!!idParaEliminar}
        onOpenChange={(open) => !open && setIdParaEliminar(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción marcará el ticket #{idParaEliminar} como eliminado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleDelete()} // 2. Ahora sí ejecutamos la función real
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
        units={units}
        operators={operators}
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
        units={units} //
        operators={operators} //
        onSave={async () => {
          // Al guardar en el modal, refrescamos la lista entera desde el servidor
          const updated = await fuelService.getAll();
          // Re-normalizamos la data para los KPIs
          const normalized = updated.map((item: any) => ({
            ...item,
            tipoCombustible: item.tipo_combustible || item.tipoCombustible,
            fechaHora: item.fecha_hora || item.fechaHora,
            precioPorLitro: item.precio_por_litro || item.precioPorLitro,
            excedeTanque: item.excede_tanque ?? item.excedeTanque,
            evidenciaUrl: item.evidencia_url || item.evidenciaUrl,
          }));
          setCargas(normalized);
        }}
      />
    </div>
  );
};

export default CombustibleCargas;
