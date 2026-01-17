import { useState, useMemo } from "react";
import { Download, AlertCircle, Eye, MoreHorizontal } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ActionButton } from "@/components/ui/action-button";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge, StatusType } from "@/components/ui/status-badge";
import { mockInvoices, dashboardKPIs, Invoice } from "@/data/mockData";
import { EnhancedDataTable, ColumnDef } from "@/components/ui/enhanced-data-table";
import { toast } from "@/hooks/use-toast";

export default function CuentasPorCobrar() {
  const vencidas = mockInvoices.filter((i) => i.estatus === "vencida");
  const porVencer = mockInvoices.filter((i) => i.estatus === "por_vencer");
  const pagadas = mockInvoices.filter((i) => i.estatus === "pagada");

  const handleDownloadPDF = () => {
    toast({
      title: "Generando PDF",
      description: "El estado de cuenta se descargará en unos segundos...",
    });
  };

  const getStatusBadge = (estatus: string) => {
    const statusMap: Record<string, { type: StatusType; label: string }> = {
      vencida: { type: "danger", label: "Vencida" },
      por_vencer: { type: "warning", label: "Por Vencer" },
      pagada: { type: "success", label: "Pagada" },
    };
    const config = statusMap[estatus] || { type: "info" as StatusType, label: estatus };
    return <StatusBadge status={config.type}>{config.label}</StatusBadge>;
  };

  const calculateAntiguedad = (fechaVencimiento: string, diasVencida?: number) => {
    if (diasVencida && diasVencida > 0) {
      return <span className="text-red-700 font-bold">+{diasVencida} días</span>;
    }
    const today = new Date();
    const venc = new Date(fechaVencimiento);
    const diff = Math.ceil((venc.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) {
      return <span className="text-red-700 font-bold">+{Math.abs(diff)} días</span>;
    }
    if (diff <= 7) {
      return <span className="text-amber-700 font-medium">{diff} días</span>;
    }
    return <span className="text-muted-foreground">{diff} días</span>;
  };

  // Define columns for EnhancedDataTable
  const columns: ColumnDef<Invoice>[] = useMemo(() => [
    {
      key: 'folio',
      header: 'Folio',
      render: (value, row) => (
        <span className={`font-mono text-sm font-medium ${row.estatus === 'vencida' ? 'text-red-700' : 'text-slate-700'}`}>
          {value}
        </span>
      ),
    },
    {
      key: 'cliente',
      header: 'Cliente',
      render: (value, row) => (
        <span className={`text-sm ${row.estatus === 'vencida' ? 'text-red-700' : 'text-slate-700'}`}>
          {value}
        </span>
      ),
    },
    {
      key: 'monto',
      header: 'Monto',
      type: 'number',
      render: (value, row) => (
        <span className={`text-right text-sm font-bold ${row.estatus === 'vencida' ? 'text-red-700' : 'text-slate-700'}`}>
          ${value.toLocaleString()}
        </span>
      ),
    },
    {
      key: 'fechaEmision',
      header: 'Emisión',
      type: 'date',
      render: (value) => (
        <span className="text-sm text-muted-foreground">
          {new Date(value).toLocaleDateString('es-MX')}
        </span>
      ),
    },
    {
      key: 'fechaVencimiento',
      header: 'Vencimiento',
      type: 'date',
      render: (value, row) => (
        <span className={`text-sm ${row.estatus === 'vencida' ? 'text-red-700 font-medium' : 'text-slate-700'}`}>
          {new Date(value).toLocaleDateString('es-MX')}
        </span>
      ),
    },
    {
      key: 'fechaVencimiento',
      header: 'Antigüedad',
      sortable: false,
      render: (value, row) => (
        <div className="text-center text-sm">
          {calculateAntiguedad(value, row.diasVencida)}
        </div>
      ),
    },
    {
      key: 'estatus',
      header: 'Estatus',
      type: 'status',
      statusOptions: ['vencida', 'por_vencer', 'pagada'],
      render: (value) => getStatusBadge(value),
    },
    {
      key: 'id',
      header: 'Acciones',
      sortable: false,
      render: () => (
        <div className="flex gap-1">
          <Button variant="ghost" size="sm">
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ], []);

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Cuentas por Cobrar" 
        description="Gestión de cartera y estado de cuenta"
      >
        <ActionButton size="lg" onClick={handleDownloadPDF}>
          <Download className="h-5 w-5" /> Descargar Estado de Cuenta (PDF)
        </ActionButton>
      </PageHeader>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-l-4 border-l-status-danger">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Vencido</p>
                <p className="text-3xl font-bold text-status-danger">
                  ${dashboardKPIs.totalVencido.toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  {vencidas.length} factura{vencidas.length !== 1 ? 's' : ''} vencida{vencidas.length !== 1 ? 's' : ''}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-status-danger" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-status-warning">
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-muted-foreground">Por Vencer (30 días)</p>
              <p className="text-3xl font-bold text-status-warning">
                ${dashboardKPIs.totalPorVencer.toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                {porVencer.length} factura{porVencer.length !== 1 ? 's' : ''} por vencer
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-status-success">
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-muted-foreground">Pagadas (este mes)</p>
              <p className="text-3xl font-bold text-status-success">
                ${pagadas.reduce((sum, i) => sum + i.monto, 0).toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                {pagadas.length} factura{pagadas.length !== 1 ? 's' : ''} cobrada{pagadas.length !== 1 ? 's' : ''}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Data Table */}
      <Card>
        <CardContent className="pt-6">
          <EnhancedDataTable
            data={mockInvoices}
            columns={columns}
            exportFileName="cuentas_por_cobrar"
          />
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardContent className="pt-6">
          <h4 className="font-semibold text-slate-700 mb-3">Leyenda de Estados</h4>
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-2">
              <StatusBadge status="danger">Vencida</StatusBadge>
              <span className="text-sm text-slate-600">Factura con fecha límite excedida</span>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status="warning">Por Vencer</StatusBadge>
              <span className="text-sm text-slate-600">Próxima a vencer en los siguientes 30 días</span>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status="success">Pagada</StatusBadge>
              <span className="text-sm text-slate-600">Factura cobrada exitosamente</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
