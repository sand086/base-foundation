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
} from "lucide-react";
import { useNavigate } from "react-router-dom";

// Componentes UI
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

// Features y Hooks
import { AddUnidadModal } from "@/features/flota/AddUnidadModal";
import { PatrimonialView } from "@/features/flota/PatrimonialView";
import { useUnits } from "@/hooks/useUnits";

import { Unidad } from "@/types/api.types";

// --- Helpers Visuales ---
const getStatusBadge = (status: string) => {
  const s = status?.toLowerCase() || "";
  switch (s) {
    case "disponible":
      return (
        <Badge className="bg-green-600 text-white hover:bg-green-700">
          Disponible
        </Badge>
      );
    case "en_ruta":
      return (
        <Badge className="bg-blue-600 text-white hover:bg-blue-700">
          En Ruta
        </Badge>
      );
    case "mantenimiento":
      return (
        <Badge className="bg-yellow-500 text-black hover:bg-yellow-600">
          Mantenimiento
        </Badge>
      );
    case "bloqueado":
      return (
        <Badge className="bg-red-600 text-white hover:bg-red-700">
          Bloqueado
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

const getTipoBadge = (tipo: string) => {
  return (
    <Badge variant="outline" className="text-xs uppercase font-medium">
      {tipo}
    </Badge>
  );
};

export default function FlotaUnidades() {
  const navigate = useNavigate();

  // Hook de gestión de datos
  const { unidades, isLoading, createUnit, updateUnit, deleteUnit } =
    useUnits();

  // Estados locales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Tipado correcto: IDs son numéricos y la unidad a editar es tipo Unidad completa
  const [unidadToEdit, setUnidadToEdit] = useState<Unidad | null>(null);
  const [unidadToDelete, setUnidadToDelete] = useState<number | null>(null);

  // Contadores para KPIs rápidos
  const disponibles = unidades.filter((u) => u.status === "disponible").length;
  const enRuta = unidades.filter((u) => u.status === "en_ruta").length;
  const bloqueadas = unidades.filter((u) => u.status === "bloqueado").length;
  const mantenimiento = unidades.filter(
    (u) => u.status === "mantenimiento",
  ).length;

  // --- Handlers ---

  /**
   * Recibe el payload LIMPIO desde AddUnidadModal.
   * Ya no necesitamos transformar datos aquí.
   */
  const handleSave = async (unitData: Partial<Unidad>) => {
    setIsSaving(true);
    let success = false;

    // Si tiene ID, es una actualización
    if (unitData.id) {
      // updateUnit en el hook debería aceptar (id, data)
      success = await updateUnit(unitData.id.toString(), unitData);
    } else {
      // Crear nueva unidad
      success = await createUnit(unitData as any);
    }

    setIsSaving(false);
    if (success) {
      handleCloseModal(false);
    }
  };

  const handleDelete = async () => {
    if (unidadToDelete) {
      // deleteUnit espera string en tu hook actual, convertimos si es necesario
      await deleteUnit(unidadToDelete.toString());
      setUnidadToDelete(null);
    }
  };

  const handleEdit = (unidad: Unidad) => {
    // Pasamos el objeto Unidad completo, el Modal sabrá mapearlo
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
      // Pequeño timeout para limpiar el estado después de cerrar la animación
      setTimeout(() => setUnidadToEdit(null), 300);
    }
  };

  // Definición de columnas usando el tipo Unit correcto
  const columns: ColumnDef<Unidad>[] = useMemo(
    () => [
      {
        key: "numero_economico",
        header: "No. Económico",
        render: (value) => <span className="font-bold">{value}</span>,
      },
      {
        key: "placas",
        header: "Placas",
        render: (value) => (
          <span className="font-mono text-sm">{value || "S/P"}</span>
        ),
      },
      {
        key: "marca",
        header: "Marca / Modelo",
        render: (_, row) => (
          <div className="flex flex-col">
            <span className="font-medium">{row.marca}</span>
            <span className="text-xs text-muted-foreground">
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
      {
        key: "documentos_vencidos",
        header: "Docs. Vencidos",
        render: (value) =>
          value > 0 ? (
            <Badge className="bg-red-500 text-white hover:bg-red-600">
              {value}
            </Badge>
          ) : (
            <Badge className="bg-green-500 text-white hover:bg-green-600 opacity-50">
              0
            </Badge>
          ),
      },
      {
        key: "llantas_criticas",
        header: "Llantas Críticas",
        render: (value) =>
          value > 0 ? (
            <Badge className="bg-red-500 text-white hover:bg-red-600">
              {value}
            </Badge>
          ) : (
            <Badge className="bg-green-500 text-white hover:bg-green-600 opacity-50">
              0
            </Badge>
          ),
      },
      {
        key: "status",
        header: "Estatus",
        render: (value) => getStatusBadge(value),
      },
      {
        key: "id", // Usamos 'id' para la key, pero renderizamos acciones
        header: "Acciones",
        sortable: false,
        render: (_, row) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover">
              <DropdownMenuItem
                onClick={() =>
                  navigate(`/flota/unidad/${row.numero_economico}`)
                }
              >
                <Eye className="h-4 w-4 mr-2" /> Ver detalles
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleEdit(row)}>
                <Edit className="h-4 w-4 mr-2" /> Editar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive focus:bg-destructive/10"
                onClick={() => setUnidadToDelete(row.id)}
              >
                <Trash2 className="h-4 w-4 mr-2" /> Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [navigate],
  );

  if (isLoading)
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin h-8 w-8 text-primary" />
          <p className="text-muted-foreground">Cargando flota...</p>
        </div>
      </div>
    );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Truck className="h-6 w-6" /> Gestión de Flota
          </h1>
          <p className="text-muted-foreground">
            Catálogo de unidades e inventario patrimonial
          </p>
        </div>
      </div>

      <Tabs defaultValue="unidades" className="space-y-4">
        <TabsList>
          <TabsTrigger value="unidades" className="gap-2">
            <Truck className="h-4 w-4" /> Unidades Operativas
          </TabsTrigger>
          <TabsTrigger value="patrimonial" className="gap-2">
            <Package className="h-4 w-4" /> Patrimonial
          </TabsTrigger>
        </TabsList>

        <TabsContent value="unidades" className="space-y-6">
          <div className="flex justify-end">
            <Button
              className="gap-2 bg-primary text-white hover:bg-primary/90"
              onClick={handleOpenNewModal}
            >
              <Plus className="h-4 w-4" /> Nueva Unidad
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <Card className="border-l-4 border-l-green-500 shadow-sm">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground font-medium">
                  Disponibles
                </p>
                <p className="text-3xl font-bold text-green-600">
                  {disponibles}
                </p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-blue-600 shadow-sm">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground font-medium">
                  En Ruta
                </p>
                <p className="text-3xl font-bold text-blue-600">{enRuta}</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-yellow-500 shadow-sm">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground font-medium">
                  Mantenimiento
                </p>
                <p className="text-3xl font-bold text-yellow-600">
                  {mantenimiento}
                </p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-red-600 shadow-sm">
              <CardContent className="pt-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">
                      Bloqueadas
                    </p>
                    <p className="text-3xl font-bold text-red-600">
                      {bloqueadas}
                    </p>
                  </div>
                  {bloqueadas > 0 && (
                    <AlertTriangle className="h-6 w-6 text-red-500 animate-pulse" />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-sm">
            <CardContent className="pt-6">
              <EnhancedDataTable
                data={unidades}
                columns={columns}
                exportFileName="flota_unidades"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="patrimonial">
          <PatrimonialView />
        </TabsContent>
      </Tabs>

      {/* MODAL DE CREACIÓN/EDICIÓN */}
      <AddUnidadModal
        open={isModalOpen}
        onOpenChange={handleCloseModal}
        unidadToEdit={unidadToEdit} // Ahora el tipo coincide perfectamente
        onSave={handleSave}
        isSaving={isSaving}
      />

      {/* DIÁLOGO DE CONFIRMACIÓN DE ELIMINACIÓN */}
      <AlertDialog
        open={!!unidadToDelete}
        onOpenChange={(open) => !open && setUnidadToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Truck className="h-5 w-5" />
              Confirmar Eliminación
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Está seguro que desea eliminar la unidad{" "}
              <span className="font-bold text-foreground">
                {
                  unidades.find((u) => u.id === unidadToDelete)
                    ?.numero_economico
                }
              </span>
              ?
              <br />
              Esta acción eliminará el historial técnico asociado y no se puede
              deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-white"
              onClick={handleDelete}
            >
              Sí, Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
