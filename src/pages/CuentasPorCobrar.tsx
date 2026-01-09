import { DollarSign, Download, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { mockInvoices, dashboardKPIs } from "@/data/mockData";

export default function CuentasPorCobrar() {
  const vencidas = mockInvoices.filter((i) => i.estatus === "vencida");
  const porVencer = mockInvoices.filter((i) => i.estatus === "por_vencer");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><DollarSign className="h-6 w-6" /> Cuentas por Cobrar</h1>
          <p className="text-muted-foreground">Gestión de cartera y estado de cuenta</p>
        </div>
        <Button><Download className="h-4 w-4 mr-2" /> Descargar Estado de Cuenta (PDF)</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-l-4 border-l-status-danger">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Vencido</p>
            <p className="text-4xl font-bold text-status-danger">${dashboardKPIs.totalVencido.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground mt-2">{vencidas.length} facturas vencidas</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-status-warning">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Por Vencer (próximos 30 días)</p>
            <p className="text-4xl font-bold text-status-warning">${dashboardKPIs.totalPorVencer.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground mt-2">{porVencer.length} facturas por vencer</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Listado de Facturas</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full table-dense">
            <thead>
              <tr className="border-b text-left text-sm font-medium text-muted-foreground">
                <th className="py-3 px-3">Folio</th>
                <th className="py-3 px-3">Cliente</th>
                <th className="py-3 px-3 text-right">Monto</th>
                <th className="py-3 px-3">Emisión</th>
                <th className="py-3 px-3">Vencimiento</th>
                <th className="py-3 px-3">Estatus</th>
                <th className="py-3 px-3">Días</th>
              </tr>
            </thead>
            <tbody>
              {mockInvoices.map((inv) => (
                <tr key={inv.id} className="border-b hover:bg-muted/50">
                  <td className="py-3 px-3 font-mono">{inv.folio}</td>
                  <td className="py-3 px-3">{inv.cliente}</td>
                  <td className="py-3 px-3 text-right font-medium">${inv.monto.toLocaleString()}</td>
                  <td className="py-3 px-3">{inv.fechaEmision}</td>
                  <td className="py-3 px-3">{inv.fechaVencimiento}</td>
                  <td className="py-3 px-3">
                    <Badge className={inv.estatus === "vencida" ? "bg-status-danger-bg text-status-danger" : inv.estatus === "por_vencer" ? "bg-status-warning-bg text-status-warning" : "bg-status-success-bg text-status-success"}>
                      {inv.estatus === "vencida" ? "Vencida" : inv.estatus === "por_vencer" ? "Por Vencer" : "Pagada"}
                    </Badge>
                  </td>
                  <td className="py-3 px-3 text-status-danger font-bold">{inv.diasVencida ? `+${inv.diasVencida}` : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
