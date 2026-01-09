import { Truck, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { mockUnit } from "@/data/mockData";

const getTireColor = (depth: number) => {
  if (depth < 5) return { bg: "bg-status-danger", text: "text-white", label: "Crítico" };
  if (depth <= 10) return { bg: "bg-status-warning", text: "text-black", label: "Atención" };
  return { bg: "bg-status-success", text: "text-white", label: "OK" };
};

export default function FlotaLlantas() {
  const criticalTires = mockUnit.tires.filter((t) => t.profundidad < 5);
  const warningTires = mockUnit.tires.filter((t) => t.profundidad >= 5 && t.profundidad <= 10);
  const goodTires = mockUnit.tires.filter((t) => t.profundidad > 10);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Truck className="h-6 w-6" /> Semáforo de Llantas</h1>
        <p className="text-muted-foreground">Unidad {mockUnit.numeroEconomico} - {mockUnit.modelo}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-l-4 border-l-status-danger">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Críticas (Reemplazar)</p>
                <p className="text-3xl font-bold text-status-danger">{criticalTires.length}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-status-danger" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-status-warning">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Atención (6-10mm)</p>
            <p className="text-3xl font-bold text-status-warning">{warningTires.length}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-status-success">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Buen Estado (+11mm)</p>
            <p className="text-3xl font-bold text-status-success">{goodTires.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Visual Truck Chassis */}
      <Card>
        <CardHeader><CardTitle>Diagrama de Llantas</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-8 py-8">
            {/* Front Axle */}
            <div className="flex items-center gap-32">
              {mockUnit.tires.slice(0, 2).map((tire) => {
                const color = getTireColor(tire.profundidad);
                return (
                  <div key={tire.id} className={`w-16 h-24 rounded-lg ${color.bg} ${color.text} flex flex-col items-center justify-center text-xs font-bold shadow-lg`}>
                    <span>{tire.profundidad}mm</span>
                    <span className="text-[10px] mt-1">{tire.position.split(' - ')[1]}</span>
                  </div>
                );
              })}
            </div>
            <div className="w-24 h-16 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold">EJE 1</div>

            {/* Second Axle */}
            <div className="flex items-center gap-32">
              {mockUnit.tires.slice(2, 4).map((tire) => {
                const color = getTireColor(tire.profundidad);
                return (
                  <div key={tire.id} className={`w-16 h-24 rounded-lg ${color.bg} ${color.text} flex flex-col items-center justify-center text-xs font-bold shadow-lg`}>
                    <span>{tire.profundidad}mm</span>
                    <span className="text-[10px] mt-1">{tire.position.split(' - ')[1]}</span>
                  </div>
                );
              })}
            </div>
            <div className="w-24 h-16 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold">EJE 2</div>

            {/* Third Axle (dual tires) */}
            <div className="flex items-center gap-24">
              <div className="flex gap-2">
                {mockUnit.tires.slice(4, 6).map((tire) => {
                  const color = getTireColor(tire.profundidad);
                  return (
                    <div key={tire.id} className={`w-14 h-20 rounded-lg ${color.bg} ${color.text} flex flex-col items-center justify-center text-xs font-bold shadow-lg`}>
                      <span>{tire.profundidad}mm</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-2">
                {mockUnit.tires.slice(6, 8).map((tire) => {
                  const color = getTireColor(tire.profundidad);
                  return (
                    <div key={tire.id} className={`w-14 h-20 rounded-lg ${color.bg} ${color.text} flex flex-col items-center justify-center text-xs font-bold shadow-lg`}>
                      <span>{tire.profundidad}mm</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="w-24 h-16 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold">EJE 3</div>
          </div>
        </CardContent>
      </Card>

      {/* Tire Details Table */}
      <Card>
        <CardHeader><CardTitle>Detalle de Llantas</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full table-dense">
            <thead>
              <tr className="border-b text-left text-sm font-medium text-muted-foreground">
                <th className="py-3 px-3">Posición</th>
                <th className="py-3 px-3">ID Llanta</th>
                <th className="py-3 px-3">Marca</th>
                <th className="py-3 px-3">Profundidad</th>
                <th className="py-3 px-3">Semáforo</th>
                <th className="py-3 px-3">Estado</th>
                <th className="py-3 px-3">Marcaje</th>
              </tr>
            </thead>
            <tbody>
              {mockUnit.tires.map((tire) => {
                const color = getTireColor(tire.profundidad);
                return (
                  <tr key={tire.id} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-3">{tire.position}</td>
                    <td className="py-3 px-3 font-mono">{tire.id}</td>
                    <td className="py-3 px-3">{tire.marca}</td>
                    <td className="py-3 px-3 font-bold">{tire.profundidad} mm</td>
                    <td className="py-3 px-3"><Badge className={`${color.bg} ${color.text}`}>{color.label}</Badge></td>
                    <td className="py-3 px-3 capitalize">{tire.estado}</td>
                    <td className="py-3 px-3 font-mono text-xs">{tire.marcajeInterno}</td>
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
