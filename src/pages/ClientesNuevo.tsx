import { useState, useEffect } from "react";
import { Users, Plus, Trash2, Upload, ArrowLeft, Check, MapPin, Building2, Phone, Clock, Edit2, DollarSign, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { mockClients, type Client } from "@/data/mockData";

interface SubClienteForm {
  id: string;
  nombre: string;
  alias: string;
  direccion: string;
  ciudad: string;
  estado: string;
  codigoPostal: string;
  tipoOperacion: string;
  contacto: string;
  telefono: string;
  horarioRecepcion: string;
  // Step 3: Tarifa fields
  tarifaPactada: number;
  moneda: string;
  diasCredito: number;
}

const emptySubCliente: SubClienteForm = {
  id: "",
  nombre: "",
  alias: "",
  direccion: "",
  ciudad: "",
  estado: "",
  codigoPostal: "",
  tipoOperacion: "",
  contacto: "",
  telefono: "",
  horarioRecepcion: "",
  tarifaPactada: 0,
  moneda: "MXN",
  diasCredito: 30,
};

const estadosMexico = [
  "Aguascalientes", "Baja California", "Baja California Sur", "Campeche", "Chiapas",
  "Chihuahua", "Ciudad de México", "Coahuila", "Colima", "Durango", "Estado de México",
  "Guanajuato", "Guerrero", "Hidalgo", "Jalisco", "Michoacán", "Morelos", "Nayarit",
  "Nuevo León", "Oaxaca", "Puebla", "Querétaro", "Quintana Roo", "San Luis Potosí",
  "Sinaloa", "Sonora", "Tabasco", "Tamaulipas", "Tlaxcala", "Veracruz", "Yucatán", "Zacatecas"
];

export default function ClientesNuevo() {
  const navigate = useNavigate();
  const { clientId } = useParams();
  const [searchParams] = useSearchParams();
  const isEditMode = !!clientId || searchParams.get('edit') !== null;
  
  const [step, setStep] = useState(1);
  const [fiscalData, setFiscalData] = useState({
    razonSocial: "",
    rfc: "",
    regimenFiscal: "",
    usoCFDI: "",
    codigoPostalFiscal: "",
    direccionFiscal: "",
    contactoPrincipal: "",
    telefono: "",
    email: "",
    contratoUrl: "",
  });
  const [subClientes, setSubClientes] = useState<SubClienteForm[]>([]);
  const [editingSubCliente, setEditingSubCliente] = useState<SubClienteForm | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Load client data in edit mode
  useEffect(() => {
    const editId = clientId || searchParams.get('edit');
    if (editId) {
      const client = mockClients.find(c => c.id === editId);
      if (client) {
        setFiscalData({
          razonSocial: client.razónSocial,
          rfc: client.rfc,
          regimenFiscal: client.regimenFiscal || "",
          usoCFDI: client.usoCFDI || "",
          codigoPostalFiscal: client.direccionFiscal?.match(/CP\s*(\d{5})/)?.[1] || "",
          direccionFiscal: client.direccionFiscal || "",
          contactoPrincipal: client.contactoPrincipal,
          telefono: client.telefono,
          email: client.email || "",
          contratoUrl: (client as any).contratoUrl || "",
        });
        
        // Convert SubClienteDetalle to SubClienteForm
        const converted: SubClienteForm[] = client.subClientesDetalle.map(sub => ({
          id: sub.id,
          nombre: sub.nombre,
          alias: sub.alias,
          direccion: sub.direccion,
          ciudad: sub.ciudad,
          estado: sub.estado,
          codigoPostal: sub.codigoPostal,
          tipoOperacion: sub.tipoOperacion,
          contacto: sub.contacto || "",
          telefono: sub.telefono || "",
          horarioRecepcion: sub.horarioRecepcion || "",
          tarifaPactada: (sub as any).tarifaPactada || 0,
          moneda: (sub as any).moneda || "MXN",
          diasCredito: (sub as any).diasCredito || 30,
        }));
        setSubClientes(converted);
        
        toast.info("Modo edición", {
          description: `Editando cliente: ${client.razónSocial}`,
        });
      }
    }
  }, [clientId, searchParams]);

  const addSubCliente = () => {
    const newSub: SubClienteForm = {
      ...emptySubCliente,
      id: `SUB-${Date.now()}`,
    };
    setSubClientes([...subClientes, newSub]);
    setEditingSubCliente(newSub);
    setEditingIndex(subClientes.length);
  };

  const updateSubCliente = (index: number, field: keyof SubClienteForm, value: string | number) => {
    const updated = [...subClientes];
    updated[index] = { ...updated[index], [field]: value };
    setSubClientes(updated);
    if (editingIndex === index) {
      setEditingSubCliente(updated[index]);
    }
  };

  const removeSubCliente = (index: number) => {
    setSubClientes(subClientes.filter((_, i) => i !== index));
    if (editingIndex === index) {
      setEditingSubCliente(null);
      setEditingIndex(null);
    }
    toast.success("Subcliente eliminado");
  };

  const saveSubCliente = () => {
    if (editingIndex !== null && editingSubCliente) {
      if (!editingSubCliente.nombre || !editingSubCliente.direccion || !editingSubCliente.ciudad) {
        toast.error("Complete los campos obligatorios del subcliente");
        return;
      }
      toast.success("Subcliente guardado");
      setEditingSubCliente(null);
      setEditingIndex(null);
    }
  };

  // RFC Validation (12-13 characters)
  const validateRFC = (rfc: string): boolean => {
    return rfc.length >= 12 && rfc.length <= 13;
  };

  // Postal code validation (5 digits)
  const validateCodigoPostal = (cp: string): boolean => {
    return /^\d{5}$/.test(cp);
  };

  const handleSave = () => {
    // Validate fiscal data
    if (!fiscalData.razonSocial || !fiscalData.rfc) {
      toast.error("Complete los datos fiscales obligatorios");
      return;
    }

    if (!validateRFC(fiscalData.rfc)) {
      toast.error("RFC inválido", { description: "Debe tener 12-13 caracteres" });
      return;
    }

    if (fiscalData.codigoPostalFiscal && !validateCodigoPostal(fiscalData.codigoPostalFiscal)) {
      toast.error("Código Postal inválido", { description: "Debe tener 5 dígitos" });
      return;
    }

    // Count subclientes with tariffs assigned
    const tarifasAsignadas = subClientes.filter(s => s.tarifaPactada > 0).length;

    toast.success(isEditMode ? "Cliente actualizado exitosamente" : "Cliente guardado exitosamente", {
      description: `${fiscalData.razonSocial} con ${subClientes.length} destino(s) y ${tarifasAsignadas} tarifa(s) asignadas`,
    });
    navigate("/clientes");
  };

  const canProceed = fiscalData.razonSocial && fiscalData.rfc && validateRFC(fiscalData.rfc);
  const canProceedStep2 = subClientes.length > 0 && subClientes.every(s => s.nombre && s.direccion && s.ciudad);

  const getOperationBadge = (tipo: string) => {
    switch (tipo) {
      case 'nacional':
        return <Badge className="bg-status-success text-white">Nacional</Badge>;
      case 'importacion':
        return <Badge className="bg-status-info text-white">Importación</Badge>;
      case 'exportacion':
        return <Badge className="bg-amber-500 text-white">Exportación</Badge>;
      default:
        return <Badge variant="outline">Sin definir</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/clientes")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" /> {isEditMode ? "Editar Cliente" : "Alta de Cliente"}
          </h1>
          <p className="text-muted-foreground">Wizard de registro - Paso {step} de 3</p>
        </div>
      </div>

      {/* Step Indicator - Now 3 steps */}
      <div className="flex items-center gap-4">
        <div className={`flex items-center gap-2 ${step >= 1 ? "text-primary" : "text-muted-foreground"}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-medium ${step >= 1 ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
            {step > 1 ? <Check className="h-4 w-4" /> : "1"}
          </div>
          <span className="font-medium hidden sm:block">Datos Fiscales</span>
        </div>
        <div className="flex-1 h-0.5 bg-border" />
        <div className={`flex items-center gap-2 ${step >= 2 ? "text-primary" : "text-muted-foreground"}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-medium ${step >= 2 ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
            {step > 2 ? <Check className="h-4 w-4" /> : "2"}
          </div>
          <span className="font-medium hidden sm:block">Destinos</span>
        </div>
        <div className="flex-1 h-0.5 bg-border" />
        <div className={`flex items-center gap-2 ${step >= 3 ? "text-primary" : "text-muted-foreground"}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-medium ${step >= 3 ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
            3
          </div>
          <span className="font-medium hidden sm:block">Tarifas y Convenios</span>
        </div>
      </div>

      {/* Step 1: Fiscal Data */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Datos Fiscales (Receptor CFDI 4.0)
            </CardTitle>
            <CardDescription>Información fiscal del cliente para facturación electrónica</CardDescription>
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
                <Label>RFC * (12-13 caracteres)</Label>
                <Input
                  placeholder="XXX000000XXX"
                  value={fiscalData.rfc}
                  onChange={(e) => setFiscalData({ ...fiscalData, rfc: e.target.value.toUpperCase() })}
                  maxLength={13}
                  className={cn(
                    "font-mono",
                    fiscalData.rfc && !validateRFC(fiscalData.rfc) && "border-destructive focus-visible:ring-destructive"
                  )}
                />
                {fiscalData.rfc && !validateRFC(fiscalData.rfc) && (
                  <p className="text-xs text-destructive">RFC debe tener 12-13 caracteres</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Régimen Fiscal *</Label>
                <Select
                  value={fiscalData.regimenFiscal}
                  onValueChange={(value) => setFiscalData({ ...fiscalData, regimenFiscal: value })}
                >
                  <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent className="bg-popover border shadow-lg z-50">
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
                  <SelectContent className="bg-popover border shadow-lg z-50">
                    <SelectItem value="G03">G03 - Gastos en general</SelectItem>
                    <SelectItem value="P01">P01 - Por definir</SelectItem>
                    <SelectItem value="S01">S01 - Sin efectos fiscales</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Código Postal Fiscal *</Label>
                <Input
                  placeholder="00000"
                  value={fiscalData.codigoPostalFiscal}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 5);
                    setFiscalData({ ...fiscalData, codigoPostalFiscal: value });
                  }}
                  maxLength={5}
                  className={cn(
                    "font-mono",
                    fiscalData.codigoPostalFiscal && !validateCodigoPostal(fiscalData.codigoPostalFiscal) && "border-destructive"
                  )}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Dirección Fiscal</Label>
              <Input
                placeholder="Av. Ejemplo 123, Col. Centro, Ciudad, Estado, CP"
                value={fiscalData.direccionFiscal}
                onChange={(e) => setFiscalData({ ...fiscalData, direccionFiscal: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Contacto Principal</Label>
                <Input
                  placeholder="Lic. Juan Pérez"
                  value={fiscalData.contactoPrincipal}
                  onChange={(e) => setFiscalData({ ...fiscalData, contactoPrincipal: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input
                  placeholder="55 1234 5678"
                  value={fiscalData.telefono}
                  onChange={(e) => setFiscalData({ ...fiscalData, telefono: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="contacto@empresa.com"
                  value={fiscalData.email}
                  onChange={(e) => setFiscalData({ ...fiscalData, email: e.target.value })}
                />
              </div>
            </div>

            {/* File Uploads */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Constancia de Situación Fiscal (PDF)</Label>
                <div className="border-2 border-dashed rounded-md p-4 text-center hover:border-primary/50 transition-colors cursor-pointer">
                  <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
                  <p className="text-xs text-muted-foreground">
                    Arrastra o <span className="text-primary font-medium">selecciona</span>
                  </p>
                  <Input type="file" accept=".pdf" className="hidden" id="fiscal-file" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Contrato General (PDF)
                </Label>
                <div className="border-2 border-dashed rounded-md p-4 text-center hover:border-primary/50 transition-colors cursor-pointer">
                  <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
                  <p className="text-xs text-muted-foreground">
                    {fiscalData.contratoUrl ? (
                      <span className="text-emerald-600 font-medium">✓ Contrato cargado</span>
                    ) : (
                      <>Arrastra o <span className="text-primary font-medium">selecciona</span></>
                    )}
                  </p>
                  <Input type="file" accept=".pdf" className="hidden" id="contract-file" />
                </div>
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

      {/* Step 2: Sub-Clients with Dynamic Array */}
      {step === 2 && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Subclientes y Direcciones de Entrega
                  </CardTitle>
                  <CardDescription>
                    Agrega las sucursales, plantas o ubicaciones de entrega del cliente "{fiscalData.razonSocial}"
                  </CardDescription>
                </div>
                <Button onClick={addSubCliente} className="gap-2 bg-action hover:bg-action-hover text-action-foreground">
                  <Plus className="h-4 w-4" /> Agregar Destino
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {subClientes.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-lg bg-muted/20">
                  <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <h3 className="font-semibold text-lg mb-1">Sin subclientes registrados</h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    Agrega ubicaciones de entrega como plantas, almacenes o sucursales
                  </p>
                  <Button variant="outline" onClick={addSubCliente}>
                    <Plus className="h-4 w-4 mr-2" /> Agregar primer destino
                  </Button>
                </div>
              ) : (
                <Accordion type="single" collapsible className="space-y-2" value={editingIndex !== null ? `sub-${editingIndex}` : undefined}>
                  {subClientes.map((sub, idx) => (
                    <AccordionItem 
                      key={sub.id} 
                      value={`sub-${idx}`}
                      className={cn(
                        "border rounded-lg overflow-hidden transition-all",
                        editingIndex === idx ? "ring-2 ring-primary" : ""
                      )}
                    >
                      <AccordionTrigger className="px-4 py-3 hover:bg-muted/50 [&[data-state=open]]:bg-muted/50">
                        <div className="flex items-center gap-4 flex-1 text-left">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-sm">
                            {idx + 1}
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold">
                              {sub.nombre || <span className="text-muted-foreground italic">Nombre del destino...</span>}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {sub.ciudad && sub.estado ? `${sub.ciudad}, ${sub.estado}` : 'Sin ubicación'}
                            </p>
                          </div>
                          {sub.tipoOperacion && getOperationBadge(sub.tipoOperacion)}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4">
                        <div className="space-y-4 pt-4 border-t">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Nombre del Destino *</Label>
                              <Input
                                placeholder="Ej: Planta Norte Monterrey"
                                value={sub.nombre}
                                onChange={(e) => updateSubCliente(idx, 'nombre', e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Alias (corto)</Label>
                              <Input
                                placeholder="Ej: Planta Norte"
                                value={sub.alias}
                                onChange={(e) => updateSubCliente(idx, 'alias', e.target.value)}
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>Dirección Completa *</Label>
                            <Input
                              placeholder="Av. Industrial 123, Parque Industrial..."
                              value={sub.direccion}
                              onChange={(e) => updateSubCliente(idx, 'direccion', e.target.value)}
                            />
                          </div>

                          <div className="grid grid-cols-4 gap-4">
                            <div className="space-y-2">
                              <Label>Ciudad *</Label>
                              <Input
                                placeholder="Monterrey"
                                value={sub.ciudad}
                                onChange={(e) => updateSubCliente(idx, 'ciudad', e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Estado</Label>
                              <Select
                                value={sub.estado}
                                onValueChange={(value) => updateSubCliente(idx, 'estado', value)}
                              >
                                <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                                <SelectContent className="bg-popover border shadow-lg z-50 max-h-60">
                                  {estadosMexico.map((edo) => (
                                    <SelectItem key={edo} value={edo}>{edo}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Código Postal</Label>
                              <Input
                                placeholder="64000"
                                value={sub.codigoPostal}
                                onChange={(e) => updateSubCliente(idx, 'codigoPostal', e.target.value.replace(/\D/g, '').slice(0, 5))}
                                maxLength={5}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Tipo Operación</Label>
                              <Select
                                value={sub.tipoOperacion}
                                onValueChange={(value) => updateSubCliente(idx, 'tipoOperacion', value)}
                              >
                                <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                                <SelectContent className="bg-popover border shadow-lg z-50">
                                  <SelectItem value="nacional">Nacional</SelectItem>
                                  <SelectItem value="importacion">Importación</SelectItem>
                                  <SelectItem value="exportacion">Exportación</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <Label className="flex items-center gap-1">
                                <Users className="h-3 w-3" /> Contacto
                              </Label>
                              <Input
                                placeholder="Ing. Roberto Salinas"
                                value={sub.contacto}
                                onChange={(e) => updateSubCliente(idx, 'contacto', e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="flex items-center gap-1">
                                <Phone className="h-3 w-3" /> Teléfono
                              </Label>
                              <Input
                                placeholder="81 5555 4444"
                                value={sub.telefono}
                                onChange={(e) => updateSubCliente(idx, 'telefono', e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="flex items-center gap-1">
                                <Clock className="h-3 w-3" /> Horario Recepción
                              </Label>
                              <Input
                                placeholder="Lun-Vie 7:00-17:00"
                                value={sub.horarioRecepcion}
                                onChange={(e) => updateSubCliente(idx, 'horarioRecepcion', e.target.value)}
                              />
                            </div>
                          </div>

                          <div className="flex justify-end pt-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => removeSubCliente(idx)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Eliminar destino
                            </Button>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </CardContent>
          </Card>

          {/* Summary Card */}
          {subClientes.length > 0 && (
            <Card className="bg-muted/30">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div>
                      <p className="text-sm text-muted-foreground">Cliente</p>
                      <p className="font-semibold">{fiscalData.razonSocial}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">RFC</p>
                      <p className="font-mono">{fiscalData.rfc}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Destinos</p>
                      <p className="font-semibold text-primary">{subClientes.length}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Navigation */}
          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setStep(1)}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Anterior
            </Button>
            <Button onClick={() => setStep(3)} disabled={!canProceedStep2}>
              Siguiente: Tarifas
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Tarifas y Convenios */}
      {step === 3 && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Tarifas y Convenios Comerciales
              </CardTitle>
              <CardDescription>
                Asigna tarifas base y condiciones comerciales a cada destino de "{fiscalData.razonSocial}"
              </CardDescription>
            </CardHeader>
            <CardContent>
              {subClientes.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-lg bg-muted/20">
                  <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <h3 className="font-semibold text-lg mb-1">Sin destinos para asignar tarifas</h3>
                  <p className="text-muted-foreground text-sm">
                    Regresa al paso anterior para agregar destinos
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Header Row */}
                  <div className="grid grid-cols-12 gap-4 px-4 py-2 bg-muted/50 rounded-lg text-sm font-medium text-muted-foreground">
                    <div className="col-span-4">Destino</div>
                    <div className="col-span-3">Tarifa Base Pactada</div>
                    <div className="col-span-2">Moneda</div>
                    <div className="col-span-3">Días de Crédito</div>
                  </div>

                  {/* Subcliente Rows */}
                  {subClientes.map((sub, idx) => (
                    <div 
                      key={sub.id} 
                      className={cn(
                        "grid grid-cols-12 gap-4 p-4 rounded-lg border transition-all",
                        sub.tarifaPactada > 0 ? "bg-emerald-50/50 border-emerald-200" : "bg-white"
                      )}
                    >
                      <div className="col-span-4 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-sm">
                          {idx + 1}
                        </div>
                        <div>
                          <p className="font-medium">{sub.nombre}</p>
                          <p className="text-xs text-muted-foreground">{sub.ciudad}, {sub.estado}</p>
                        </div>
                      </div>
                      <div className="col-span-3">
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            value={sub.tarifaPactada || ""}
                            onChange={(e) => updateSubCliente(idx, 'tarifaPactada', parseFloat(e.target.value) || 0)}
                            className="pl-7 font-mono"
                          />
                        </div>
                      </div>
                      <div className="col-span-2">
                        <Select
                          value={sub.moneda}
                          onValueChange={(value) => updateSubCliente(idx, 'moneda', value)}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-popover border shadow-lg z-50">
                            <SelectItem value="MXN">MXN</SelectItem>
                            <SelectItem value="USD">USD</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-3 flex items-center gap-2">
                        <Input
                          type="number"
                          min="0"
                          max="120"
                          value={sub.diasCredito}
                          onChange={(e) => updateSubCliente(idx, 'diasCredito', parseInt(e.target.value) || 0)}
                          className="w-20 font-mono"
                        />
                        <span className="text-sm text-muted-foreground">días</span>
                        {sub.diasCredito > 0 && (
                          <Badge variant="outline" className="ml-auto text-xs">
                            {sub.diasCredito <= 15 ? "Contado" : sub.diasCredito <= 30 ? "Crédito 30" : `Crédito ${sub.diasCredito}`}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Final Summary Card */}
          <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-8">
                  <div>
                    <p className="text-sm text-muted-foreground">Cliente</p>
                    <p className="font-bold text-lg">{fiscalData.razonSocial}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">RFC</p>
                    <p className="font-mono font-semibold">{fiscalData.rfc}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Destinos</p>
                    <p className="font-bold text-primary text-lg">{subClientes.length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Tarifas Asignadas</p>
                    <p className="font-bold text-emerald-600 text-lg">
                      {subClientes.filter(s => s.tarifaPactada > 0).length}
                    </p>
                  </div>
                </div>
                {fiscalData.contratoUrl && (
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                    <FileText className="h-3 w-3 mr-1" />
                    Contrato
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setStep(2)}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Anterior
            </Button>
            <Button onClick={handleSave} className="bg-action hover:bg-action-hover text-action-foreground">
              <Check className="h-4 w-4 mr-2" />
              {isEditMode ? "Actualizar Cliente" : "Guardar Cliente"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
