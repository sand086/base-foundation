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
} from "lucide-react";
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
import { MoreHorizontal } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AddUnidadModal } from "@/features/flota/AddUnidadModal";
import { PatrimonialView } from "@/features/flota/PatrimonialView";
import {
  EnhancedDataTable,
  ColumnDef,
} from "@/components/ui/enhanced-data-table";
import { useUnits } from "@/hooks/useUnits";
import { Unidad } from "@/services/unitService";

// --- NUEVA INTERFAZ PARA EL FORMULARIO (camelCase) ---
// Esto define qué datos espera el Modal y qué datos devuelve al guardar
export interface UnidadFormData {
  id?: string;
  numero_economico: string;
  placas: string;
  marca: string;
  modelo: string;
  year: number;
  tipo: "sencillo" | "full" | "rabon";
  status: "disponible" | "en_ruta" | "mantenimiento" | "bloqueado";
  documentosVencidos?: number;
  llantasCriticas?: number;
  // Agrega aquí otros campos si el modal los usa (ej: vin)
}

// Helpers de Badges
const getStatusBadge = (status: string) => {
  const s = status?.toLowerCase() || "";
  switch (s) {
    case "disponible":
      return <Badge className="bg-green-600 text-white">Disponible</Badge>;
    case "en_ruta":
      return <Badge className="bg-blue-600 text-white">En Ruta</Badge>;
    case "mantenimiento":
      return <Badge className="bg-yellow-500 text-black">Mantenimiento</Badge>;
    case "bloqueado":
      return <Badge className="bg-red-600 text-white">Bloqueado</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

const getTipoBadge = (tipo: string) => {
  return (
    <Badge variant="outline" className="text-xs uppercase">
      {tipo}
    </Badge>
  );
};

export default function FlotaUnidades() {
  const navigate = useNavigate();
  const { unidades, isLoading, createUnit, updateUnit, deleteUnit } =
    useUnits();

  const [isModalOpen, setIsModalOpen] = useState(false);

  // CORRECCIÓN 1: Usar el tipo UnidadFormData en lugar de any
  const [unidadToEdit, setUnidadToEdit] = useState<UnidadFormData | null>(null);

  const [unidadToDelete, setUnidadToDelete] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const disponibles = unidades.filter((u) => u.status === "disponible").length;
  const enRuta = unidades.filter((u) => u.status === "en_ruta").length;
  const bloqueadas = unidades.filter((u) => u.status === "bloqueado").length;
  const mantenimiento = unidades.filter(
    (u) => u.status === "mantenimiento",
  ).length;

  // --- Handlers ---

  // CORRECCIÓN 2: Tipar 'data' como UnidadFormData
  const handleSave = async (data: UnidadFormData) => {
    setIsSaving(true);

    // Transformar de camelCase (Form) a snake_case (Backend/Unidad)
    // TypeScript ahora sabe qué propiedades existen
    const payload: Unidad = {
      id: unidadToEdit?.id || crypto.randomUUID(), // Generar ID temporal si no existe
      numero_economico: data.numero_economico,
      placas: data.placas,
      marca: data.marca,
      modelo: data.modelo,
      year: data.year,
      tipo: data.tipo,
      status: data.status,
      documentos_vencidos: data.documentosVencidos || 0,
      llantas_criticas: data.llantasCriticas || 0,
      // Campos opcionales que el backend podría necesitar vacíos
      vin: undefined,
      seguro_vence: undefined,
      verificacion_vence: undefined,
      permiso_sct_vence: undefined,
    };

    let success = false;
    // Si tenemos un ID real (no temporal o undefined), es update
    if (unidadToEdit && unidadToEdit.id) {
      success = await updateUnit(unidadToEdit.id, payload);
    } else {
      success = await createUnit(payload);
    }

    setIsSaving(false);
    if (success) handleCloseModal(false);
  };

  const handleDelete = async () => {
    if (unidadToDelete) {
      await deleteUnit(unidadToDelete);
      setUnidadToDelete(null);
    }
  };

  const handleEdit = (unidad: Unidad) => {
    // CORRECCIÓN 3: Transformar Unidad (backend) a UnidadFormData (frontend)
    // Sin usar 'as any'
    const formattedForModal: UnidadFormData = {
      id: unidad.id,
      numero_economico: unidad.numero_economico,
      placas: unidad.placas,
      marca: unidad.marca,
      modelo: unidad.modelo,
      year: unidad.year || new Date().getFullYear(),
      tipo: unidad.tipo,
      status: unidad.status,
      documentosVencidos: unidad.documentos_vencidos,
      llantasCriticas: unidad.llantas_criticas,
    };

    setUnidadToEdit(formattedForModal);
    setIsModalOpen(true);
  };

  const handleOpenNewModal = () => {
    setUnidadToEdit(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = (open: boolean) => {
    setIsModalOpen(open);
    if (!open) setUnidadToEdit(null);
  };

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
        render: (value) => <span className="font-mono text-sm">{value}</span>,
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
            <Badge className="bg-red-500 text-white">{value}</Badge>
          ) : (
            <Badge className="bg-green-500 text-white">0</Badge>
          ),
      },
      {
        key: "llantas_criticas",
        header: "Llantas Críticas",
        render: (value) =>
          value > 0 ? (
            <Badge className="bg-red-500 text-white">{value}</Badge>
          ) : (
            <Badge className="bg-green-500 text-white">0</Badge>
          ),
      },
      {
        key: "status",
        header: "Estatus",
        render: (value) => getStatusBadge(value),
      },
      {
        key: "id",
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
    <div className="space-y-6">
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
              className="gap-2 bg-primary text-white"
              onClick={handleOpenNewModal}
            >
              <Plus className="h-4 w-4" /> Nueva Unidad
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <Card className="border-l-4 border-l-green-500">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Disponibles</p>
                <p className="text-3xl font-bold text-green-600">
                  {disponibles}
                </p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-blue-600">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">En Ruta</p>
                <p className="text-3xl font-bold text-blue-600">{enRuta}</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-yellow-500">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Mantenimiento</p>
                <p className="text-3xl font-bold text-yellow-600">
                  {mantenimiento}
                </p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-red-600">
              <CardContent className="pt-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-muted-foreground">Bloqueadas</p>
                    <p className="text-3xl font-bold text-red-600">
                      {bloqueadas}
                    </p>
                  </div>
                  {bloqueadas > 0 && (
                    <AlertTriangle className="h-6 w-6 text-red-500" />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
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

      {/* Aquí el componente AddUnidadModal recibirá props con tipos correctos, 
          pero como es un componente externo, debemos asegurarnos de que acepte 'any' o 'UnidadFormData' 
          Si AddUnidadModal espera 'Unidad', puede que tengas que castear o actualizar AddUnidadModal 
          Para este caso, TypeScript debería inferir el tipo correcto en handleSave
      */}
      <AddUnidadModal
        open={isModalOpen}
        onOpenChange={handleCloseModal}
        unidadToEdit={unidadToEdit as any} // Cast seguro si AddUnidadModal no ha sido actualizado a UnidadFormData
        onSave={handleSave}
        isSaving={isSaving}
      />

      <AlertDialog
        open={!!unidadToDelete}
        onOpenChange={() => setUnidadToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-destructive" />
              Confirmar Eliminación de Unidad
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Está seguro que desea eliminar la unidad{" "}
              <span className="font-semibold">
                {
                  unidades.find((u) => u.id === unidadToDelete)
                    ?.numero_economico
                }
              </span>
              ? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
