import { useState } from "react";
import { Download, FileText, Search, Eye, MoreHorizontal, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ActionButton } from "@/components/ui/action-button";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge, StatusType } from "@/components/ui/status-badge";
import { mockInvoices, dashboardKPIs } from "@/data/mockData";
import { toast } from "@/hooks/use-toast";

export default function CuentasPorCobrar() {
  const [filterStatus, setFilterStatus] = useState<string>("all");
  
  const vencidas = mockInvoices.filter((i) => i.estatus === "vencida");
  const porVencer = mockInvoices.filter((i) => i.estatus === "por_vencer");
  const pagadas = mockInvoices.filter((i) => i.estatus === "pagada");

  const filteredInvoices = filterStatus === "all" 
    ? mockInvoices 
    : mockInvoices.filter(i => i.estatus === filterStatus);

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

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar por folio, cliente..." className="pl-10" />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por estatus" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="vencida">Vencidas</SelectItem>
                <SelectItem value="por_vencer">Por Vencer</SelectItem>
                <SelectItem value="pagada">Pagadas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-700">
            <FileText className="h-5 w-5" /> Listado de Facturas
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b text-left">
                  <th className="py-2 px-3 text-xs font-semibold uppercase text-slate-600 tracking-wider">Folio</th>
                  <th className="py-2 px-3 text-xs font-semibold uppercase text-slate-600 tracking-wider">Cliente</th>
                  <th className="py-2 px-3 text-xs font-semibold uppercase text-slate-600 tracking-wider text-right">Monto</th>
                  <th className="py-2 px-3 text-xs font-semibold uppercase text-slate-600 tracking-wider">Emisión</th>
                  <th className="py-2 px-3 text-xs font-semibold uppercase text-slate-600 tracking-wider">Vencimiento</th>
                  <th className="py-2 px-3 text-xs font-semibold uppercase text-slate-600 tracking-wider text-center">Antigüedad</th>
                  <th className="py-2 px-3 text-xs font-semibold uppercase text-slate-600 tracking-wider">Estatus</th>
                  <th className="py-2 px-3 text-xs font-semibold uppercase text-slate-600 tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((inv) => (
                  <tr 
                    key={inv.id} 
                    className={`border-b transition-colors ${
                      inv.estatus === 'vencida' 
                        ? 'bg-red-50' 
                        : 'hover:bg-muted/50'
                    }`}
                  >
                    <td className={`py-2 px-3 font-mono text-sm font-medium ${inv.estatus === 'vencida' ? 'text-red-700' : 'text-slate-700'}`}>
                      {inv.folio}
                    </td>
                    <td className={`py-2 px-3 text-sm ${inv.estatus === 'vencida' ? 'text-red-700' : 'text-slate-700'}`}>
                      {inv.cliente}
                    </td>
                    <td className={`py-2 px-3 text-right text-sm font-bold ${inv.estatus === 'vencida' ? 'text-red-700' : 'text-slate-700'}`}>
                      ${inv.monto.toLocaleString()}
                    </td>
                    <td className="py-2 px-3 text-sm text-muted-foreground">
                      {new Date(inv.fechaEmision).toLocaleDateString('es-MX')}
                    </td>
                    <td className="py-2 px-3 text-sm text-slate-700">
                      {new Date(inv.fechaVencimiento).toLocaleDateString('es-MX')}
                    </td>
                    <td className="py-2 px-3 text-center text-sm">
                      {calculateAntiguedad(inv.fechaVencimiento, inv.diasVencida)}
                    </td>
                    <td className="py-2 px-3">
                      {getStatusBadge(inv.estatus)}
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
