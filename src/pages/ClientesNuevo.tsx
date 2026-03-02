// src/pages/clients/ClientsNew.tsx
import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import {
  Users,
  Plus,
  Trash2,
  ArrowLeft,
  Check,
  MapPin,
  ArrowRight,
  Building2,
  Phone,
  Clock,
  DollarSign,
  Paperclip,
  FileCheck,
  Route,
  Calendar,
  Loader2,
  AlertTriangle,
  Search,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

import {
  DataTable,
  DataTableHeader,
  DataTableBody,
  DataTableRow,
  DataTableHead,
  DataTableCell,
} from "@/components/ui/data-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { useTiposUnidad } from "@/hooks/useTiposUnidad";
import { useClients } from "@/hooks/useClients";

import { DocumentUploadManager } from "@/features/flota/DocumentUploadManager";

import { clientService } from "@/services/clientService";
import type { Client, RateTemplate } from "@/types/api.types";
import { tollService } from "@/services/tollService";

/** =========================
 * Types / Interfaces del Form
 * ========================= */

//  Tarifa autorizada (con nuevos campos)
interface TarifaAutorizada {
  id: string;
  rate_template_id?: number | null; // ligar a la ruta real
  nombreRuta: string;
  tipoUnidad: string;
  tarifaBase: number;
  costoCasetas: number;

  //  ahora se aplican desde globales del paso 3 (se guardan al backend)
  iva_porcentaje: number;
  retencion_porcentaje: number;

  //  nuevo: km para rentabilidad
  distancia_km?: number;

  moneda: "MXN" | "USD";
  vigencia: string;
}

interface FiscalDataForm {
  razonSocial: string;
  rfc: string;
  regimenFiscal: string;
  usoCFDI: string;
  codigoPostalFiscal: string;
  direccionFiscal: string;
  contactoPrincipal: string;
  telefono: string;
  email: string;
  contratoUrl: string;
  dias_credito: number;

  constancia_fiscal_url?: string;
  acta_constitutiva_url?: string;
  comprobante_domicilio_url?: string;
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
  horarioCita: string;
  diasCredito: number;
  requiereContrato: boolean;
  convenioEspecial: boolean;
  contratoAdjunto?: string;
  tarifas: TarifaAutorizada[];
}

interface DocumentosObligatorios {
  constanciaFiscal: boolean;
  actaConstitutiva: boolean;
  comprobanteDomicilio: boolean;
}

/** =========================
 * Constantes
 * ========================= */

const emptyTarifa: TarifaAutorizada = {
  id: "",
  rate_template_id: null,
  nombreRuta: "",
  tipoUnidad: "sencillo",
  tarifaBase: 0,
  costoCasetas: 0,
  iva_porcentaje: 16,
  retencion_porcentaje: 4,
  distancia_km: 0,
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
  horarioCita: "",
  diasCredito: 30,
  requiereContrato: false,
  convenioEspecial: false,
  contratoAdjunto: "",
  tarifas: [],
};

const opcionesDiasCredito = [
  {
    value: 0,
    label: "Contado",
    color: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  {
    value: 15,
    label: "15 días",
    color: "bg-blue-100 text-blue-700 border-blue-200",
  },
  {
    value: 30,
    label: "30 días",
    color: "bg-amber-100 text-amber-700 border-amber-200",
  },
];

const estadosMexico = [
  "Aguascalientes",
  "Baja California",
  "Baja California Sur",
  "Campeche",
  "Chiapas",
  "Chihuahua",
  "Ciudad de México",
  "Coahuila",
  "Colima",
  "Durango",
  "Estado de México",
  "Guanajuato",
  "Guerrero",
  "Hidalgo",
  "Jalisco",
  "Michoacán",
  "Morelos",
  "Nayarit",
  "Nuevo León",
  "Oaxaca",
  "Puebla",
  "Querétaro",
  "Quintana Roo",
  "San Luis Potosí",
  "Sinaloa",
  "Sonora",
  "Tabasco",
  "Tamaulipas",
  "Tlaxcala",
  "Veracruz",
  "Yucatán",
  "Zacatecas",
];

const safeToInt = (value: string): number => {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : 0;
};

const todayISO = () => new Date().toISOString().split("T")[0];

/**
 *  Totales usando los porcentajes del objeto tarifa (que inyectamos desde globales)
 * Nota: acá NO “hardcodeamos” 16/4: respetamos tarifa.iva_porcentaje / retencion_porcentaje
 */
const calcularTotalesTarifa = (tarifa: TarifaAutorizada) => {
  const base = Number(tarifa.tarifaBase || 0);
  const casetas = Number(tarifa.costoCasetas || 0);
  const subtotal = base + casetas;

  const ivaPct = Number(tarifa.iva_porcentaje ?? 16) / 100;
  const retPct = Number(tarifa.retencion_porcentaje ?? 4) / 100;

  const iva = subtotal * ivaPct;
  const ret = subtotal * retPct;
  const total = subtotal + iva - ret;

  return { subtotal, iva, ret, total };
};

/** =========================
 * Componente
 * ========================= */

export default function ClientsNew() {
  const navigate = useNavigate();
  const { clientId } = useParams();
  const isEditMode = !!clientId;

  const {
    tiposActivos,
    getTipoLabel,
    getTipoIcono,
    loading: loadingTipos,
  } = useTiposUnidad();

  const [step, setStep] = useState(1);

  // READ
  const [loadingData, setLoadingData] = useState(false);
  const { clients, isLoading: loadingClients } = useClients();

  //  NUEVO: % globales (Paso 3)
  const [globalIVA, setGlobalIVA] = useState<number>(16);
  const [globalRetencion, setGlobalRetencion] = useState<number>(4);

  const [fiscalData, setFiscalData] = useState<FiscalDataForm>({
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
    constancia_fiscal_url: "",
    acta_constitutiva_url: "",
    comprobante_domicilio_url: "",
    dias_credito: 0,
  });

  const [documentos, setDocumentos] = useState<DocumentosObligatorios>({
    constanciaFiscal: false,
    actaConstitutiva: false,
    comprobanteDomicilio: false,
  });

  const [subClientes, setSubClientes] = useState<SubClienteForm[]>([]);
  const [editingSubCliente, setEditingSubCliente] =
    useState<SubClienteForm | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [rutasDisponibles, setRutasDisponibles] = useState<RateTemplate[]>([]);
  const [isRoutePickerOpen, setIsRoutePickerOpen] = useState(false);
  const [activePickerIndex, setActivePickerIndex] = useState<{
    subIdx: number;
    tarIdx: number;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [rutasFiltradas, setRutasFiltradas] = useState<RateTemplate[]>([]);

  /** =========================
   * Validaciones
   * ========================= */

  const validateRFC = (rfc: string): boolean =>
    rfc.length >= 12 && rfc.length <= 13;

  const validateCodigoPostal = (cp: string): boolean => /^\d{5}$/.test(cp);
  const validateTarifas = (): boolean => {
    for (const sub of subClientes) {
      for (const tarifa of sub.tarifas) {
        // 1. Validar que la ruta NO esté vacía
        if (!tarifa.nombreRuta || tarifa.nombreRuta.trim() === "") {
          toast.error("Ruta no seleccionada", {
            description: `El destino "${sub.nombre}" tiene una fila sin ruta del catálogo.`,
          });
          return false;
        }

        // 2. Validar que el monto sea un número válido (aunque sea 0)
        if (typeof tarifa.tarifaBase !== "number" || isNaN(tarifa.tarifaBase)) {
          toast.error("Monto inválido", {
            description: `La ruta ${tarifa.nombreRuta} necesita un valor numérico.`,
          });
          return false;
        }
      }
    }
    return true;
  };

  const calcularInfoTarifa = (tarifa: TarifaAutorizada) => {
    const base = Number(tarifa.tarifaBase || 0);
    const casetas = Number(tarifa.costoCasetas || 0);
    const subtotal = base + casetas;
    const iva = subtotal * (globalIVA / 100);
    const ret = subtotal * (globalRetencion / 100);
    const total = subtotal + iva - ret;
    const rentabilidad = tarifa.distancia_km ? base / tarifa.distancia_km : 0;

    return { subtotal, iva, ret, total, rentabilidad };
  };

  const handleSearchRoutes = async (term: string) => {
    setSearchQuery(term);
    try {
      // Llamada al backend con el filtro de búsqueda
      const data = await tollService.getTemplates(term);
      setRutasFiltradas(data ?? []);
    } catch (e) {
      console.error("Error buscando rutas:", e);
    }
  };
  /** =========================
   * Cargar datos (READ)
   * ========================= */

  useEffect(() => {
    const loadRutas = async () => {
      try {
        const data = await tollService.getTemplates();
        setRutasDisponibles(data ?? []);
      } catch (e) {
        console.error(e);
        toast.error("No se pudieron cargar las rutas");
      }
    };
    void loadRutas();
  }, []);

  useEffect(() => {
    if (isRoutePickerOpen) {
      // Si el modal se abre, buscamos con vacío para traer las primeras 50 por default
      handleSearchRoutes("");
    }
  }, [isRoutePickerOpen]);

  useEffect(() => {
    const loadClientData = async () => {
      if (!clientId) return;

      const id = parseInt(clientId);
      if (isNaN(id)) return;

      setLoadingData(true);
      try {
        const data = await clientService.getClient(id);

        setFiscalData({
          razonSocial: data.razon_social,
          rfc: data.rfc,
          regimenFiscal: data.regimen_fiscal || "",
          usoCFDI: data.uso_cfdi || "",
          codigoPostalFiscal: data.codigo_postal_fiscal || "",
          direccionFiscal: data.direccion_fiscal || "",
          contactoPrincipal: data.contacto_principal || "",
          telefono: data.telefono || "",
          email: data.email || "",
          contratoUrl: data.contrato_url || "",
          dias_credito: data.dias_credito || 0,
          constancia_fiscal_url: (data as any).constancia_fiscal_url || "",
          acta_constitutiva_url: (data as any).acta_constitutiva_url || "",
          comprobante_domicilio_url:
            (data as any).comprobante_domicilio_url || "",
        });

        // sub_clients + tariffs
        const mappedSubClients: SubClienteForm[] = (data.sub_clients || []).map(
          (sub: any) => ({
            id: sub.id.toString(),
            nombre: sub.nombre,
            alias: sub.alias || "",
            direccion: sub.direccion,
            ciudad: sub.ciudad,
            estado: sub.estado,
            codigoPostal: sub.codigo_postal || "",
            tipoOperacion: sub.tipo_operacion,
            contacto: sub.contacto || "",
            telefono: sub.telefono || "",
            horarioRecepcion: sub.horario_recepcion || "",
            horarioCita: sub.horario_cita || "", // si existe, si no queda ""
            diasCredito: sub.dias_credito || "0",
            requiereContrato: Boolean(sub.requiere_contrato),
            convenioEspecial: Boolean(sub.convenio_especial),
            contratoAdjunto: sub.contrato_adjunto || "",
            tarifas: (sub.tariffs || []).map((t: any) => ({
              id: t.id.toString(),
              rate_template_id: t.rate_template_id ?? null,
              nombreRuta: t.nombre_ruta,
              tipoUnidad: t.tipo_unidad,
              tarifaBase: Number(t.tarifa_base || 0),
              costoCasetas: Number(t.costo_casetas || 0),
              distancia_km: Number(t.distancia_km || 0),
              iva_porcentaje: Number(t.iva_porcentaje ?? 16),
              retencion_porcentaje: Number(t.retencion_porcentaje ?? 4),
              moneda: (t.moneda as "MXN" | "USD") ?? "MXN",
              vigencia: t.vigencia || "",
            })),
          }),
        );

        setSubClientes(mappedSubClients);

        //  Inicializamos globales tomando el primer tariff (si existe)
        const firstTar = mappedSubClients.flatMap((s) => s.tarifas)[0];
        if (firstTar) {
          setGlobalIVA(Number(firstTar.iva_porcentaje ?? 16));
          setGlobalRetencion(Number(firstTar.retencion_porcentaje ?? 4));
        }

        toast.info(`Cliente cargado: ${data.razon_social}`);
      } catch (error) {
        console.error("Error cargando cliente:", error);
        toast.error("Error al cargar los datos del cliente");
        navigate("/clients");
      } finally {
        setLoadingData(false);
      }
    };

    void loadClientData();
  }, [clientId, navigate]);

  /** =========================
   * CRUD SubClientes (local)
   * ========================= */

  const addSubCliente = () => {
    const newSub: SubClienteForm = {
      ...emptySubCliente,
      id: `SUB-${Date.now()}`,
    };
    setSubClientes((prev) => [...prev, newSub]);
    setEditingSubCliente(newSub);
    setEditingIndex(subClientes.length);
  };

  const updateSubCliente = (
    index: number,
    field: keyof SubClienteForm,
    value: any,
  ) => {
    setSubClientes((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });

    if (editingIndex === index) {
      setEditingSubCliente((prev) =>
        prev ? { ...prev, [field]: value } : prev,
      );
    }
  };

  const removeSubCliente = (index: number) => {
    setSubClientes((prev) => prev.filter((_, i) => i !== index));
    if (editingIndex === index) {
      setEditingSubCliente(null);
      setEditingIndex(null);
    }
    toast.success("Subcliente eliminado");
  };

  /** =========================
   * CRUD Tarifas (local)
   * ========================= */

  const addTarifa = (subClienteIndex: number) => {
    setSubClientes((prev) => {
      const updated = [...prev];
      const newTarifa: TarifaAutorizada = {
        ...emptyTarifa,
        id: `TAR-${Date.now()}`,
        iva_porcentaje: globalIVA,
        retencion_porcentaje: globalRetencion,
        vigencia: todayISO(),
      };

      updated[subClienteIndex] = {
        ...updated[subClienteIndex],
        tarifas: [...updated[subClienteIndex].tarifas, newTarifa],
      };
      return updated;
    });
  };

  const updateTarifa = (
    subClienteIndex: number,
    tarifaIndex: number,
    field: keyof TarifaAutorizada,
    value: any,
  ) => {
    setSubClientes((prev) => {
      const updated = [...prev];
      const tarifas = [...updated[subClienteIndex].tarifas];
      tarifas[tarifaIndex] = { ...tarifas[tarifaIndex], [field]: value };
      updated[subClienteIndex] = { ...updated[subClienteIndex], tarifas };
      return updated;
    });
  };

  const removeTarifa = (subClienteIndex: number, tarifaIndex: number) => {
    setSubClientes((prev) => {
      const updated = [...prev];
      updated[subClienteIndex] = {
        ...updated[subClienteIndex],
        tarifas: updated[subClienteIndex].tarifas.filter(
          (_, i) => i !== tarifaIndex,
        ),
      };
      return updated;
    });
    toast.success("Tarifa eliminada");
  };

  /** =========================
   * UI helpers
   * ========================= */

  const getOperationBadge = (tipo: string) => {
    switch (tipo?.toLowerCase()) {
      case "nacional":
        return <Badge className="bg-emerald-500 text-white">Nacional</Badge>;
      case "importación":
        return <Badge className="bg-blue-500 text-white">Importación</Badge>;
      case "exportación":
        return <Badge className="bg-amber-500 text-white">Exportación</Badge>;
      default:
        return <Badge variant="outline">Sin definir</Badge>;
    }
  };

  /** =========================
   * Guardar (CREATE/UPDATE)
   *  actualizaciones: distancia_km + globalIVA/globalRetención + vigencia default
   * ========================= */

  const handleSave = async () => {
    if (!fiscalData.razonSocial || !fiscalData.rfc) {
      toast.error("Complete los datos fiscales obligatorios");
      return;
    }
    if (!validateRFC(fiscalData.rfc)) {
      toast.error("RFC inválido");
      return;
    }
    if (!validateTarifas()) return;

    try {
      const payload: Partial<Client> = {
        razon_social: fiscalData.razonSocial,
        rfc: fiscalData.rfc,
        regimen_fiscal: fiscalData.regimenFiscal,
        uso_cfdi: fiscalData.usoCFDI,
        codigo_postal_fiscal: fiscalData.codigoPostalFiscal,
        direccion_fiscal: fiscalData.direccionFiscal,
        contacto_principal: fiscalData.contactoPrincipal,
        telefono: fiscalData.telefono,
        email: fiscalData.email.trim() === "" ? null : fiscalData.email,
        contrato_url: fiscalData.contratoUrl,
        estatus: "activo",
        dias_credito: Number(fiscalData.dias_credito || 0),
        // (si tu backend ya recibe URLs directas en client)
        constancia_fiscal_url: fiscalData.constancia_fiscal_url || null,
        acta_constitutiva_url: fiscalData.acta_constitutiva_url || null,
        comprobante_domicilio_url: fiscalData.comprobante_domicilio_url || null,

        sub_clients: subClientes.map((sub) => ({
          id: sub.id.startsWith("SUB-") ? 0 : safeToInt(sub.id),
          client_id: 0,
          nombre: sub.nombre,
          alias: sub.alias,
          direccion: sub.direccion,
          ciudad: sub.ciudad,
          estado: sub.estado,
          codigo_postal: sub.codigoPostal,
          tipo_operacion: sub.tipoOperacion,
          contacto: sub.contacto,
          telefono: sub.telefono,
          horario_recepcion: sub.horarioRecepcion,
          horario_cita: sub.horarioCita || null,
          dias_credito: Number(sub.diasCredito || 0),
          requiere_contrato: sub.requiereContrato,
          convenio_especial: sub.convenioEspecial,

          tariffs: sub.tarifas.map((t) => ({
            id: t.id.startsWith("TAR-") ? 0 : safeToInt(t.id),
            sub_client_id: 0,
            rate_template_id: t.rate_template_id ?? null,
            nombre_ruta: t.nombreRuta,
            tipo_unidad: t.tipoUnidad,
            tarifa_base: t.tarifaBase,
            costo_casetas: t.costoCasetas,

            //  NUEVO: km para rentabilidad
            distancia_km: Number(t.distancia_km || 0),

            //  NUEVO: % globales
            iva_porcentaje: Number(globalIVA),
            retencion_porcentaje: Number(globalRetencion),

            moneda: t.moneda,
            vigencia: t.vigencia?.trim() ? t.vigencia : todayISO(),
            estatus: "activa",
          })),
        })),
      };

      if (isEditMode && clientId) {
        await clientService.updateClient(parseInt(clientId), payload);
        toast.success("Cliente y Convenio guardados correctamente");
      } else {
        await clientService.createClient(payload);
        toast.success("Cliente creado con éxito");
      }

      navigate("/clients");
    } catch (error: any) {
      console.error("Error completo:", error);

      const detail = error.response?.data?.detail;
      let errorMessage = "Error al guardar cliente";

      if (Array.isArray(detail)) {
        errorMessage = detail
          .map((err) => `${err.loc?.[err.loc.length - 1]}: ${err.msg}`)
          .join(", ");
      } else if (typeof detail === "string") {
        errorMessage = detail;
      }

      toast.error("Error de Validación", { description: errorMessage });
    }
  };

  /** =========================
   * Gating por pasos
   * ========================= */

  const canProceed =
    fiscalData.razonSocial && fiscalData.rfc && validateRFC(fiscalData.rfc);

  const canProceedStep2 =
    subClientes.length > 0 &&
    subClientes.every((s) => s.nombre && s.direccion && s.ciudad);

  /** =========================
   * Render loading
   * ========================= */

  if (loadingData) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Cargando datos del cliente...</p>
      </div>
    );
  }

  /** =========================
   * JSX
   * ========================= */

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/clients")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />{" "}
            {isEditMode ? "Editar Cliente" : "Alta de Cliente"}
          </h1>
          <p className="text-muted-foreground">
            Wizard de registro - Paso {step} de 3
          </p>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-4">
        <div
          className={`flex items-center gap-2 ${step >= 1 ? "text-primary" : "text-muted-foreground"}`}
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center font-medium ${
              step >= 1 ? "bg-primary text-primary-foreground" : "bg-muted"
            }`}
          >
            {step > 1 ? <Check className="h-4 w-4" /> : "1"}
          </div>
          <span className="font-medium hidden sm:block">Datos Fiscales</span>
        </div>

        <div className="flex-1 h-0.5 bg-border" />

        <div
          className={`flex items-center gap-2 ${step >= 2 ? "text-primary" : "text-muted-foreground"}`}
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center font-medium ${
              step >= 2 ? "bg-primary text-primary-foreground" : "bg-muted"
            }`}
          >
            {step > 2 ? <Check className="h-4 w-4" /> : "2"}
          </div>
          <span className="font-medium hidden sm:block">Destinos</span>
        </div>

        <div className="flex-1 h-0.5 bg-border" />

        <div
          className={`flex items-center gap-2 ${step >= 3 ? "text-primary" : "text-muted-foreground"}`}
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center font-medium ${
              step >= 3 ? "bg-primary text-primary-foreground" : "bg-muted"
            }`}
          >
            3
          </div>
          <span className="font-medium hidden sm:block">
            Tarifas y Convenios
          </span>
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
            <CardDescription>
              Información fiscal del cliente para facturación electrónica
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Razón Social *</Label>
                <Input
                  placeholder="Empresa S.A. de C.V."
                  value={fiscalData.razonSocial}
                  onChange={(e) =>
                    setFiscalData({
                      ...fiscalData,
                      razonSocial: e.target.value,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>RFC * (12-13 caracteres)</Label>
                <Input
                  placeholder="XXX000000XXX"
                  value={fiscalData.rfc}
                  onChange={(e) =>
                    setFiscalData({
                      ...fiscalData,
                      rfc: e.target.value.toUpperCase(),
                    })
                  }
                  maxLength={13}
                  className={cn(
                    "font-mono",
                    fiscalData.rfc &&
                      !validateRFC(fiscalData.rfc) &&
                      "border-destructive focus-visible:ring-destructive",
                  )}
                />
                {fiscalData.rfc && !validateRFC(fiscalData.rfc) && (
                  <p className="text-xs text-destructive">
                    RFC debe tener 12-13 caracteres
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Régimen Fiscal *</Label>
                <Select
                  value={fiscalData.regimenFiscal}
                  onValueChange={(value) =>
                    setFiscalData({ ...fiscalData, regimenFiscal: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border shadow-lg z-50">
                    <SelectItem value="601">601 - General de Ley</SelectItem>
                    <SelectItem value="603">
                      603 - Personas Morales sin Fines de Lucro
                    </SelectItem>
                    <SelectItem value="612">
                      612 - Personas Físicas con Actividades Empresariales
                    </SelectItem>
                    <SelectItem value="626">
                      626 - Régimen Simplificado de Confianza
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Uso de CFDI</Label>
                <Select
                  value={fiscalData.usoCFDI}
                  onValueChange={(value) =>
                    setFiscalData({ ...fiscalData, usoCFDI: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border shadow-lg z-50">
                    <SelectItem value="G03">G03 - Gastos en general</SelectItem>
                    <SelectItem value="P01">P01 - Por definir</SelectItem>
                    <SelectItem value="S01">
                      S01 - Sin efectos fiscales
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Código Postal Fiscal *</Label>
                <Input
                  placeholder="00000"
                  value={fiscalData.codigoPostalFiscal}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "").slice(0, 5);
                    setFiscalData({ ...fiscalData, codigoPostalFiscal: value });
                  }}
                  maxLength={5}
                  className={cn(
                    "font-mono",
                    fiscalData.codigoPostalFiscal &&
                      !validateCodigoPostal(fiscalData.codigoPostalFiscal) &&
                      "border-destructive",
                  )}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Dirección Fiscal</Label>
              <Input
                placeholder="Av. Ejemplo 123, Col. Centro, Ciudad, Estado, CP"
                value={fiscalData.direccionFiscal}
                onChange={(e) =>
                  setFiscalData({
                    ...fiscalData,
                    direccionFiscal: e.target.value,
                  })
                }
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Contacto Principal</Label>
                <Input
                  placeholder="Lic. Juan Pérez"
                  value={fiscalData.contactoPrincipal}
                  onChange={(e) =>
                    setFiscalData({
                      ...fiscalData,
                      contactoPrincipal: e.target.value,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input
                  placeholder="55 1234 5678"
                  value={fiscalData.telefono}
                  onChange={(e) =>
                    setFiscalData({ ...fiscalData, telefono: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="contacto@empresa.com"
                  value={fiscalData.email}
                  onChange={(e) =>
                    setFiscalData({ ...fiscalData, email: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Documentos Obligatorios */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2 border-b pb-2">
                <FileCheck className="h-4 w-4 text-primary" />
                Documentación del Cliente
              </h4>

              {!isEditMode ? (
                <div className="p-8 border-2 border-dashed rounded-xl bg-muted/30 text-center">
                  <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                  <p className="text-sm font-medium">
                    Guarda el cliente primero para habilitar la carga de
                    documentos.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <DocumentUploadManager
                    entityId={parseInt(clientId!)}
                    entityType="client"
                    docType="constancia_fiscal"
                    docLabel="Constancia de Situación Fiscal"
                    currentUrl={fiscalData.constancia_fiscal_url}
                    onUploadSuccess={(url) => {
                      setFiscalData((prev) => ({
                        ...prev,
                        constancia_fiscal_url: url,
                      }));
                      setDocumentos((prev) => ({
                        ...prev,
                        constanciaFiscal: true,
                      }));
                    }}
                  />

                  <DocumentUploadManager
                    entityId={parseInt(clientId!)}
                    entityType="client"
                    docType="acta_constitutiva"
                    docLabel="Acta Constitutiva"
                    currentUrl={fiscalData.acta_constitutiva_url}
                    onUploadSuccess={(url) => {
                      setFiscalData((prev) => ({
                        ...prev,
                        acta_constitutiva_url: url,
                      }));
                      setDocumentos((prev) => ({
                        ...prev,
                        actaConstitutiva: true,
                      }));
                    }}
                  />

                  <DocumentUploadManager
                    entityId={parseInt(clientId!)}
                    entityType="client"
                    docType="comprobante_domicilio"
                    docLabel="Comprobante Domicilio"
                    currentUrl={fiscalData.comprobante_domicilio_url}
                    onUploadSuccess={(url) => {
                      setFiscalData((prev) => ({
                        ...prev,
                        comprobante_domicilio_url: url,
                      }));
                      setDocumentos((prev) => ({
                        ...prev,
                        comprobanteDomicilio: true,
                      }));
                    }}
                  />
                </div>
              )}
            </div>

            {/* Documentación Adicional */}
            <div className="space-y-4 mt-8">
              <div className="flex items-center justify-between border-b pb-2">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Paperclip className="h-4 w-4 text-primary" />
                  Documentos Adicionales y Soporte
                </h4>
                <Badge variant="outline" className=" uppercase">
                  Expediente Libre
                </Badge>
              </div>

              {!isEditMode ? (
                <div className="p-6 border-2 border-dashed rounded-xl bg-muted/20 text-center">
                  <p className="text-xs text-muted-foreground">
                    El repositorio de documentos adicionales se activa después
                    del primer guardado.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <DocumentUploadManager
                    entityId={parseInt(clientId!)}
                    entityType="client"
                    docType="adicional"
                    docLabel="Repositorio de Archivos"
                    currentUrl={fiscalData.contratoUrl}
                    accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.csv,.txt,.doc,.docx"
                    onUploadSuccess={(url) => {
                      setFiscalData((prev) => ({ ...prev, contratoUrl: url }));
                      toast.success("Documento añadido a la lista");
                    }}
                  />

                  <Card className="bg-primary/5 border-primary/10">
                    <CardContent className="p-4 flex gap-3 items-start">
                      <AlertTriangle className="h-5 w-5 text-primary mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-xs font-bold uppercase">
                          Formatos Soportados
                        </p>
                        <p className=" text-muted-foreground leading-relaxed">
                          Puedes cargar contratos, anexos, tablas de precios o
                          identificaciones. Soporta: PDF, Imágenes, Excel
                          (XLSX/CSV) y Texto plano.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
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
                    Agrega las sucursales, plantas o ubicaciones de entrega del
                    cliente "{fiscalData.razonSocial}"
                  </CardDescription>
                </div>
                <Button
                  onClick={addSubCliente}
                  className="gap-2 bg-action hover:bg-action-hover text-action-foreground"
                >
                  <Plus className="h-4 w-4" /> Agregar Destino
                </Button>
              </div>
            </CardHeader>

            <CardContent>
              {subClientes.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-lg bg-muted/20">
                  <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <h3 className="font-semibold text-lg mb-1">
                    Sin subclientes registrados
                  </h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    Agrega ubicaciones de entrega como plantas, almacenes o
                    sucursales
                  </p>
                  <Button variant="outline" onClick={addSubCliente}>
                    <Plus className="h-4 w-4 mr-2" /> Agregar primer destino
                  </Button>
                </div>
              ) : (
                <Accordion
                  type="single"
                  collapsible
                  className="space-y-2"
                  value={
                    editingIndex !== null ? `sub-${editingIndex}` : undefined
                  }
                >
                  {subClientes.map((sub, idx) => (
                    <AccordionItem
                      key={sub.id}
                      value={`sub-${idx}`}
                      className={cn(
                        "border rounded-lg overflow-hidden transition-all",
                        editingIndex === idx ? "ring-2 ring-primary" : "",
                      )}
                    >
                      <AccordionTrigger className="px-4 py-3 hover:bg-muted/50 [&[data-state=open]]:bg-muted/50">
                        <div className="flex items-center gap-4 flex-1 text-left">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-sm">
                            {idx + 1}
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold">
                              {sub.nombre || (
                                <span className="text-muted-foreground italic">
                                  Nombre del destino...
                                </span>
                              )}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {sub.ciudad && sub.estado
                                ? `${sub.ciudad}, ${sub.estado}`
                                : "Sin ubicación"}
                            </p>
                          </div>
                          {sub.tipoOperacion &&
                            getOperationBadge(sub.tipoOperacion)}
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
                                onChange={(e) =>
                                  updateSubCliente(
                                    idx,
                                    "nombre",
                                    e.target.value,
                                  )
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Alias (corto)</Label>
                              <Input
                                placeholder="Ej: Planta Norte"
                                value={sub.alias}
                                onChange={(e) =>
                                  updateSubCliente(idx, "alias", e.target.value)
                                }
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>Dirección Completa *</Label>
                            <Input
                              placeholder="Av. Industrial 123, Parque Industrial..."
                              value={sub.direccion}
                              onChange={(e) =>
                                updateSubCliente(
                                  idx,
                                  "direccion",
                                  e.target.value,
                                )
                              }
                            />
                          </div>

                          <div className="grid grid-cols-4 gap-4">
                            <div className="space-y-2">
                              <Label>Ciudad *</Label>
                              <Input
                                placeholder="Monterrey"
                                value={sub.ciudad}
                                onChange={(e) =>
                                  updateSubCliente(
                                    idx,
                                    "ciudad",
                                    e.target.value,
                                  )
                                }
                              />
                            </div>

                            <div className="space-y-2">
                              <Label>Estado</Label>
                              <Select
                                value={sub.estado}
                                onValueChange={(value) =>
                                  updateSubCliente(idx, "estado", value)
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleccionar..." />
                                </SelectTrigger>
                                <SelectContent className="bg-popover border shadow-lg z-50 max-h-60">
                                  {estadosMexico.map((edo) => (
                                    <SelectItem key={edo} value={edo}>
                                      {edo}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label>Código Postal</Label>
                              <Input
                                placeholder="64000"
                                value={sub.codigoPostal}
                                onChange={(e) =>
                                  updateSubCliente(
                                    idx,
                                    "codigoPostal",
                                    e.target.value
                                      .replace(/\D/g, "")
                                      .slice(0, 5),
                                  )
                                }
                                maxLength={5}
                              />
                            </div>

                            <div className="space-y-2">
                              <Label>Tipo Operación</Label>
                              <Select
                                value={sub.tipoOperacion}
                                onValueChange={(value) =>
                                  updateSubCliente(idx, "tipoOperacion", value)
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleccionar..." />
                                </SelectTrigger>
                                <SelectContent className="bg-popover border shadow-lg z-50">
                                  <SelectItem value="nacional">
                                    Nacional
                                  </SelectItem>
                                  <SelectItem value="importación">
                                    Importación
                                  </SelectItem>
                                  <SelectItem value="exportación">
                                    Exportación
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="grid grid-cols-4 gap-4">
                            <div className="space-y-2">
                              <Label className="flex items-center gap-1">
                                <Users className="h-3 w-3" /> Contacto
                              </Label>
                              <Input
                                placeholder="Ing. Roberto Salinas"
                                value={sub.contacto}
                                onChange={(e) =>
                                  updateSubCliente(
                                    idx,
                                    "contacto",
                                    e.target.value,
                                  )
                                }
                              />
                            </div>

                            <div className="space-y-2">
                              <Label className="flex items-center gap-1">
                                <Phone className="h-3 w-3" /> Teléfono
                              </Label>
                              <Input
                                placeholder="81 5555 4444"
                                value={sub.telefono}
                                onChange={(e) =>
                                  updateSubCliente(
                                    idx,
                                    "telefono",
                                    e.target.value,
                                  )
                                }
                              />
                            </div>

                            <div className="space-y-2">
                              <Label className="flex items-center gap-1">
                                <Clock className="h-3 w-3" /> Horario Recepción
                              </Label>
                              <Input
                                placeholder="Lun-Vie 7:00-17:00"
                                value={sub.horarioRecepcion}
                                onChange={(e) =>
                                  updateSubCliente(
                                    idx,
                                    "horarioRecepcion",
                                    e.target.value,
                                  )
                                }
                              />
                            </div>

                            <div className="space-y-2">
                              <Label className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" /> Horario de Cita
                              </Label>
                              <Input
                                placeholder="Ej: 08:00-10:00"
                                value={sub.horarioCita}
                                onChange={(e) =>
                                  updateSubCliente(
                                    idx,
                                    "horarioCita",
                                    e.target.value,
                                  )
                                }
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

      {step === 3 && (
        <div className="space-y-6 animate-in fade-in duration-500">
          {/*  1. CONFIGURACIÓN GLOBAL: IVA, RETENCIÓN Y CRÉDITO */}
          <Card className="bg-slate-50 border-2 border-dashed border-slate-200">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                <div className="space-y-1.5">
                  <Label className=" font-black uppercase text-primary">
                    IVA Trasladado (%)
                  </Label>
                  <Input
                    type="number"
                    className="h-9 bg-white font-mono"
                    value={globalIVA}
                    onChange={(e) => setGlobalIVA(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className=" font-black uppercase text-rose-600">
                    Retención IVA (%)
                  </Label>
                  <Input
                    type="number"
                    className="h-9 bg-white font-mono"
                    value={globalRetencion}
                    onChange={(e) => setGlobalRetencion(Number(e.target.value))}
                  />
                </div>

                {/*  DÍAS DE CRÉDITO GENERAL */}
                <div className="space-y-1.5">
                  <Label className=" font-black uppercase text-slate-600">
                    Días de Crédito (General)
                  </Label>
                  <Select
                    // Convertimos el número a string para que el Select lo pueda pintar
                    value={String(fiscalData.dias_credito)}
                    onValueChange={(val) =>
                      setFiscalData((prev) => ({
                        ...prev,
                        dias_credito: parseInt(val, 10) || 0, // Lo guardamos como número real
                      }))
                    }
                  >
                    <SelectTrigger className="h-9 bg-white">
                      <SelectValue placeholder="Seleccionar crédito..." />
                    </SelectTrigger>
                    <SelectContent>
                      {opcionesDiasCredito.map((op) => (
                        <SelectItem key={op.value} value={String(op.value)}>
                          {op.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end">
                  <Badge
                    variant="outline"
                    className="bg-white border-slate-300 py-2"
                  >
                    <Clock className="h-3 w-3 mr-2 text-primary" />
                    <span className="text-[9px] font-bold uppercase">
                      Configuración de Cobro
                    </span>
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 2. LISTADO DE SUBCLIENTES */}
          {subClientes.map((sub, idx) => (
            <Card
              key={sub.id}
              className="shadow-sm border-slate-200 overflow-hidden"
            >
              <CardHeader className="py-3 bg-slate-100/50 border-b flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-slate-400" />{" "}
                  {sub.nombre || "Destino sin nombre"}
                </CardTitle>

                {/*  CRÉDITO POR SUBCLIENTE (Opcional si es diferente al general) */}
                <div className="flex items-center gap-2">
                  <Label className="text-[9px] uppercase font-bold text-slate-500">
                    Crédito Destino:
                  </Label>
                  <Select
                    value={String(sub.diasCredito)}
                    onValueChange={(v) =>
                      updateSubCliente(idx, "diasCredito", parseInt(v))
                    }
                  >
                    <SelectTrigger className="h-7 w-32  bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {opcionesDiasCredito.map((op) => (
                        <SelectItem key={op.value} value={String(op.value)}>
                          {op.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>

              <CardContent className="pt-4 space-y-3">
                {sub.tarifas.map((tarifa, tIdx) => {
                  const info = calcularInfoTarifa(tarifa);
                  return (
                    <div
                      key={tarifa.id}
                      className="grid grid-cols-12 gap-3 items-center border p-3 rounded-xl bg-white hover:border-primary/40 transition-all group"
                    >
                      {/* BUSCADOR DE RUTA SCT */}
                      <div className="col-span-3 space-y-1">
                        <Label className="text-[9px] font-bold uppercase text-muted-foreground">
                          Ruta del Catálogo
                        </Label>
                        <Button
                          variant="outline"
                          className="w-full h-8  justify-start bg-slate-50 border-slate-200 font-bold"
                          onClick={() => {
                            setActivePickerIndex({ subIdx: idx, tarIdx: tIdx });
                            setIsRoutePickerOpen(true);
                          }}
                        >
                          <Search className="h-3 w-3 mr-2 text-primary" />
                          {tarifa.nombreRuta || "SELECCIONAR RUTA..."}
                        </Button>
                      </div>

                      {/* 2. Unidad con recálculo automático */}
                      <div className="col-span-2 space-y-1">
                        <Label className="text-[9px] font-bold uppercase text-muted-foreground">
                          Unidad
                        </Label>
                        <Select
                          value={tarifa.tipoUnidad}
                          onValueChange={(nuevaUnidad) => {
                            // 1. Primero actualizamos el tipo de unidad
                            updateTarifa(idx, tIdx, "tipoUnidad", nuevaUnidad);

                            // 2. Si hay una ruta seleccionada, buscamos su precio para la nueva unidad
                            if (tarifa.rate_template_id) {
                              const rutaData = rutasDisponibles.find(
                                (r) => r.id === tarifa.rate_template_id,
                              );
                              if (rutaData) {
                                const nuevoCosto =
                                  nuevaUnidad === "full"
                                    ? rutaData.costo_total_full
                                    : rutaData.costo_total_sencillo;

                                updateTarifa(
                                  idx,
                                  tIdx,
                                  "costoCasetas",
                                  nuevoCosto,
                                );
                                toast.info(
                                  `Costo de casetas actualizado a ${nuevaUnidad}`,
                                );
                              }
                            }
                          }}
                        >
                          <SelectTrigger className="h-8 ">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="z-[200]">
                            {tiposActivos.map((t) => (
                              <SelectItem
                                key={t.id}
                                value={t.nombre.toLowerCase()}
                              >
                                {t.nombre}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="col-span-2 space-y-1">
                        <Label className="text-[9px] font-bold uppercase text-muted-foreground">
                          Flete Base ($)
                        </Label>
                        <Input
                          type="number"
                          value={tarifa.tarifaBase || ""}
                          onChange={(e) =>
                            updateTarifa(
                              idx,
                              tIdx,
                              "tarifaBase",
                              Number(e.target.value),
                            )
                          }
                          className="h-8 text-xs font-bold"
                        />
                      </div>

                      {/* INFO AUTOMÁTICA (Read-Only) */}
                      <div className="col-span-2 border-l border-r px-3 flex flex-col gap-1">
                        <div className="flex justify-between ">
                          <span className="text-muted-foreground font-medium">
                            Casetas:
                          </span>
                          <span className="font-bold text-blue-600">
                            ${tarifa.costoCasetas.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between ">
                          <span className="text-muted-foreground font-medium">
                            $/KM:
                          </span>
                          <Badge className="h-4 bg-blue-50 text-blue-600 border-none">
                            ${info.rentabilidad.toFixed(2)}
                          </Badge>
                        </div>
                      </div>

                      {/* TOTAL REAL */}
                      <div className="col-span-2 bg-emerald-50 p-2 rounded-lg border border-emerald-100 text-right">
                        <p className="text-[8px] font-bold text-emerald-600 uppercase">
                          A Facturar
                        </p>
                        <p className="text-sm font-black text-emerald-800">
                          $
                          {info.total.toLocaleString("es-MX", {
                            minimumFractionDigits: 2,
                          })}
                        </p>
                      </div>

                      <div className="col-span-1 flex justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => removeTarifa(idx, tIdx)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full border-dashed border-2 h-9 "
                  onClick={() => addTarifa(idx)}
                >
                  <Plus className="h-3 w-3 mr-1" /> AÑADIR OTRA RUTA
                </Button>
              </CardContent>
            </Card>
          ))}

          {/*  MODAL DE BÚSQUEDA CORREGIDO (CARGA INICIAL AUTOMÁTICA) */}
          <Dialog open={isRoutePickerOpen} onOpenChange={setIsRoutePickerOpen}>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col p-0 border-none shadow-2xl">
              <DialogHeader className="p-6 pb-2 bg-slate-900 text-white">
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  <Route className="h-6 w-6 text-primary" /> Catálogo SCT
                </DialogTitle>
                <div className="relative mt-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Buscar por origen o destino..."
                    value={searchQuery}
                    onChange={(e) => handleSearchRoutes(e.target.value)}
                    className="pl-10 h-11 bg-white/10 border-white/20 text-white placeholder:text-slate-400 focus:bg-white focus:text-slate-900"
                    autoFocus
                  />
                </div>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto px-6 py-4 bg-slate-50">
                <div className="border rounded-xl bg-white overflow-hidden shadow-sm">
                  <Table>
                    <TableHeader className="bg-slate-100/80">
                      <TableRow>
                        <TableHead className="font-bold uppercase">
                          Ruta Autorizada
                        </TableHead>
                        <TableHead className="text-right  font-bold uppercase">
                          Sencillo
                        </TableHead>
                        <TableHead className="text-right font-bold uppercase">
                          Full
                        </TableHead>
                        <TableHead className="text-right font-bold uppercase">
                          Acciones
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rutasFiltradas.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={4}
                            className="text-center py-20 text-slate-400 italic"
                          >
                            <div className="flex flex-col items-center gap-2 opacity-50">
                              <Loader2 className="h-8 w-8 animate-spin" />
                              <p>Cargando rutas...</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        rutasFiltradas.map((r) => {
                          //  CORRECCIÓN: Usamos 'clients' (el valor del hook) en lugar de 'Client' (el tipo)
                          const clienteNombre =
                            clients.find((c) => c.id === r.client_id)
                              ?.razon_social || "Ruta Libre";

                          return (
                            <TableRow
                              key={r.id}
                              className="cursor-pointer hover:bg-primary/5 transition-colors group"
                            >
                              <TableCell className="py-3">
                                <div className="flex flex-col gap-0.5">
                                  {/*  Nombre de la Ruta (Destacado en negrita y mayúsculas) */}
                                  <span className="font-black text-slate-900 text-sm uppercase tracking-tight">
                                    {r.origen}
                                  </span>

                                  {/*  Datos Complementarios (Información en miniatura abajo) */}
                                  <div className="flex flex-wrap items-center gap-x-2  text-muted-foreground font-medium">
                                    {/* <span className="text-primary/80 font-bold">
                                      {clienteNombre}
                                    </span> */}
                                    {r.destino && r.destino !== "N/A" && (
                                      <>
                                        <span className="text-slate-300">
                                          •
                                        </span>
                                        <span>Hacia: {r.destino}</span>
                                      </>
                                    )}
                                    <span className="text-slate-300">•</span>
                                    <span className="font-mono text-slate-500">
                                      {r.distancia_total_km} KM /{" "}
                                      {Math.floor(r.tiempo_total_minutos / 60)}h{" "}
                                      {r.tiempo_total_minutos % 60}m
                                    </span>
                                  </div>
                                </div>
                              </TableCell>

                              {/* Sencillo (6 Ejes) */}
                              <TableCell className="text-right font-mono text-xs font-bold text-blue-600 bg-blue-50/20">
                                $
                                {r.costo_total_sencillo.toLocaleString(
                                  "es-MX",
                                  { minimumFractionDigits: 2 },
                                )}
                              </TableCell>

                              {/* Full (9 Ejes) */}
                              <TableCell className="text-right font-mono text-xs font-bold text-emerald-600 bg-emerald-50/20">
                                $
                                {r.costo_total_full.toLocaleString("es-MX", {
                                  minimumFractionDigits: 2,
                                })}
                              </TableCell>

                              <TableCell className="text-right">
                                <Button
                                  size="sm"
                                  className="h-7  uppercase font-black shadow-sm"
                                  onClick={() => {
                                    const { subIdx, tarIdx } =
                                      activePickerIndex!;

                                    // Determinamos costo según el tipo de unidad del convenio
                                    const costo =
                                      subClientes[subIdx].tarifas[tarIdx]
                                        .tipoUnidad === "full"
                                        ? r.costo_total_full
                                        : r.costo_total_sencillo;

                                    // Actualizamos los campos en la tabla de convenios
                                    updateTarifa(
                                      subIdx,
                                      tarIdx,
                                      "rate_template_id",
                                      r.id,
                                    );
                                    updateTarifa(
                                      subIdx,
                                      tarIdx,
                                      "nombreRuta",
                                      r.origen,
                                    ); // Guardamos el Nombre de la Ruta
                                    updateTarifa(
                                      subIdx,
                                      tarIdx,
                                      "costoCasetas",
                                      costo,
                                    );
                                    updateTarifa(
                                      subIdx,
                                      tarIdx,
                                      "distancia_km",
                                      r.distancia_total_km,
                                    );

                                    setIsRoutePickerOpen(false);
                                    toast.success(
                                      "Ruta vinculada correctamente",
                                    );
                                  }}
                                >
                                  Seleccionar
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <div className="flex justify-between pt-6 border-t">
            <Button variant="outline" size="lg" onClick={() => setStep(2)}>
              Anterior
            </Button>
            <Button
              size="lg"
              onClick={handleSave}
              className="bg-primary hover:bg-primary/90 text-white px-12 shadow-lg shadow-primary/20"
            >
              <Check className="h-4 w-4 mr-2" /> GUARDAR CONVENIO FINAL
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
