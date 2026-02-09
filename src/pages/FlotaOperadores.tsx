import { useState } from "react";
import {
  Users,
  Plus,
  AlertTriangle,
  CheckCircle,
  Clock,
  UserX,
  Loader2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { OperadoresTable } from "@/features/flota/OperadoresTable";
import { AddOperadorModal } from "@/features/flota/AddOperadorModal";
import { useToast } from "@/hooks/use-toast";
import { useOperators } from "@/hooks/useOperators"; // <--- Hook Real
import { Operador } from "@/services/operatorService"; // <--- Tipo Real

// Helper de fechas (puedes moverlo a utils si prefieres)
const getExpiryStatus = (dateString: string) => {
  if (!dateString) return "danger";
  const today = new Date();
  const expiry = new Date(dateString);
  const diffTime = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "danger";
  if (diffDays <= 30) return "warning";
  return "success";
};

export default function FlotaOperadores() {
  const { toast } = useToast();

  const {
    operadores,
    isLoading,
    createOperator,
    updateOperator,
    deleteOperator,
  } = useOperators();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [operadorToEdit, setOperadorToEdit] = useState<Operador | null>(null);
  const [operadorToDelete, setOperadorToDelete] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Estadísticas (Calculadas con datos reales)
  const activos = operadores.filter((op) => op.status === "activo").length;
  const inactivos = operadores.filter((op) => op.status === "inactivo").length;

  const licenciasVencidas = operadores.filter(
    (op) => getExpiryStatus(op.license_expiry) === "danger",
  ).length;

  const licenciasPorVencer = operadores.filter(
    (op) => getExpiryStatus(op.license_expiry) === "warning",
  ).length;

  const examenesVencidos = operadores.filter(
    (op) => getExpiryStatus(op.medical_check_expiry) === "danger",
  ).length;

  const examenesPorVencer = operadores.filter(
    (op) => getExpiryStatus(op.medical_check_expiry) === "warning",
  ).length;

  const alertasTotal =
    licenciasVencidas +
    licenciasPorVencer +
    examenesVencidos +
    examenesPorVencer;

  // CRUD Handlers
  const handleSave = async (operadorData: Operador) => {
    setIsSaving(true);
    let success = false;

    // Si tiene ID real (no temporal), es update
    if (operadorToEdit?.id) {
      success = await updateOperator(operadorToEdit.id, operadorData);
    } else {
      // Generar ID temporal si el backend lo requiere o dejar que backend genere
      success = await createOperator(operadorData);
    }

    setIsSaving(false);
    if (success) {
      setIsModalOpen(false);
      setOperadorToEdit(null);
    }
  };

  const handleDelete = async () => {
    if (!operadorToDelete) return;
    await deleteOperator(operadorToDelete);
    setOperadorToDelete(null);
  };

  const handleEdit = (operador: Operador) => {
    setOperadorToEdit(operador);
    setIsModalOpen(true);
  };

  const handleOpenNewModal = () => {
    setOperadorToEdit(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = (open: boolean) => {
    setIsModalOpen(open);
    if (!open) setOperadorToEdit(null);
  };

  if (isLoading)
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin h-8 w-8 text-primary" />
          <p className="text-muted-foreground">Cargando operadores...</p>
        </div>
      </div>
    );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" /> Gestión de Operadores
          </h1>
          <p className="text-muted-foreground">
            Administración de conductores, licencias y exámenes médicos
          </p>
        </div>
        <Button
          className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={handleOpenNewModal}
        >
          <Plus className="h-4 w-4" /> Nuevo Operador
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Operadores Activos
                </p>
                <p className="text-3xl font-bold text-green-600">{activos}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Documentos Vencidos
                </p>
                <p className="text-3xl font-bold text-red-600">
                  {licenciasVencidas + examenesVencidos}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500 opacity-50" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {licenciasVencidas} licencias • {examenesVencidos} exámenes
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Por Vencer (30 días)
                </p>
                <p className="text-3xl font-bold text-yellow-600">
                  {licenciasPorVencer + examenesPorVencer}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500 opacity-50" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {licenciasPorVencer} licencias • {examenesPorVencer} exámenes
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-gray-400">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Inactivos</p>
                <p className="text-3xl font-bold text-gray-500">{inactivos}</p>
              </div>
              <UserX className="h-8 w-8 text-gray-400 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alert Banner */}
      {alertasTotal > 0 && (
        <Card className="bg-yellow-50/50 border-yellow-200">
          <CardContent className="py-3 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
            <p className="text-sm text-yellow-700 font-medium">
              <span className="font-bold">
                {alertasTotal} alertas de documentación:
              </span>{" "}
              {licenciasVencidas > 0 &&
                `${licenciasVencidas} licencia(s) vencida(s)`}
              {licenciasVencidas > 0 &&
                (licenciasPorVencer > 0 ||
                  examenesVencidos > 0 ||
                  examenesPorVencer > 0) &&
                ", "}
              {licenciasPorVencer > 0 &&
                `${licenciasPorVencer} licencia(s) por vencer`}
              {licenciasPorVencer > 0 &&
                (examenesVencidos > 0 || examenesPorVencer > 0) &&
                ", "}
              {examenesVencidos > 0 &&
                `${examenesVencidos} examen(es) vencido(s)`}
              {examenesVencidos > 0 && examenesPorVencer > 0 && ", "}
              {examenesPorVencer > 0 &&
                `${examenesPorVencer} examen(es) por vencer`}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Operators Table */}
      <OperadoresTable
        operadores={operadores}
        onEdit={handleEdit}
        onDelete={(id) => setOperadorToDelete(id)}
      />

      {/* Add/Edit Operator Modal */}
      <AddOperadorModal
        open={isModalOpen}
        onOpenChange={handleCloseModal}
        operatorToEdit={operadorToEdit}
        onSave={handleSave}
        isSaving={isSaving}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!operadorToDelete}
        onOpenChange={() => setOperadorToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <UserX className="h-5 w-5 text-destructive" />
              Confirmar Baja de Operador
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Está seguro que desea dar de baja a{" "}
              <span className="font-semibold">
                {operadores.find((op) => op.id === operadorToDelete)?.name}
              </span>
              ? Esta acción eliminará al operador del sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Dar de Baja
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
