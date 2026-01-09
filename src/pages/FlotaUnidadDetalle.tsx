import { Truck, AlertTriangle, FileText, Calendar, Shield, ChevronLeft, Wrench } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useNavigate, useParams } from "react-router-dom";
import { mockUnit } from "@/data/mockData";

const getTireColor = (depth: number) => {
  if (depth < 5) return { bg: "bg-status-danger", text: "text-white", label: "Crítico" };
  if (depth <= 10) return { bg: "bg-status-warning", text: "text-black", label: "Atención" };
  return { bg: "bg-status-success", text: "text-white", label: "OK" };
};

const getDocumentStatusBadge = (estatus: string, vencimiento: string) => {
  const today = new Date();
  const expDate = new Date(vencimiento);
  const daysUntil = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  if (estatus === 'vencido' || daysUntil < 0) {
    return <Badge className="bg-status-danger text-white">VENCIDO</Badge>;
  }
  if (estatus === 'próximo' || daysUntil <= 30) {
    return <Badge className="bg-status-warning text-black">POR VENCER ({daysUntil}d)</Badge>;
  }
  return <Badge className="bg-status-success text-white">VIGENTE</Badge>;
};

export default function FlotaUnidadDetalle() {
  const navigate = useNavigate();
  const { id } = useParams();
  
  // In production, fetch by ID. For now, use mock data
  const unit = mockUnit;
  
  const criticalTires = unit.tires.filter((t) => t.profundidad < 5);
  const warningTires = unit.tires.filter((t) => t.profundidad >= 5 && t.profundidad <= 10);
  const goodTires = unit.tires.filter((t) => t.profundidad > 10);
  
  const expiredDocs = unit.documents.filter(d => d.estatus === 'vencido');
  const hasBlocks = expiredDocs.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/flota')}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Volver
          </Button>
          <Separator orientation="vertical" className="h-8" />
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Truck className="h-6 w-6" /> Unidad {unit.numeroEconomico}
            </h1>
            <p className="text-muted-foreground">{unit.marca} {unit.modelo} - {unit.year}</p>
          </div>
        </div>
        {hasBlocks && (
          <Badge className="bg-status-danger text-white text-sm py-1 px-3 gap-2">
            <AlertTriangle className="h-4 w-4" /> UNIDAD BLOQUEADA
          </Badge>
        )}
      </div>

      {/* Technical Info & Document Status */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Technical Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" /> Información Técnica
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">No. Económico</p>
                <p className="font-bold text-lg">{unit.numeroEconomico}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Placas</p>
                <p className="font-mono font-bold text-lg">{unit.placas}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">VIN</p>
                <p className="font-mono text-sm">{unit.vin}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Año</p>
                <p className="font-bold">{unit.year}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-muted-foreground">Modelo</p>
                <p className="font-bold">{unit.marca} {unit.modelo}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Document Status */}
        <Card className={hasBlocks ? "border-status-danger border-2" : ""}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" /> Estatus de Documentos
              {hasBlocks && (
                <Badge className="bg-status-danger text-white ml-auto">
                  {expiredDocs.length} VENCIDO(S)
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {unit.documents.map((doc, idx) => (
                <div 
                  key={idx} 
                  className={`flex items-center justify-between p-3 rounded-md border ${
                    doc.estatus === 'vencido' ? 'bg-status-danger/10 border-status-danger' : 'bg-muted/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {doc.obligatorio && (
                      <Shield className={`h-4 w-4 ${doc.estatus === 'vencido' ? 'text-status-danger' : 'text-muted-foreground'}`} />
                    )}
                    <div>
                      <p className="font-medium">{doc.name}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Vence: {new Date(doc.vencimiento).toLocaleDateString('es-MX')}
                      </p>
                    </div>
                  </div>
                  {getDocumentStatusBadge(doc.estatus, doc.vencimiento)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tire Semaphore Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" /> Semáforo de Llantas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Summary Row */}
          <div className="grid gap-4 md:grid-cols-3 mb-8">
            <div className="flex items-center gap-4 p-4 rounded-md bg-status-danger/10 border border-status-danger/30">
              <div className="w-12 h-12 rounded-md bg-status-danger flex items-center justify-center text-white font-bold text-xl">
                {criticalTires.length}
              </div>
              <div>
                <p className="font-medium text-status-danger">Críticas</p>
                <p className="text-sm text-muted-foreground">{"<5mm - Reemplazar"}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 rounded-md bg-status-warning/10 border border-status-warning/30">
              <div className="w-12 h-12 rounded-md bg-status-warning flex items-center justify-center text-black font-bold text-xl">
                {warningTires.length}
              </div>
              <div>
                <p className="font-medium text-status-warning">Atención</p>
                <p className="text-sm text-muted-foreground">6-10mm - Monitorear</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 rounded-md bg-status-success/10 border border-status-success/30">
              <div className="w-12 h-12 rounded-md bg-status-success flex items-center justify-center text-white font-bold text-xl">
                {goodTires.length}
              </div>
              <div>
                <p className="font-medium text-status-success">Buen Estado</p>
                <p className="text-sm text-muted-foreground">{">11mm - OK"}</p>
              </div>
            </div>
          </div>

          {/* Visual Truck Chassis */}
          <div className="bg-muted/30 rounded-md p-8">
            <h4 className="text-center font-medium text-muted-foreground mb-6">Diagrama de Chasis</h4>
            <div className="flex flex-col items-center gap-6">
              
              {/* Cabin representation */}
              <div className="w-32 h-16 bg-primary/20 rounded-t-lg border-2 border-primary/40 flex items-center justify-center">
                <span className="text-xs text-muted-foreground font-medium">CABINA</span>
              </div>
              
              {/* Front Axle - Eje 1 */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-24">
                  {unit.tires.slice(0, 2).map((tire) => {
                    const color = getTireColor(tire.profundidad);
                    return (
                      <div key={tire.id} className="flex flex-col items-center">
                        <div className={`w-14 h-24 rounded-md ${color.bg} ${color.text} flex flex-col items-center justify-center font-bold shadow-lg border-2 border-black/20`}>
                          <span className="text-lg">{tire.profundidad}</span>
                          <span className="text-xs">mm</span>
                        </div>
                        <span className="text-xs text-muted-foreground mt-1">{tire.position.split(' - ')[1]}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="w-28 h-4 bg-primary/60 rounded-sm flex items-center justify-center">
                <span className="text-[10px] text-primary-foreground font-bold">EJE 1</span>
              </div>

              {/* Chassis body */}
              <div className="w-20 h-12 bg-primary/10 border-x-2 border-primary/30"></div>

              {/* Second Axle - Eje 2 */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-24">
                  {unit.tires.slice(2, 4).map((tire) => {
                    const color = getTireColor(tire.profundidad);
                    return (
                      <div key={tire.id} className="flex flex-col items-center">
                        <div className={`w-14 h-24 rounded-md ${color.bg} ${color.text} flex flex-col items-center justify-center font-bold shadow-lg border-2 border-black/20`}>
                          <span className="text-lg">{tire.profundidad}</span>
                          <span className="text-xs">mm</span>
                        </div>
                        <span className="text-xs text-muted-foreground mt-1">{tire.position.split(' - ')[1]}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="w-28 h-4 bg-primary/60 rounded-sm flex items-center justify-center">
                <span className="text-[10px] text-primary-foreground font-bold">EJE 2</span>
              </div>

              {/* Chassis body */}
              <div className="w-20 h-8 bg-primary/10 border-x-2 border-primary/30"></div>

              {/* Third Axle - Eje 3 (Dual Tires) */}
              <div className="flex items-center gap-16">
                {/* Left dual tires */}
                <div className="flex gap-1">
                  {unit.tires.slice(4, 6).map((tire) => {
                    const color = getTireColor(tire.profundidad);
                    return (
                      <div key={tire.id} className="flex flex-col items-center">
                        <div className={`w-12 h-20 rounded-md ${color.bg} ${color.text} flex flex-col items-center justify-center font-bold shadow-lg border-2 border-black/20`}>
                          <span className="text-sm">{tire.profundidad}</span>
                          <span className="text-[10px]">mm</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* Right dual tires */}
                <div className="flex gap-1">
                  {unit.tires.slice(6, 8).map((tire) => {
                    const color = getTireColor(tire.profundidad);
                    return (
                      <div key={tire.id} className="flex flex-col items-center">
                        <div className={`w-12 h-20 rounded-md ${color.bg} ${color.text} flex flex-col items-center justify-center font-bold shadow-lg border-2 border-black/20`}>
                          <span className="text-sm">{tire.profundidad}</span>
                          <span className="text-[10px]">mm</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="w-28 h-4 bg-primary/60 rounded-sm flex items-center justify-center">
                <span className="text-[10px] text-primary-foreground font-bold">EJE 3</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tire Details Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detalle de Llantas</CardTitle>
        </CardHeader>
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
                <th className="py-3 px-3">Renovados</th>
                <th className="py-3 px-3">Marcaje</th>
              </tr>
            </thead>
            <tbody>
              {unit.tires.map((tire) => {
                const color = getTireColor(tire.profundidad);
                return (
                  <tr key={tire.id} className={`border-b hover:bg-muted/50 ${tire.profundidad < 5 ? 'bg-status-danger/5' : ''}`}>
                    <td className="py-3 px-3 font-medium">{tire.position}</td>
                    <td className="py-3 px-3 font-mono text-sm">{tire.id}</td>
                    <td className="py-3 px-3">{tire.marca}</td>
                    <td className="py-3 px-3 font-bold">{tire.profundidad} mm</td>
                    <td className="py-3 px-3">
                      <Badge className={`${color.bg} ${color.text}`}>{color.label}</Badge>
                    </td>
                    <td className="py-3 px-3 capitalize">{tire.estado}</td>
                    <td className="py-3 px-3">{tire.renovado > 0 ? `${tire.renovado}x` : '—'}</td>
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
