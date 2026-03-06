import { useState, useMemo } from "react";
import {
  Truck,
  Plus,
  AlertTriangle,
  Eye,
  Edit,
  Trash2,
  Package,
  Loader2,
  MoreHorizontal,
  AlertCircle,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

// Componentes UI
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch"; // 🚀 AÑADIMOS EL SWITCH DE SHADCN
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  EnhancedDataTable,
  ColumnDef,
} from "@/components/ui/enhanced-data-table";
import { toast } from "sonner"; // 🚀 PARA AVISAR QUE SE GUARDÓ EL ESTADO

// Features y Hooks
import { AddUnidadModal } from "@/features/flota/AddUnidadModal";
import { PatrimonialView } from "@/features/flota/PatrimonialView";
import { useUnits } from "@/hooks/useUnits";

import { Unit } from "@/types/api.types";

// --- Helpers Visuales ---
const getStatusBadge = (status: string) => {
  const s = status?.toLowerCase() || "";
  switch (s) {
    case "disponible":
      return (
        <Badge className="bg-green-600 text-white hover:bg-green-700 shadow-sm">
          Disponible
        </Badge>
      );
    case "en_ruta":
      return (
        <Badge className="bg-blue-600 text-white hover:bg-blue-700 shadow-sm">
          En Ruta
        </Badge>
      );
    case "mantenimiento":
      return (
        <Badge className="bg-yellow-500 text-black hover:bg-yellow-600 shadow-sm">
          Mantenimiento
        </Badge>
      );
    case "bloqueado":
      return (
        <Badge className="bg-red-600 text-white hover:bg-red-700 shadow-sm">
          Bloqueado
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary" className="shadow-sm">
          {status}
        </Badge>
      );
  }
};

const getTipoBadge = (tipo: string) => {
  return (
    <Badge variant="outline" className="text-xs uppercase font-medium bg-white">
      {tipo}
    </Badge>
  );
};

export default function FlotaUnidades() {
  const navigate = useNavigate();

  // Hook de gestión de datos
  const {
    unidades,
    isLoading,
    createUnit,
    updateUnit,
    deleteUnit,
    updateLoadStatus,
  } = useUnits();

  // Estados locales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Tipado correcto: IDs son numéricos y la unidad a editar es tipo Unidad completa
  const [unidadToEdit, setUnidadToEdit] = useState<Unit | null>(null);
  const [unidadToDelete, setUnidadToDelete] = useState<number | null>(null);

  // Contadores para KPIs rápidos
  const disponibles = unidades.filter((u) => u.status === "disponible").length;
  const enRuta = unidades.filter((u) => u.status === "en_ruta").length;
  const bloqueadas = unidades.filter((u) => u.status === "bloqueado").length;
  const mantenimiento = unidades.filter(
    (u) => u.status === "mantenimiento",
  ).length;

  // --- Handlers ---
  const handleSave = async (unitData: Partial<Unit>) => {
    setIsSaving(true);
    let success = false;

    if (unitData.id) {
      success = await updateUnit(unitData.id, unitData);
    } else {
      success = await createUnit(unitData as any);
    }

    setIsSaving(false);
    if (success) {
      handleCloseModal(false);
    }
  };

  const handleDelete = async () => {
    if (unidadToDelete) {
      await deleteUnit(unidadToDelete);
      setUnidadToDelete(null);
    }
  };

  const handleEdit = (unidad: Unit) => {
    setUnidadToEdit(unidad);
    setIsModalOpen(true);
  };

  const handleOpenNewModal = () => {
    setUnidadToEdit(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = (open: boolean) => {
    setIsModalOpen(open);
    if (!open) {
      setTimeout(() => setUnidadToEdit(null), 300);
    }
  };

  // Definición de columnas usando el tipo Unit correcto
  const columns: ColumnDef<Unit>[] = useMemo(
    () => [
      {
        key: "numero_economico",
        header: "No. Económico",
        render: (value) => (
          <span className="font-black text-brand-navy">ECO-{value}</span>
        ),
      },
      {
        key: "placas",
        header: "Placas",
        render: (value) => (
          <span className="font-mono text-sm font-medium text-slate-600">
            {value || "S/P"}
          </span>
        ),
      },
      {
        key: "marca",
        header: "Marca / Modelo",
        render: (_, row) => (
          <div className="flex flex-col">
            <span className="font-bold text-slate-800">{row.marca}</span>
            <span className="text-xs font-medium text-slate-500">
              {row.modelo} {row.year}
            </span>
          </div>
        ),
      },
      {
        key: "tipo",
        header: "Tipo",
        render: (value) => getTipoBadge(value),
      },
      // 🚀 NUEVA COLUMNA DE UX PARA GUSTAVO: CONTROL DEL "BOTE" (CHASIS)
      {
        key: "is_loaded",
        header: "Estado Carga",
        render: (_, row) => {
          // Identificar si la unidad es un remolque/chasis (solo a ellos se les monta contenedor)
          const esRemolque = [
            "remolque",
            "caja",
            "plataforma",
            "chasis",
            "utilitario",
          ].some(
            (t) =>
              row.tipo_1?.toLowerCase().includes(t) ||
              row.tipo?.toLowerCase().includes(t),
          );

          if (!esRemolque) {
            return (
              <span className="text-xs text-slate-400 font-medium italic">
                N/A (Tracto)
              </span>
            );
          }

          // Es un chasis: Mostramos el Switch interactivo
          const isLoaded = (row as any).is_loaded || false;

          return (
            <div className="flex items-center gap-3">
              <Switch
                checked={isLoaded}
                onCheckedChange={async (checked) => {
                  // Guardar el estado en la base de datos en tiempo real
                  const success = await updateUnit(row.id, {
                    is_loaded: checked,
                  } as any);
                  if (success) {
                    toast.success(
                      `Chasis ${row.numero_economico} actualizado`,
                      {
                        description: checked
                          ? "El chasis tiene un contenedor montado."
                          : "El chasis está vacío y libre.",
                      },
                    );
                  }
                }}
              />
              <Badge
                variant="outline"
                className={`transition-colors border px-2 py-0.5 ${
                  isLoaded
                    ? "bg-brand-navy/10 text-brand-navy border-brand-navy/20"
                    : "bg-slate-100 text-slate-500 border-slate-200"
                }`}
              >
                {isLoaded ? "📦 CARGADO" : "➖ VACÍO"}
              </Badge>
            </div>
          );
        },
      },
      {
        key: "status",
        header: "Estatus Operativo",
        render: (_, row) => (
          <div className="flex items-center gap-2">
            {getStatusBadge(row.status)}

            {/* MOSTRAR MOTIVO SI ESTÁ BLOQUEADO */}
            {row.status === "bloqueado" && row.razon_bloqueo && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <AlertCircle className="h-4 w-4 text-red-500 cursor-help transition-transform hover:scale-110" />
                  </TooltipTrigger>
                  <TooltipContent className="bg-red-50 text-red-900 border-red-200 font-medium shadow-lg">
                    <p className="font-bold mb-1">Motivo de Bloqueo:</p>
                    <p>{row.razon_bloqueo}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        ),
      },

      {
        key: "id",
        header: "Acciones",
        sortable: false,
        render: (_, row) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 p-0 hover:bg-slate-200"
              >
                <MoreHorizontal className="h-4 w-4 text-slate-600" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="bg-white rounded-xl shadow-xl p-1"
            >
              <DropdownMenuItem
                onClick={() =>
                  navigate(`/flota/unidad/${row.numero_economico}`)
                }
                className="rounded-lg cursor-pointer"
              >
                <Eye className="h-4 w-4 mr-3 text-slate-400" />{" "}
                <span className="font-medium">Ver Expediente</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleEdit(row)}
                className="rounded-lg cursor-pointer"
              >
                <Edit className="h-4 w-4 mr-3 text-slate-400" />{" "}
                <span className="font-medium">Editar Unidad</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-1" />
              <DropdownMenuItem
                className="text-red-600 focus:text-red-700 focus:bg-red-50 rounded-lg cursor-pointer font-bold"
                onClick={() => setUnidadToDelete(row.id)}
              >
                <Trash2 className="h-4 w-4 mr-3" /> Eliminar Unidad
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [updateLoadStatus, navigate],
  );

  if (isLoading)
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin h-10 w-10 text-brand-navy" />
          <p className="text-muted-foreground font-medium animate-pulse">
            Cargando flota operativa...
          </p>
        </div>
      </div>
    );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-black text-brand-navy flex items-center gap-2">
            <Truck className="h-7 w-7 text-emerald-600" /> Gestión de Flota
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Catálogo de unidades, disponibilidad en patio y estatus físico.
          </p>
        </div>
        <Button
          className="gap-2 bg-brand-navy text-white hover:bg-brand-navy/90 font-bold shadow-md h-11 px-6 rounded-xl"
          onClick={handleOpenNewModal}
        >
          <Plus className="h-5 w-5" /> Nueva Unidad
        </Button>
      </div>

      <Tabs defaultValue="unidades" className="space-y-4">
        <TabsList className="bg-slate-100 p-1 h-12 rounded-xl">
          <TabsTrigger
            value="unidades"
            className="gap-2 text-sm font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            <Truck className="h-4 w-4" /> Unidades Operativas
          </TabsTrigger>
          <TabsTrigger
            value="patrimonial"
            className="gap-2 text-sm font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            <Package className="h-4 w-4" /> Control Patrimonial
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="unidades"
          className="space-y-6 m-0 focus-visible:outline-none"
        >
          {/* DASHBOARD DE FLOTA */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="border-l-4 border-l-green-500 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">
                  Disponibles
                </p>
                <p className="text-3xl font-black text-green-600">
                  {disponibles}
                </p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-blue-600 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">
                  En Ruta
                </p>
                <p className="text-3xl font-black text-blue-600">{enRuta}</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-yellow-500 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">
                  Mantenimiento
                </p>
                <p className="text-3xl font-black text-yellow-600">
                  {mantenimiento}
                </p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-red-600 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">
                      Bloqueadas
                    </p>
                    <p className="text-3xl font-black text-red-600">
                      {bloqueadas}
                    </p>
                  </div>
                  {bloqueadas > 0 && (
                    <AlertTriangle className="h-8 w-8 text-red-500/20 absolute right-4 top-4" />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-lg border-slate-200 overflow-hidden rounded-2xl">
            <CardContent className="p-0">
              <EnhancedDataTable
                data={unidades}
                columns={columns}
                exportFileName="flota_unidades"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent
          value="patrimonial"
          className="m-0 focus-visible:outline-none"
        >
          <PatrimonialView />
        </TabsContent>
      </Tabs>

      {/* MODAL DE CREACIÓN/EDICIÓN */}
      <AddUnidadModal
        open={isModalOpen}
        onOpenChange={handleCloseModal}
        unidadToEdit={unidadToEdit}
        onSave={handleSave}
        isSaving={isSaving}
      />

      {/* DIÁLOGO DE CONFIRMACIÓN DE ELIMINACIÓN */}
      <AlertDialog
        open={!!unidadToDelete}
        onOpenChange={(open) => !open && setUnidadToDelete(null)}
      >
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600 font-black">
              <Trash2 className="h-5 w-5" /> Confirmar Eliminación
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base text-slate-600 mt-3">
              ¿Está seguro que desea eliminar la unidad{" "}
              <span className="font-black text-slate-900">
                ECO-
                {
                  unidades.find((u) => u.id === unidadToDelete)
                    ?.numero_economico
                }
              </span>
              ?
              <br />
              <br />
              <span className="bg-red-50 text-red-700 p-2 rounded block border border-red-100 text-sm font-medium">
                Esta acción eliminará el historial técnico asociado y no se
                puede deshacer.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel className="rounded-xl font-bold">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold"
              onClick={handleDelete}
            >
              Sí, Eliminar Unidad
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
