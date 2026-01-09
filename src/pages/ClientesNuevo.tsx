import { useState } from "react";
import { Users, Plus, Trash2, Upload, ArrowLeft, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface SubClient {
  id: string;
  alias: string;
  direccion: string;
  tipoOperacion: string;
}

export default function ClientesNuevo() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [fiscalData, setFiscalData] = useState({
    razonSocial: "",
    rfc: "",
    regimenFiscal: "",
    usoCFDI: "",
  });
  const [subClients, setSubClients] = useState<SubClient[]>([]);
  const [newSubClient, setNewSubClient] = useState<SubClient>({
    id: "",
    alias: "",
    direccion: "",
    tipoOperacion: "",
  });
  const [showSubClientForm, setShowSubClientForm] = useState(false);

  const addSubClient = () => {
    if (!newSubClient.alias || !newSubClient.direccion || !newSubClient.tipoOperacion) {
      toast.error("Completa todos los campos del subcliente");
      return;
    }
    setSubClients([...subClients, { ...newSubClient, id: Date.now().toString() }]);
    setNewSubClient({ id: "", alias: "", direccion: "", tipoOperacion: "" });
    setShowSubClientForm(false);
    toast.success("Subcliente agregado");
  };

  const removeSubClient = (id: string) => {
    setSubClients(subClients.filter((s) => s.id !== id));
  };

  const handleSave = () => {
    toast.success("Cliente guardado exitosamente");
    navigate("/clientes");
  };

  const canProceed = fiscalData.razonSocial && fiscalData.rfc;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/clientes")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" /> Alta de Cliente
          </h1>
          <p className="text-muted-foreground">Wizard de registro - Paso {step} de 2</p>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-4">
        <div className={`flex items-center gap-2 ${step >= 1 ? "text-primary" : "text-muted-foreground"}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-medium ${step >= 1 ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
            {step > 1 ? <Check className="h-4 w-4" /> : "1"}
          </div>
          <span className="font-medium">Datos Fiscales</span>
        </div>
        <div className="flex-1 h-0.5 bg-border" />
        <div className={`flex items-center gap-2 ${step >= 2 ? "text-primary" : "text-muted-foreground"}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-medium ${step >= 2 ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
            2
          </div>
          <span className="font-medium">Subclientes</span>
        </div>
      </div>

      {/* Step 1: Fiscal Data */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Datos Fiscales (Receptor CFDI)</CardTitle>
            <CardDescription>Información fiscal del cliente para facturación</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Razón Social *</Label>
                <Input
                  placeholder="Empresa S.A. de C.V."
                  value={fiscalData.razonSocial}
                  onChange={(e) => setFiscalData({ ...fiscalData, razonSocial: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>RFC *</Label>
                <Input
                  placeholder="XXX000000XXX"
                  value={fiscalData.rfc}
                  onChange={(e) => setFiscalData({ ...fiscalData, rfc: e.target.value.toUpperCase() })}
                  maxLength={13}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Régimen Fiscal</Label>
                <Select
                  value={fiscalData.regimenFiscal}
                  onValueChange={(value) => setFiscalData({ ...fiscalData, regimenFiscal: value })}
                >
                  <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="601">601 - General de Ley</SelectItem>
                    <SelectItem value="603">603 - Personas Morales sin Fines de Lucro</SelectItem>
                    <SelectItem value="612">612 - Personas Físicas con Actividades Empresariales</SelectItem>
                    <SelectItem value="626">626 - Régimen Simplificado de Confianza</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Uso de CFDI</Label>
                <Select
                  value={fiscalData.usoCFDI}
                  onValueChange={(value) => setFiscalData({ ...fiscalData, usoCFDI: value })}
                >
                  <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="G03">G03 - Gastos en general</SelectItem>
                    <SelectItem value="P01">P01 - Por definir</SelectItem>
                    <SelectItem value="S01">S01 - Sin efectos fiscales</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <Label>Constancia de Situación Fiscal (PDF)</Label>
              <div className="border-2 border-dashed rounded-md p-6 text-center hover:border-primary/50 transition-colors cursor-pointer">
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Arrastra un archivo PDF o <span className="text-primary font-medium">haz clic para seleccionar</span>
                </p>
                <Input type="file" accept=".pdf" className="hidden" id="fiscal-file" />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button onClick={() => setStep(2)} disabled={!canProceed}>
                Siguiente
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Sub-Clients */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Subclientes y Direcciones de Entrega</CardTitle>
                <CardDescription>Agrega las sucursales o ubicaciones de entrega del cliente</CardDescription>
              </div>
              <Button onClick={() => setShowSubClientForm(true)} size="sm" disabled={showSubClientForm}>
                <Plus className="h-4 w-4 mr-2" /> Agregar Subcliente
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* New Sub-Client Form */}
            {showSubClientForm && (
              <div className="border rounded-md p-4 bg-muted/30 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">Nuevo Subcliente</h4>
                  <Button variant="ghost" size="sm" onClick={() => setShowSubClientForm(false)}>
                    Cancelar
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Alias *</Label>
                    <Input
                      placeholder="Ej: Planta Norte"
                      value={newSubClient.alias}
                      onChange={(e) => setNewSubClient({ ...newSubClient, alias: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label>Dirección Completa *</Label>
                    <Input
                      placeholder="Av. Industrial 123, Col. Centro, Monterrey, NL"
                      value={newSubClient.direccion}
                      onChange={(e) => setNewSubClient({ ...newSubClient, direccion: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo de Operación *</Label>
                    <Select
                      value={newSubClient.tipoOperacion}
                      onValueChange={(value) => setNewSubClient({ ...newSubClient, tipoOperacion: value })}
                    >
                      <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nacional">Nacional</SelectItem>
                        <SelectItem value="importacion">Importación</SelectItem>
                        <SelectItem value="exportacion">Exportación</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2 flex items-end">
                    <Button onClick={addSubClient} className="w-full">
                      <Plus className="h-4 w-4 mr-2" /> Agregar Subcliente
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Sub-Clients List */}
            {subClients.length === 0 && !showSubClientForm ? (
              <div className="text-center py-8 border rounded-md bg-muted/20">
                <Users className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No hay subclientes agregados</p>
                <Button variant="link" onClick={() => setShowSubClientForm(true)}>
                  + Agregar el primer subcliente
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {subClients.map((sub, idx) => (
                  <div key={sub.id} className="flex items-center justify-between border rounded-md p-3 hover:bg-muted/30">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-sm">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="font-medium">{sub.alias}</p>
                        <p className="text-sm text-muted-foreground">{sub.direccion}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="capitalize">{sub.tipoOperacion}</Badge>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeSubClient(sub.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Anterior
              </Button>
              <Button onClick={handleSave}>
                Guardar Cliente
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
