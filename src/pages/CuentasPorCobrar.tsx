import { useState } from "react";
import { DollarSign, Download, FileText, Search, Filter, Eye, MoreHorizontal, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
    switch (estatus) {
      case 'vencida':
        return <Badge className="bg-status-danger text-white">Vencida</Badge>;
      case 'por_vencer':
        return <Badge className="bg-status-warning text-black">Por Vencer</Badge>;
      case 'pagada':
        return <Badge className="bg-status-success text-white">Pagada</Badge>;
      default:
        return <Badge variant="secondary">{estatus}</Badge>;
    }
  };

  const calculateAntiguedad = (fechaVencimiento: string, diasVencida?: number) => {
    if (diasVencida && diasVencida > 0) {
      return <span className="text-status-danger font-bold">+{diasVencida} días</span>;
    }
    const today = new Date();
    const venc = new Date(fechaVencimiento);
    const diff = Math.ceil((venc.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) {
      return <span className="text-status-danger font-bold">+{Math.abs(diff)} días</span>;
    }
    if (diff <= 7) {
      return <span className="text-status-warning font-medium">{diff} días</span>;
    }
    return <span className="text-muted-foreground">{diff} días</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <DollarSign className="h-6 w-6" /> Cuentas por Cobrar
          </h1>
          <p className="text-muted-foreground">Gestión de cartera y estado de cuenta</p>
        </div>
        <Button size="lg" className="gap-2" onClick={handleDownloadPDF}>
          <Download className="h-5 w-5" /> Descargar Estado de Cuenta (PDF)
        </Button>
      </div>

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
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" /> Listado de Facturas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full table-dense">
              <thead>
                <tr className="border-b text-left text-sm font-medium text-muted-foreground">
                  <th className="py-3 px-3">Folio</th>
                  <th className="py-3 px-3">Cliente</th>
                  <th className="py-3 px-3 text-right">Monto</th>
                  <th className="py-3 px-3">Emisión</th>
                  <th className="py-3 px-3">Vencimiento</th>
                  <th className="py-3 px-3 text-center">Antigüedad</th>
                  <th className="py-3 px-3">Estatus</th>
                  <th className="py-3 px-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((inv) => (
                  <tr 
                    key={inv.id} 
                    className={`border-b transition-colors ${
                      inv.estatus === 'vencida' 
                        ? 'bg-red-50 dark:bg-red-950/20' 
                        : 'hover:bg-muted/50'
                    }`}
                  >
                    <td className={`py-3 px-3 font-mono font-medium ${inv.estatus === 'vencida' ? 'text-status-danger' : ''}`}>
                      {inv.folio}
                    </td>
                    <td className={`py-3 px-3 ${inv.estatus === 'vencida' ? 'text-status-danger' : ''}`}>
                      {inv.cliente}
                    </td>
                    <td className={`py-3 px-3 text-right font-bold ${inv.estatus === 'vencida' ? 'text-status-danger' : ''}`}>
                      ${inv.monto.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-muted-foreground">
                      {new Date(inv.fechaEmision).toLocaleDateString('es-MX')}
                    </td>
                    <td className="py-3 px-3">
                      {new Date(inv.fechaVencimiento).toLocaleDateString('es-MX')}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {calculateAntiguedad(inv.fechaVencimiento, inv.diasVencida)}
                    </td>
                    <td className="py-3 px-3">
                      {getStatusBadge(inv.estatus)}
                    </td>
                    <td className="py-3 px-3">
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
          <h4 className="font-medium mb-3">Leyenda de Estados</h4>
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-2">
              <Badge className="bg-status-danger text-white">Vencida</Badge>
              <span className="text-sm">Factura con fecha límite excedida</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-status-warning text-black">Por Vencer</Badge>
              <span className="text-sm">Próxima a vencer en los siguientes 30 días</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-status-success text-white">Pagada</Badge>
              <span className="text-sm">Factura cobrada exitosamente</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
