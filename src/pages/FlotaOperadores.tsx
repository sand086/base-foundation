import { useState } from "react";
import {
  Users,
  Plus,
  AlertTriangle,
  CheckCircle,
  Clock,
  Trash2,
  UserX,
  Loader2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
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
import { OperadoresTable } from "@/features/operators/components/OperatorsTable";
import { AddOperatorModal } from "@/features/operators/components/AddOperatorModal";
import { useToast } from "@/hooks/use-toast";
import { useOperators } from "@/features/operators/hooks/useOperators";
import { Operator } from "@/features/operators/types";

// Helper de fechas
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
  const [operadorToEdit, setOperadorToEdit] = useState<Operator | null>(null);
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
  const handleSave = async (operadorData: Operator) => {
    setIsSaving(true);
    let success = false;

    if (operadorToEdit?.id) {
      success = await updateOperator(operadorToEdit.id, operadorData);
    } else {
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
    await deleteOperator(Number(operadorToDelete));
    setOperadorToDelete(null);
  };

  const handleEdit = (operador: Operator) => {
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
          <Loader2 className="animate-spin h-10 w-10 text-brand-red" />
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 animate-pulse">
            Cargando operadores...
          </p>
        </div>
      </div>
    );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      {/*  HEADER TAHOE */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between bg-white/40 dark:bg-slate-900/40 p-4 rounded-2xl shadow-sm border border-white/20 dark:border-white/10 backdrop-blur-md gap-4">
        <div>
          <h1 className="text-2xl font-black text-brand-navy dark:text-white flex items-center gap-2 uppercase tracking-tighter heading-crisp">
            <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/20 shadow-inner">
              <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            Gestión de Operadores
          </h1>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 mt-2">
            Administración de conductores, licencias y exámenes médicos.
          </p>
        </div>
        <Button
          variant="default"
          size="lg"
          className="w-full md:w-auto haptic-press shadow-lg shadow-brand-red/20"
          onClick={handleOpenNewModal}
        >
          <Plus className="h-4 w-4 mr-2" /> Nuevo Operador
        </Button>
      </div>

      {/*  KPI CARDS (Tahoe UI) */}
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card
          variant="default"
          className="p-6 flex items-center gap-5 group hover:border-emerald-300 dark:hover:border-emerald-500/50 transition-all cursor-default"
        >
          <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-100 dark:border-emerald-900/50 shadow-inner group-hover:scale-110 transition-transform duration-500 ease-out">
            <CheckCircle className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex flex-col justify-center">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-1">
              Operadores Activos
            </p>
            <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400 leading-none tracking-tighter">
              {activos}
            </p>
          </div>
        </Card>

        <Card
          variant="default"
          className="p-6 flex items-center gap-5 group hover:border-rose-300 dark:hover:border-rose-500/50 transition-all cursor-default"
        >
          <div className="p-3.5 bg-rose-50 dark:bg-rose-950/30 rounded-2xl border border-rose-100 dark:border-rose-900/50 shadow-inner group-hover:scale-110 transition-transform duration-500 ease-out">
            <AlertTriangle className="h-6 w-6 text-rose-600 dark:text-rose-400" />
          </div>
          <div className="flex flex-col justify-center">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-1">
              Docs. Vencidos
            </p>
            <p className="text-3xl font-black text-rose-600 dark:text-rose-400 leading-none tracking-tighter">
              {licenciasVencidas + examenesVencidos}
            </p>
          </div>
        </Card>

        <Card
          variant="default"
          className="p-6 flex items-center gap-5 group hover:border-amber-300 dark:hover:border-amber-500/50 transition-all cursor-default"
        >
          <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 rounded-2xl border border-amber-100 dark:border-amber-900/50 shadow-inner group-hover:scale-110 transition-transform duration-500 ease-out">
            <Clock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex flex-col justify-center">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-1">
              Por Vencer (30D)
            </p>
            <p className="text-3xl font-black text-amber-600 dark:text-amber-400 leading-none tracking-tighter">
              {licenciasPorVencer + examenesPorVencer}
            </p>
          </div>
        </Card>

        <Card
          variant="default"
          className="p-6 flex items-center gap-5 group hover:border-slate-300 dark:hover:border-white/20 transition-all cursor-default"
        >
          <div className="p-3.5 bg-slate-100 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-white/10 shadow-inner group-hover:scale-110 transition-transform duration-500 ease-out">
            <UserX className="h-6 w-6 text-slate-500 dark:text-slate-400" />
          </div>
          <div className="flex flex-col justify-center">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-1">
              Inactivos
            </p>
            <p className="text-3xl font-black text-slate-700 dark:text-slate-300 leading-none tracking-tighter">
              {inactivos}
            </p>
          </div>
        </Card>
      </div>

      {/*  ALERT BANNER TAHOE */}
      {alertasTotal > 0 && (
        <div className="p-5 bg-amber-50 dark:bg-amber-950/20 border-l-4 border-amber-500 rounded-r-2xl shadow-sm flex items-start gap-4 animate-in fade-in slide-in-from-top-4">
          <div className="bg-amber-500 rounded-full p-1.5 mt-0.5 shadow-lg shadow-amber-500/20 shrink-0">
            <AlertTriangle className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-[10px] sm:text-[11px] font-black text-amber-800 dark:text-amber-400 uppercase tracking-widest mb-1">
              {alertasTotal} Alertas de Documentación Operativa
            </p>
            <p className="text-xs sm:text-sm font-medium text-amber-900/80 dark:text-amber-200/80 leading-snug">
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
          </div>
        </div>
      )}

      {/* Operators Table */}
      <OperadoresTable
        operadores={operadores}
        onEdit={handleEdit}
        onDelete={(id) => setOperadorToDelete(String(id))}
      />

      {/* Add/Edit Operator Modal */}
      <AddOperatorModal
        open={isModalOpen}
        onOpenChange={handleCloseModal}
        operatorToEdit={operadorToEdit}
        onSave={handleSave}
        isSaving={isSaving}
      />

      {/*  DIÁLOGO DE CONFIRMACIÓN DE ELIMINACIÓN (ESTRUCTURA TRIPLE TAHOE) */}
      <AlertDialog
        open={!!operadorToDelete}
        onOpenChange={(open) => !open && setOperadorToDelete(null)}
      >
        {/* CAPA 1: CASCARÓN */}
        <AlertDialogContent className="w-[95vw] sm:max-w-2xl flex-col max-h-[90vh] overflow-hidden p-0 border-none shadow-2xl animate-modal-show bg-white/90 dark:bg-brand-navy/95 backdrop-blur-xl rounded-2xl">
          {/* CAPA 2: HEADER TAHOE (Contraste Blanco/Navy puro) */}
          <AlertDialogHeader className="p-6 sm:p-8 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-white/10 shrink-0 relative overflow-hidden z-10">
            <div className="absolute inset-0 bg-gradient-to-br from-black/5 dark:from-white/5 to-transparent pointer-events-none" />
            <div className="relative z-10 flex items-center gap-4 sm:gap-5">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center shadow-inner shrink-0 icon-plate border border-rose-200 dark:border-rose-500/20">
                <UserX className="h-7 w-7 sm:h-8 sm:w-8 text-rose-600 dark:text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.4)]" />
              </div>
              <div className="flex flex-col gap-1 text-left">
                <AlertDialogTitle className="text-rose-600 dark:text-rose-500 text-2xl font-black uppercase tracking-tighter heading-crisp leading-none">
                  Confirmar Baja de Operador
                </AlertDialogTitle>
                <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 mt-1">
                  Acción Irreversible • Catálogo Operadores
                </p>
              </div>
            </div>
          </AlertDialogHeader>

          {/* CAPA 3: BODY */}
          <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar bg-slate-50/50 dark:bg-transparent">
            <AlertDialogDescription className="text-slate-600 dark:text-slate-300 block space-y-6">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                ¿Está seguro que desea dar de baja permanentemente a{" "}
                <b className="text-slate-900 dark:text-white text-lg font-black tracking-tight uppercase">
                  {
                    operadores.find((op) => op.id === Number(operadorToDelete))
                      ?.name
                  }
                </b>
                ?
              </p>

              <div className="p-5 sm:p-6 bg-rose-50 dark:bg-rose-950/20 border-l-4 border-rose-500 rounded-r-2xl shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                  <h4 className="text-[10px] sm:text-[11px] font-black text-rose-800 dark:text-rose-400 uppercase tracking-widest">
                    Pérdida de Asignaciones
                  </h4>
                </div>
                <p className="text-xs sm:text-sm leading-relaxed text-rose-900 dark:text-rose-200/80">
                  Esta acción eliminará al operador del sistema activo y
                  desvinculará sus registros de unidades y viajes actuales.{" "}
                  <b className="font-black underline">
                    Esta acción no se puede deshacer
                  </b>
                  .
                </p>
              </div>
            </AlertDialogDescription>
          </div>

          {/* CAPA 4: FOOTER */}
          <AlertDialogFooter className="p-6 sm:p-8 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-t border-slate-200 dark:border-white/10 shrink-0 z-10">
            <div className="flex flex-col-reverse sm:flex-row sm:flex-wrap justify-end items-stretch sm:items-center gap-3 w-full">
              <AlertDialogCancel
                variant="outline"
                size="lg"
                className="w-full sm:w-auto haptic-press flex-shrink-0 font-black uppercase tracking-widest text-[10px]"
              >
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                size="lg"
                onClick={handleDelete}
                className="w-full sm:w-auto haptic-press shadow-rose-600/10 flex-shrink-0 border-none bg-rose-600 hover:bg-rose-700 text-white font-black uppercase tracking-widest text-[10px]"
              >
                <Trash2 className="h-4 w-4 mr-2" /> Dar de Baja
              </AlertDialogAction>
            </div>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
