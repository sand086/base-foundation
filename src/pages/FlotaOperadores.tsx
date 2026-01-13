import { useState } from 'react';
import { Users, Plus, AlertTriangle, CheckCircle, Clock, UserX } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { OperadoresTable } from '@/features/flota/OperadoresTable';
import { AddOperadorModal } from '@/features/flota/AddOperadorModal';
import { mockOperadores, getExpiryStatus, Operador } from '@/data/flotaData';
import { useToast } from '@/hooks/use-toast';

export default function FlotaOperadores() {
  const { toast } = useToast();
  
  // State management for CRUD
  const [operadores, setOperadores] = useState<Operador[]>(mockOperadores);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [operadorToEdit, setOperadorToEdit] = useState<Operador | null>(null);
  const [operadorToDelete, setOperadorToDelete] = useState<string | null>(null);

  // Calculate summary stats dynamically
  const activos = operadores.filter((op) => op.status === 'activo').length;
  const inactivos = operadores.filter((op) => op.status === 'inactivo').length;

  const licenciasVencidas = operadores.filter(
    (op) => getExpiryStatus(op.license_expiry) === 'danger'
  ).length;

  const licenciasPorVencer = operadores.filter(
    (op) => getExpiryStatus(op.license_expiry) === 'warning'
  ).length;

  const examenesVencidos = operadores.filter(
    (op) => getExpiryStatus(op.medical_check_expiry) === 'danger'
  ).length;

  const examenesPorVencer = operadores.filter(
    (op) => getExpiryStatus(op.medical_check_expiry) === 'warning'
  ).length;

  const alertasTotal = licenciasVencidas + licenciasPorVencer + examenesVencidos + examenesPorVencer;

  // CRUD Handlers
  const handleCreate = (operadorData: Omit<Operador, 'id'> & { id?: string }) => {
    const newOperador: Operador = {
      ...operadorData,
      id: `OP-${String(operadores.length + 1).padStart(3, '0')}`,
      status: 'activo',
    } as Operador;
    
    setOperadores((prev) => [...prev, newOperador]);
  };

  const handleUpdate = (operadorData: Omit<Operador, 'id'> & { id?: string }) => {
    if (!operadorData.id) return;
    
    setOperadores((prev) =>
      prev.map((op) =>
        op.id === operadorData.id ? { ...op, ...operadorData } as Operador : op
      )
    );
  };

  const handleSave = (operadorData: Omit<Operador, 'id'> & { id?: string }) => {
    if (operadorToEdit) {
      handleUpdate({ ...operadorData, id: operadorToEdit.id });
    } else {
      handleCreate(operadorData);
    }
    setOperadorToEdit(null);
  };

  const handleDelete = () => {
    if (!operadorToDelete) return;

    const operador = operadores.find((op) => op.id === operadorToDelete);
    
    setOperadores((prev) => prev.filter((op) => op.id !== operadorToDelete));
    
    toast({
      title: 'Operador dado de baja',
      description: `${operador?.name} ha sido eliminado del sistema.`,
    });
    
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
    if (!open) {
      setOperadorToEdit(null);
    }
  };

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
          className="gap-2 bg-action hover:bg-action-hover text-action-foreground"
          onClick={handleOpenNewModal}
        >
          <Plus className="h-4 w-4" /> Nuevo Operador
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-l-4 border-l-status-success">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Operadores Activos</p>
                <p className="text-3xl font-bold text-status-success">{activos}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-status-success opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-status-danger">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Documentos Vencidos</p>
                <p className="text-3xl font-bold text-status-danger">
                  {licenciasVencidas + examenesVencidos}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-status-danger opacity-50" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {licenciasVencidas} licencias • {examenesVencidos} exámenes
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-status-warning">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Por Vencer (30 días)</p>
                <p className="text-3xl font-bold text-status-warning">
                  {licenciasPorVencer + examenesPorVencer}
                </p>
              </div>
              <Clock className="h-8 w-8 text-status-warning opacity-50" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {licenciasPorVencer} licencias • {examenesPorVencer} exámenes
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-muted">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Inactivos</p>
                <p className="text-3xl font-bold text-muted-foreground">{inactivos}</p>
              </div>
              <UserX className="h-8 w-8 text-muted-foreground opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alert Banner */}
      {alertasTotal > 0 && (
        <Card className="bg-status-warning-bg border-status-warning-border">
          <CardContent className="py-3 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-status-warning flex-shrink-0" />
            <p className="text-sm text-status-warning font-medium">
              <span className="font-bold">{alertasTotal} alertas de documentación:</span>{' '}
              {licenciasVencidas > 0 && `${licenciasVencidas} licencia(s) vencida(s)`}
              {licenciasVencidas > 0 && (licenciasPorVencer > 0 || examenesVencidos > 0 || examenesPorVencer > 0) && ', '}
              {licenciasPorVencer > 0 && `${licenciasPorVencer} licencia(s) por vencer`}
              {licenciasPorVencer > 0 && (examenesVencidos > 0 || examenesPorVencer > 0) && ', '}
              {examenesVencidos > 0 && `${examenesVencidos} examen(es) vencido(s)`}
              {examenesVencidos > 0 && examenesPorVencer > 0 && ', '}
              {examenesPorVencer > 0 && `${examenesPorVencer} examen(es) por vencer`}
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
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!operadorToDelete} onOpenChange={() => setOperadorToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <UserX className="h-5 w-5 text-destructive" />
              Confirmar Baja de Operador
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Está seguro que desea dar de baja a{' '}
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
