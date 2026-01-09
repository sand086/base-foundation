import { Fuel, AlertTriangle, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { mockFuelRecords } from "@/data/mockData";

export default function CombustibleConciliacion() {
  const totalVales = mockFuelRecords.filter((r) => r.estatus === "vale_cobro").length;
  const conciliados = mockFuelRecords.filter((r) => r.estatus === "conciliado").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Fuel className="h-6 w-6" /> Conciliación de Combustible</h1>
        <p className="text-muted-foreground">Comparación ECM vs Ticket Real (Tolerancia: 5%)</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Registros Conciliados</p>
                <p className="text-3xl font-bold text-status-success">{conciliados}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-status-success" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-status-danger">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Vales de Cobro Pendientes</p>
                <p className="text-3xl font-bold text-status-danger">{totalVales}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-status-danger" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Registros</p>
            <p className="text-3xl font-bold">{mockFuelRecords.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Tabla de Conciliación</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full table-dense">
            <thead>
              <tr className="border-b text-left text-sm font-medium text-muted-foreground">
                <th className="py-3 px-3">Viaje ID</th>
                <th className="py-3 px-3">Fecha</th>
                <th className="py-3 px-3">Unidad</th>
                <th className="py-3 px-3">Operador</th>
                <th className="py-3 px-3 text-right">Kms</th>
                <th className="py-3 px-3 text-right">Litros ECM</th>
                <th className="py-3 px-3 text-right">Litros Ticket</th>
                <th className="py-3 px-3 text-right">Diferencia %</th>
                <th className="py-3 px-3">Acción</th>
              </tr>
            </thead>
            <tbody>
              {mockFuelRecords.map((record) => {
                const isOverTolerance = record.diferenciaPorcentaje > 5;
                return (
                  <tr key={record.id} className={`border-b transition-colors ${isOverTolerance ? "bg-status-danger-bg" : "hover:bg-muted/50"}`}>
                    <td className="py-3 px-3 font-medium">{record.viajeId}</td>
                    <td className="py-3 px-3">{record.fecha}</td>
                    <td className="py-3 px-3 font-mono">{record.unidad}</td>
                    <td className="py-3 px-3">{record.operador}</td>
                    <td className="py-3 px-3 text-right">{record.kmsRecorridos.toLocaleString()}</td>
                    <td className="py-3 px-3 text-right">{record.litrosECM.toFixed(1)}</td>
                    <td className="py-3 px-3 text-right">{record.litrosTicket.toFixed(1)}</td>
                    <td className={`py-3 px-3 text-right font-bold ${isOverTolerance ? "text-status-danger" : "text-status-success"}`}>
                      {record.diferenciaPorcentaje.toFixed(1)}%
                    </td>
                    <td className="py-3 px-3">
                      {isOverTolerance ? (
                        <Button size="sm" variant="destructive">Generar Vale de Cobro</Button>
                      ) : (
                        <Badge className="bg-status-success-bg text-status-success">Conciliado</Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
