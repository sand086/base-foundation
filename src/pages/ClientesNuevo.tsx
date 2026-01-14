import { useState, useEffect } from "react";
import { Users, Plus, Trash2, Upload, ArrowLeft, Check, MapPin, Building2, Phone, Clock, DollarSign, FileText, Paperclip, FileCheck, Route, Truck, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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

// Interface for authorized route tariff
interface TarifaAutorizada {
  id: string;
  nombreRuta: string;        // Ej: "Veracruz - CDMX (Vía Xalapa)"
  tipoUnidad: 'sencillo' | 'full' | 'rabon'; // El costo cambia drásticamente por esto
  tarifaBase: number;        // El precio del flete pactado
  costoCasetas?: number;     // (Opcional) Referencia del costo de casetas para esa ruta
  moneda: 'MXN' | 'USD';
  vigencia: string;          // Fecha hasta la cual se respeta este precio
}

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
  // Step 3: Commercial conditions
  diasCredito: number;
  requiereContrato: boolean;
  convenioEspecial: boolean;
  contratoAdjunto?: string;
  // Multiple tariffs per route/unit
  tarifas: TarifaAutorizada[];
}

const emptyTarifa: TarifaAutorizada = {
  id: "",
  nombreRuta: "",
  tipoUnidad: "sencillo",
  tarifaBase: 0,
  costoCasetas: 0,
  moneda: "MXN",
  vigencia: "",
};

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
  diasCredito: 30,
  requiereContrato: false,
  convenioEspecial: false,
  contratoAdjunto: "",
  tarifas: [],
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
          diasCredito: (sub as any).diasCredito || 30,
          requiereContrato: (sub as any).requiereContrato || false,
          convenioEspecial: (sub as any).convenioEspecial || false,
          contratoAdjunto: (sub as any).contratoAdjunto || "",
          tarifas: (sub as any).tarifas || [],
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

  const updateSubCliente = (index: number, field: keyof SubClienteForm, value: any) => {
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

  // Tarifa management functions
  const addTarifa = (subClienteIndex: number) => {
    const updated = [...subClientes];
    const newTarifa: TarifaAutorizada = {
      ...emptyTarifa,
      id: `TAR-${Date.now()}`,
      nombreRuta: "",
    };
    updated[subClienteIndex] = {
      ...updated[subClienteIndex],
      tarifas: [...updated[subClienteIndex].tarifas, newTarifa],
    };
    setSubClientes(updated);
  };

  const updateTarifa = (subClienteIndex: number, tarifaIndex: number, field: keyof TarifaAutorizada, value: any) => {
    const updated = [...subClientes];
    const tarifas = [...updated[subClienteIndex].tarifas];
    tarifas[tarifaIndex] = { ...tarifas[tarifaIndex], [field]: value };
    updated[subClienteIndex] = { ...updated[subClienteIndex], tarifas };
    setSubClientes(updated);
  };

  const removeTarifa = (subClienteIndex: number, tarifaIndex: number) => {
    const updated = [...subClientes];
    updated[subClienteIndex] = {
      ...updated[subClienteIndex],
      tarifas: updated[subClienteIndex].tarifas.filter((_, i) => i !== tarifaIndex),
    };
    setSubClientes(updated);
    toast.success("Tarifa eliminada");
  };

  // Validate tariff before saving
  const validateTarifas = (): boolean => {
    for (const sub of subClientes) {
      for (const tarifa of sub.tarifas) {
        if (!tarifa.nombreRuta || tarifa.tarifaBase <= 0) {
          toast.error("Tarifa incompleta", { 
            description: `En "${sub.nombre}": Ruta y Monto son obligatorios` 
          });
          return false;
        }
      }
    }
    return true;
  };

  // Get unit type badge with appropriate styling
  const getUnidadBadge = (tipo: string) => {
    switch (tipo) {
      case 'sencillo':
        return <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-[10px]">🚛 Sencillo</Badge>;
      case 'full':
        return <Badge className="bg-purple-100 text-purple-700 border-purple-200 text-[10px]">🚚 Full</Badge>;
      case 'rabon':
        return <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-[10px]">📦 Rabón</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px]">{tipo}</Badge>;
    }
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

    // Validate all tariffs have required fields
    if (!validateTarifas()) {
      return;
    }

    // Count total tariffs assigned
    const totalTarifas = subClientes.reduce((acc, sub) => acc + sub.tarifas.length, 0);

    toast.success(isEditMode ? "Cliente actualizado exitosamente" : "Cliente guardado exitosamente", {
      description: `${fiscalData.razonSocial} con ${subClientes.length} destino(s) y ${totalTarifas} tarifa(s) configuradas`,
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

  const getTipoUnidadLabel = (tipo: string) => {
    switch (tipo) {
      case 'sencillo': return 'Sencillo';
      case 'full': return 'Full';
      case 'rabon': return 'Rabón';
      default: return tipo;
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
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

      {/* Step 3: Tarifas y Convenios - Enhanced with Multiple Tariffs per Route/Unit */}
      {step === 3 && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                Tarifas y Convenios Comerciales
              </CardTitle>
              <CardDescription>
                Configura las condiciones comerciales y tarifas por ruta/unidad para cada destino de "{fiscalData.razonSocial}"
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
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  {subClientes.map((sub, idx) => (
                    <Card 
                      key={sub.id} 
                      className={cn(
                        "overflow-hidden transition-all duration-200 hover:shadow-md",
                        sub.tarifas.length > 0 
                          ? "border-emerald-300 bg-gradient-to-br from-emerald-50/50 to-white shadow-sm" 
                          : "border-border bg-card hover:border-primary/40"
                      )}
                    >
                      {/* Card Header with Destination Info */}
                      <CardHeader className="pb-3 bg-muted/30 border-b">
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm shadow-sm",
                            sub.tarifas.length > 0 
                              ? "bg-emerald-500 text-white" 
                              : "bg-primary/10 text-primary"
                          )}>
                            {idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-base truncate">{sub.nombre}</CardTitle>
                            <CardDescription className="flex items-center gap-1 mt-0.5">
                              <MapPin className="h-3 w-3" />
                              {sub.ciudad}, {sub.estado}
                            </CardDescription>
                          </div>
                          {sub.tarifas.length > 0 && (
                            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200" variant="outline">
                              <FileCheck className="h-3 w-3 mr-1" />
                              {sub.tarifas.length} tarifa(s)
                            </Badge>
                          )}
                        </div>
                      </CardHeader>

                      <CardContent className="pt-4 space-y-5">
                        {/* Section A: Commercial Conditions */}
                        <div className="space-y-4">
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                            <Building2 className="h-3.5 w-3.5" />
                            Condiciones Comerciales
                          </h4>
                          
                          <div className="grid grid-cols-2 gap-3">
                            {/* Credit Days */}
                            <div className="space-y-1.5">
                              <Label className="text-xs">Días de Crédito</Label>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  min="0"
                                  max="120"
                                  value={sub.diasCredito}
                                  onChange={(e) => updateSubCliente(idx, 'diasCredito', parseInt(e.target.value) || 0)}
                                  className="w-20 font-mono text-center h-9"
                                />
                                <Badge 
                                  variant="outline" 
                                  className={cn(
                                    "text-[10px] shrink-0",
                                    sub.diasCredito <= 15 
                                      ? "bg-blue-50 text-blue-700 border-blue-200" 
                                      : sub.diasCredito <= 30 
                                        ? "bg-amber-50 text-amber-700 border-amber-200"
                                        : "bg-rose-50 text-rose-700 border-rose-200"
                                  )}
                                >
                                  {sub.diasCredito <= 15 ? "Contado" : `Crédito ${sub.diasCredito}d`}
                                </Badge>
                              </div>
                            </div>

                            {/* Attach Contract Button */}
                            <div className="space-y-1.5">
                              <Label className="text-xs">Contrato/Convenio</Label>
                              <Button 
                                variant="outline" 
                                size="sm"
                                className={cn(
                                  "w-full h-9 text-xs gap-1.5",
                                  sub.contratoAdjunto && "border-emerald-300 text-emerald-700 bg-emerald-50"
                                )}
                                onClick={() => {
                                  updateSubCliente(idx, 'contratoAdjunto', 'contrato-adjunto.pdf');
                                  toast.success("Archivo adjunto", { description: `Contrato adjuntado a ${sub.nombre}` });
                                }}
                              >
                                <Paperclip className="h-3.5 w-3.5" />
                                {sub.contratoAdjunto ? "✓ PDF Adjunto" : "Adjuntar PDF"}
                              </Button>
                            </div>
                          </div>

                          {/* Switches Row */}
                          <div className="flex items-center gap-6 pt-1">
                            <div className="flex items-center gap-2">
                              <Switch
                                id={`contrato-${sub.id}`}
                                checked={sub.requiereContrato}
                                onCheckedChange={(checked) => updateSubCliente(idx, 'requiereContrato', checked)}
                              />
                              <Label htmlFor={`contrato-${sub.id}`} className="text-xs cursor-pointer">
                                Requiere Contrato
                              </Label>
                            </div>
                            <div className="flex items-center gap-2">
                              <Switch
                                id={`convenio-${sub.id}`}
                                checked={sub.convenioEspecial}
                                onCheckedChange={(checked) => updateSubCliente(idx, 'convenioEspecial', checked)}
                              />
                              <Label htmlFor={`convenio-${sub.id}`} className="text-xs cursor-pointer">
                                Convenio Especial
                              </Label>
                            </div>
                          </div>
                        </div>

                        <Separator />

                        {/* Section B: Routes and Authorized Tariffs */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                              <Route className="h-3.5 w-3.5" />
                              Rutas y Tarifas Autorizadas
                            </h4>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs gap-1 text-primary hover:text-primary"
                              onClick={() => addTarifa(idx)}
                            >
                              <Plus className="h-3.5 w-3.5" />
                              Agregar Ruta/Tarifa
                            </Button>
                          </div>

                          {sub.tarifas.length === 0 ? (
                            <div className="text-center py-6 border-2 border-dashed rounded-lg bg-muted/10">
                              <Route className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                              <p className="text-xs text-muted-foreground">
                                Sin tarifas configuradas
                              </p>
                              <Button
                                variant="link"
                                size="sm"
                                className="text-xs mt-1 h-auto p-0"
                                onClick={() => addTarifa(idx)}
                              >
                                + Agregar primera tarifa
                              </Button>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {/* Table Header */}
                              <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-muted/50 rounded-t-lg text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                                <div className="col-span-3">Ruta</div>
                                <div className="col-span-2">Unidad</div>
                                <div className="col-span-2">Tarifa Base</div>
                                <div className="col-span-2">Casetas (Est.)</div>
                                <div className="col-span-2">Vigencia</div>
                                <div className="col-span-1"></div>
                              </div>
                              
                              {/* Tariff Rows */}
                              {sub.tarifas.map((tarifa, tIdx) => (
                                <div 
                                  key={tarifa.id} 
                                  className="grid grid-cols-12 gap-2 px-3 py-2 border rounded-lg bg-background/50 items-center group hover:border-primary/30 transition-colors"
                                >
                                  {/* Route Name */}
                                  <div className="col-span-3">
                                    <Input
                                      placeholder="Ruta Bajío - Vía Corta"
                                      value={tarifa.nombreRuta}
                                      onChange={(e) => updateTarifa(idx, tIdx, 'nombreRuta', e.target.value)}
                                      className={cn(
                                        "h-8 text-xs",
                                        !tarifa.nombreRuta && "border-amber-300 bg-amber-50/50"
                                      )}
                                    />
                                  </div>
                                  
                                  {/* Unit Type */}
                                  <div className="col-span-2">
                                    <Select
                                      value={tarifa.tipoUnidad}
                                      onValueChange={(value) => updateTarifa(idx, tIdx, 'tipoUnidad', value)}
                                    >
                                      <SelectTrigger className="h-8 text-xs">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent className="bg-popover border shadow-lg z-50">
                                        <SelectItem value="sencillo">
                                          <span className="flex items-center gap-1">🚛 Sencillo</span>
                                        </SelectItem>
                                        <SelectItem value="full">
                                          <span className="flex items-center gap-1">🚚 Full</span>
                                        </SelectItem>
                                        <SelectItem value="rabon">
                                          <span className="flex items-center gap-1">📦 Rabón</span>
                                        </SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  
                                  {/* Base Tariff - Prominent */}
                                  <div className="col-span-2">
                                    <div className="relative">
                                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">$</span>
                                      <Input
                                        type="number"
                                        min="0"
                                        step="100"
                                        placeholder="0"
                                        value={tarifa.tarifaBase || ""}
                                        onChange={(e) => updateTarifa(idx, tIdx, 'tarifaBase', parseFloat(e.target.value) || 0)}
                                        className={cn(
                                          "h-8 text-xs pl-5 font-mono font-semibold",
                                          !tarifa.tarifaBase && "border-amber-300 bg-amber-50/50"
                                        )}
                                      />
                                    </div>
                                  </div>
                                  
                                  {/* Toll Costs - Informative/Gray */}
                                  <div className="col-span-2">
                                    <div className="relative">
                                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">$</span>
                                      <Input
                                        type="number"
                                        min="0"
                                        step="50"
                                        placeholder="0"
                                        value={tarifa.costoCasetas || ""}
                                        onChange={(e) => updateTarifa(idx, tIdx, 'costoCasetas', parseFloat(e.target.value) || 0)}
                                        className="h-8 text-xs pl-5 font-mono bg-muted/30 text-muted-foreground"
                                      />
                                    </div>
                                  </div>
                                  
                                  {/* Validity Date */}
                                  <div className="col-span-2">
                                    <Input
                                      type="date"
                                      value={tarifa.vigencia}
                                      onChange={(e) => updateTarifa(idx, tIdx, 'vigencia', e.target.value)}
                                      className="h-8 text-xs"
                                    />
                                  </div>
                                  
                                  {/* Delete Action */}
                                  <div className="col-span-1 flex justify-center">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
                                      onClick={() => removeTarifa(idx, tIdx)}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                              
                              {/* Add New Tariff Row */}
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full h-8 text-xs gap-1 border-dashed hover:border-primary hover:bg-primary/5"
                                onClick={() => addTarifa(idx)}
                              >
                                <Plus className="h-3.5 w-3.5" />
                                Agregar Tarifa
                              </Button>
                              
                              {/* Saved Tariffs Summary */}
                              {sub.tarifas.length > 0 && (
                                <div className="pt-3 border-t mt-3">
                                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                    Resumen de Tarifas Configuradas
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    {sub.tarifas.filter(t => t.nombreRuta && t.tarifaBase > 0).map((tarifa) => (
                                      <div 
                                        key={tarifa.id}
                                        className="flex items-center gap-2 px-2 py-1 rounded-lg bg-muted/50 border"
                                      >
                                        <span className="text-xs truncate max-w-[120px]">{tarifa.nombreRuta}</span>
                                        {getUnidadBadge(tarifa.tipoUnidad)}
                                        <span className="font-mono font-bold text-xs text-primary">
                                          ${tarifa.tarifaBase.toLocaleString()} {tarifa.moneda}
                                        </span>
                                        {tarifa.costoCasetas ? (
                                          <span className="text-[10px] text-muted-foreground">
                                            (+${tarifa.costoCasetas.toLocaleString()} casetas)
                                          </span>
                                        ) : null}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Final Summary Card */}
          <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="py-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-8 flex-wrap">
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
                    <p className="text-sm text-muted-foreground">Total Tarifas</p>
                    <p className="font-bold text-emerald-600 text-lg">
                      {subClientes.reduce((acc, sub) => acc + sub.tarifas.length, 0)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {fiscalData.contratoUrl && (
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                      <FileText className="h-3 w-3 mr-1" />
                      Contrato General
                    </Badge>
                  )}
                  {subClientes.some(s => s.convenioEspecial) && (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      <FileCheck className="h-3 w-3 mr-1" />
                      Convenios Especiales
                    </Badge>
                  )}
                </div>
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
