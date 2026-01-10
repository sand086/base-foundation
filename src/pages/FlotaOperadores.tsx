import { useState } from 'react';
import { Users, Plus, AlertTriangle, CheckCircle, Clock, UserX } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { OperadoresTable } from '@/features/flota/OperadoresTable';
import { AddOperadorModal } from '@/features/flota/AddOperadorModal';
import { mockOperadores, getExpiryStatus } from '@/data/flotaData';

export default function FlotaOperadores() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Calculate summary stats
  const activos = mockOperadores.filter((op) => op.status === 'activo').length;
  const inactivos = mockOperadores.filter((op) => op.status === 'inactivo').length;

  const licenciasVencidas = mockOperadores.filter(
    (op) => getExpiryStatus(op.license_expiry) === 'danger'
  ).length;

  const licenciasPorVencer = mockOperadores.filter(
    (op) => getExpiryStatus(op.license_expiry) === 'warning'
  ).length;

  const examenesVencidos = mockOperadores.filter(
    (op) => getExpiryStatus(op.medical_check_expiry) === 'danger'
  ).length;

  const examenesPorVencer = mockOperadores.filter(
    (op) => getExpiryStatus(op.medical_check_expiry) === 'warning'
  ).length;

  const alertasTotal = licenciasVencidas + licenciasPorVencer + examenesVencidos + examenesPorVencer;

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
          onClick={() => setIsModalOpen(true)}
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
      <OperadoresTable />

      {/* Add Operator Modal */}
      <AddOperadorModal open={isModalOpen} onOpenChange={setIsModalOpen} />
    </div>
  );
}
