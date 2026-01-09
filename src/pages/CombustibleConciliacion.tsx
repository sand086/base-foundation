import { useState } from "react";
import { Fuel, AlertTriangle, CheckCircle, Smartphone, Upload, Camera, Send, Filter, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { mockFuelRecords } from "@/data/mockData";
import { toast } from "@/hooks/use-toast";

export default function CombustibleConciliacion() {
  const [showMobileView, setShowMobileView] = useState(false);
  const [driverForm, setDriverForm] = useState({
    litros: "",
    costo: "",
    odometro: "",
    foto: null as File | null,
  });

  const totalVales = mockFuelRecords.filter((r) => r.estatus === "vale_cobro").length;
  const conciliados = mockFuelRecords.filter((r) => r.estatus === "conciliado").length;
  const pendientes = mockFuelRecords.filter((r) => r.estatus === "pendiente").length;

  const handleDriverSubmit = () => {
    if (!driverForm.litros || !driverForm.costo || !driverForm.odometro) {
      toast({
        title: "Campos requeridos",
        description: "Por favor complete todos los campos",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Carga registrada",
      description: `${driverForm.litros} litros @ $${driverForm.costo} - Odómetro: ${driverForm.odometro} km`,
    });
    setDriverForm({ litros: "", costo: "", odometro: "", foto: null });
    setShowMobileView(false);
  };

  const handleGenerateVale = (recordId: string, operador: string, diferencia: number) => {
    toast({
      title: "Vale de Cobro Generado",
      description: `Se generó vale por diferencia de ${diferencia.toFixed(1)}% para ${operador}`,
      variant: "destructive",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Fuel className="h-6 w-6" /> Conciliación de Combustible
          </h1>
          <p className="text-muted-foreground">Comparación ECM vs Ticket Real (Tolerancia: 5%)</p>
        </div>
        <Dialog open={showMobileView} onOpenChange={setShowMobileView}>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Smartphone className="h-4 w-4" /> Vista Operador
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Fuel className="h-5 w-5" /> Registro de Carga
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              {/* Mobile Driver Form */}
              <div className="bg-primary/5 rounded-md p-4 border">
                <p className="text-sm text-muted-foreground mb-2">Unidad Asignada</p>
                <p className="font-bold text-lg">TR-204 - Juan Pérez</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="litros">Litros Cargados</Label>
                <Input
                  id="litros"
                  type="number"
                  placeholder="Ej: 180.5"
                  value={driverForm.litros}
                  onChange={(e) => setDriverForm({ ...driverForm, litros: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="costo">Costo Total (MXN)</Label>
                <Input
                  id="costo"
                  type="number"
                  placeholder="Ej: 4,250.00"
                  value={driverForm.costo}
                  onChange={(e) => setDriverForm({ ...driverForm, costo: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="odometro">Odómetro Actual (km)</Label>
                <Input
                  id="odometro"
                  type="number"
                  placeholder="Ej: 245,890"
                  value={driverForm.odometro}
                  onChange={(e) => setDriverForm({ ...driverForm, odometro: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Foto del Ticket</Label>
                <div className="border-2 border-dashed rounded-md p-6 text-center hover:bg-muted/50 transition-colors cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    id="ticket-photo"
                    onChange={(e) => setDriverForm({ ...driverForm, foto: e.target.files?.[0] || null })}
                  />
                  <label htmlFor="ticket-photo" className="cursor-pointer">
                    {driverForm.foto ? (
                      <div className="flex items-center justify-center gap-2 text-status-success">
                        <CheckCircle className="h-6 w-6" />
                        <span className="font-medium">{driverForm.foto.name}</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Camera className="h-8 w-8" />
                        <span className="text-sm">Toca para tomar foto</span>
                      </div>
                    )}
                  </label>
                </div>
              </div>
              
              <Button onClick={handleDriverSubmit} className="w-full gap-2">
                <Send className="h-4 w-4" /> Enviar Registro
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-l-4 border-l-status-success">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Conciliados</p>
                <p className="text-3xl font-bold text-status-success">{conciliados}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-status-success" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-status-danger">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Vales de Cobro</p>
                <p className="text-3xl font-bold text-status-danger">{totalVales}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-status-danger" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-status-warning">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Pendientes</p>
            <p className="text-3xl font-bold text-status-warning">{pendientes}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Registros</p>
            <p className="text-3xl font-bold">{mockFuelRecords.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar por viaje, unidad u operador..." className="pl-10" />
            </div>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" /> Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Conciliation Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Tabla de Conciliación</span>
            <Badge variant="outline" className="font-normal">
              Tolerancia: ±5%
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full table-dense">
              <thead>
                <tr className="border-b text-left text-sm font-medium text-muted-foreground">
                  <th className="py-3 px-3">Viaje ID</th>
                  <th className="py-3 px-3">Fecha</th>
                  <th className="py-3 px-3">Unidad</th>
                  <th className="py-3 px-3">Operador</th>
                  <th className="py-3 px-3 text-right">Kms Recorridos</th>
                  <th className="py-3 px-3 text-right">Litros ECM (Teórico)</th>
                  <th className="py-3 px-3 text-right">Litros Ticket (Real)</th>
                  <th className="py-3 px-3 text-right">Diferencia %</th>
                  <th className="py-3 px-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {mockFuelRecords.map((record) => {
                  const isOverTolerance = record.diferenciaPorcentaje > 5;
                  return (
                    <tr 
                      key={record.id} 
                      className={`border-b transition-colors ${
                        isOverTolerance 
                          ? "bg-red-50 dark:bg-red-950/20" 
                          : "hover:bg-muted/50"
                      }`}
                    >
                      <td className={`py-3 px-3 font-medium ${isOverTolerance ? "text-status-danger" : ""}`}>
                        {record.viajeId}
                      </td>
                      <td className={`py-3 px-3 ${isOverTolerance ? "text-status-danger" : ""}`}>
                        {record.fecha}
                      </td>
                      <td className={`py-3 px-3 font-mono ${isOverTolerance ? "text-status-danger" : ""}`}>
                        {record.unidad}
                      </td>
                      <td className={`py-3 px-3 ${isOverTolerance ? "text-status-danger font-medium" : ""}`}>
                        {record.operador}
                      </td>
                      <td className={`py-3 px-3 text-right ${isOverTolerance ? "text-status-danger" : ""}`}>
                        {record.kmsRecorridos.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right font-mono">
                        {record.litrosECM.toFixed(1)} L
                      </td>
                      <td className={`py-3 px-3 text-right font-mono ${isOverTolerance ? "text-status-danger font-bold" : ""}`}>
                        {record.litrosTicket.toFixed(1)} L
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Badge 
                          className={`font-mono ${
                            isOverTolerance 
                              ? "bg-status-danger text-white" 
                              : "bg-status-success text-white"
                          }`}
                        >
                          {isOverTolerance ? "+" : ""}{record.diferenciaPorcentaje.toFixed(1)}%
                        </Badge>
                      </td>
                      <td className="py-3 px-3">
                        {isOverTolerance ? (
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => handleGenerateVale(record.id, record.operador, record.diferenciaPorcentaje)}
                            className="whitespace-nowrap"
                          >
                            Generar Vale de Cobro
                          </Button>
                        ) : (
                          <div className="flex items-center gap-2 text-status-success">
                            <CheckCircle className="h-5 w-5" />
                            <span className="text-sm font-medium">Conciliado</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
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
              <div className="w-4 h-4 rounded bg-red-50 border border-status-danger"></div>
              <span className="text-sm">Diferencia &gt; 5% - Requiere Vale de Cobro</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-status-success" />
              <span className="text-sm">Conciliado - Dentro de tolerancia</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
