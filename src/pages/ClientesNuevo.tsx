import { useState } from "react";
import { Users, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface SubClient {
  id: string;
  nombre: string;
  alias: string;
  estado: string;
  municipio: string;
  direccion: string;
}

export default function ClientesNuevo() {
  const [step, setStep] = useState(1);
  const [subClients, setSubClients] = useState<SubClient[]>([{ id: "1", nombre: "", alias: "", estado: "", municipio: "", direccion: "" }]);

  const addSubClient = () => {
    setSubClients([...subClients, { id: Date.now().toString(), nombre: "", alias: "", estado: "", municipio: "", direccion: "" }]);
  };

  const removeSubClient = (id: string) => {
    if (subClients.length > 1) setSubClients(subClients.filter((s) => s.id !== id));
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="h-6 w-6" /> Alta de Cliente</h1>
        <p className="text-muted-foreground">Wizard de registro - Paso {step} de 2</p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-4">
        <div className={`flex items-center gap-2 ${step >= 1 ? "text-primary" : "text-muted-foreground"}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? "bg-primary text-primary-foreground" : "bg-muted"}`}>1</div>
          <span className="font-medium">Datos Fiscales</span>
        </div>
        <div className="flex-1 h-0.5 bg-border" />
        <div className={`flex items-center gap-2 ${step >= 2 ? "text-primary" : "text-muted-foreground"}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? "bg-primary text-primary-foreground" : "bg-muted"}`}>2</div>
          <span className="font-medium">Subclientes</span>
        </div>
      </div>

      {step === 1 && (
        <Card>
          <CardHeader><CardTitle>Datos Fiscales (Receptor CFDI)</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Razón Social *</Label>
                <Input placeholder="Empresa S.A. de C.V." />
              </div>
              <div className="space-y-2">
                <Label>RFC *</Label>
                <Input placeholder="XXX000000XXX" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Régimen Fiscal *</Label>
                <Select>
                  <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="601">601 - General de Ley</SelectItem>
                    <SelectItem value="603">603 - Personas Morales con Fines no Lucrativos</SelectItem>
                    <SelectItem value="612">612 - Personas Físicas con Actividades Empresariales</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Uso de CFDI</Label>
                <Select>
                  <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="G03">G03 - Gastos en general</SelectItem>
                    <SelectItem value="P01">P01 - Por definir</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Constancia de Situación Fiscal (PDF)</Label>
              <Input type="file" accept=".pdf" />
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setStep(2)}>Siguiente</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Subclientes y Direcciones de Entrega</CardTitle>
              <Button onClick={addSubClient} size="sm"><Plus className="h-4 w-4 mr-2" /> Agregar Sucursal</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {subClients.map((sub, idx) => (
              <div key={sub.id} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Sucursal {idx + 1}</h4>
                  {subClients.length > 1 && (
                    <Button variant="ghost" size="sm" onClick={() => removeSubClient(sub.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nombre del Subcliente</Label>
                    <Input placeholder="Planta Norte" />
                  </div>
                  <div className="space-y-2">
                    <Label>Alias</Label>
                    <Input placeholder="PNORTE" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Estado</Label>
                    <Input placeholder="Nuevo León" />
                  </div>
                  <div className="space-y-2">
                    <Label>Municipio</Label>
                    <Input placeholder="Monterrey" />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo Operación</Label>
                    <Select>
                      <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nacional">Nacional</SelectItem>
                        <SelectItem value="importacion">Importación</SelectItem>
                        <SelectItem value="exportacion">Exportación</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Dirección Completa</Label>
                  <Input placeholder="Av. Siempre Viva 123, Col. Centro" />
                </div>
              </div>
            ))}
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>Anterior</Button>
              <Button>Guardar Cliente</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
