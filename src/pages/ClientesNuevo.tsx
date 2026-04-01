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
  PlusCircle,
  Phone,
  Clock,
  DollarSign,
  Paperclip,
  Repeat,
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
import { useSystemConfig } from "@/hooks/useSystemConfig";
import { DocumentUploadManager } from "@/features/flota/DocumentUploadManager";
import { clientService } from "@/services/clientService";
import type { Client, RateTemplate } from "@/types/api.types";
import { tollService } from "@/services/tollService";

/** =========================
 * Types / Interfaces del Form
 * ========================= */

interface TarifaAutorizada {
  id: string;
  rate_template_id?: number | null;
  nombreRuta: string;
  tipoUnidad: string;
  tarifaBase: number;
  costoCasetas: number;
  iva_porcentaje: number;
  retencion_porcentaje: number;
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
  const [loadingData, setLoadingData] = useState(false);
  const { clients, isLoading: loadingClients } = useClients();

  // PARÁMETROS GLOBALES
  const { valueAsNumber: defaultIva, isLoading: isLoadingConfig } =
    useSystemConfig("iva_porcentaje");
  const { valueAsNumber: defaultRetencion } = useSystemConfig(
    "retencion_porcentaje",
  );
  const { valueAsNumber: defaultCredito } = useSystemConfig(
    "dias_credito_default",
  );
  const { value: defaultMoneda } = useSystemConfig("moneda_base");

  const [globalIVA, setGlobalIVA] = useState<number>(16);
  const [globalRetencion, setGlobalRetencion] = useState<number>(4);

  // PRE-LLENADO
  useEffect(() => {
    if (!isEditMode && !isLoadingConfig) {
      setGlobalIVA(defaultIva || 16);
      setGlobalRetencion(defaultRetencion || 4);
      setFiscalData((prev) => ({
        ...prev,
        dias_credito:
          prev.dias_credito === 0 ? defaultCredito || 15 : prev.dias_credito,
      }));
    }
  }, [
    defaultIva,
    defaultRetencion,
    defaultCredito,
    isEditMode,
    isLoadingConfig,
  ]);

  const dynamicOpcionesDiasCredito = useMemo(() => {
    const base = [
      { value: 0, label: "Contado" },
      { value: 15, label: "15 días" },
      { value: 30, label: "30 días" },
      { value: 45, label: "45 días" },
      { value: 60, label: "60 días" },
    ];
    if (defaultCredito > 0 && !base.find((o) => o.value === defaultCredito)) {
      base.push({
        value: defaultCredito,
        label: `${defaultCredito} días (Default)`,
      });
    }
    return base.sort((a, b) => a.value - b.value);
  }, [defaultCredito]);

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

  const validateRFC = (rfc: string): boolean =>
    rfc.length >= 12 && rfc.length <= 13;
  const validateCodigoPostal = (cp: string): boolean => /^\d{5}$/.test(cp);

  const validateTarifas = (): boolean => {
    for (const sub of subClientes) {
      for (const tarifa of sub.tarifas) {
        if (!tarifa.nombreRuta || tarifa.nombreRuta.trim() === "") {
          toast.error("Ruta no seleccionada", {
            description: `El destino "${sub.nombre}" tiene una fila sin ruta.`,
          });
          return false;
        }
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
    const iva = base * (globalIVA / 100);
    const ret = base * (globalRetencion / 100);
    const total = base + iva - ret;
    const rentabilidad = tarifa.distancia_km ? base / tarifa.distancia_km : 0;
    return { subtotal: base, iva, ret, total, rentabilidad };
  };

  const handleSearchRoutes = async (term: string) => {
    setSearchQuery(term);
    try {
      const data = await tollService.getTemplates(term);
      setRutasFiltradas(data ?? []);
    } catch (e) {
      console.error(e);
    }
  };

  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefreshTariffs = async () => {
    setIsRefreshing(true);
    try {
      const nuevasRutas = await tollService.getTemplates();
      setRutasDisponibles(nuevasRutas ?? []);
      setSubClientes((prevSubs) =>
        prevSubs.map((sub) => ({
          ...sub,
          tarifas: sub.tarifas.map((t) => {
            if (t.rate_template_id) {
              const rutaMaestra = nuevasRutas.find(
                (r) => r.id === t.rate_template_id,
              );
              if (rutaMaestra) {
                const isFull =
                  t.tipoUnidad.toLowerCase().includes("full") ||
                  t.tipoUnidad.includes("9");
                const nuevoCosto = isFull
                  ? rutaMaestra.costo_total_full
                  : rutaMaestra.costo_total_sencillo;
                return { ...t, costoCasetas: nuevoCosto };
              }
            }
            return t;
          }),
        })),
      );
      toast.success("Catálogo sincronizado", {
        description: "Precios actualizados con los datos del servidor.",
      });
    } catch (error) {
      toast.error("Error al sincronizar");
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const loadRutas = async () => {
      try {
        const data = await tollService.getTemplates();
        setRutasDisponibles(data ?? []);
      } catch (e) {
        toast.error("No se pudieron cargar las rutas");
      }
    };
    void loadRutas();
  }, []);

  useEffect(() => {
    if (isRoutePickerOpen) handleSearchRoutes("");
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
            horarioCita: sub.horario_cita || "",
            diasCredito: Number(sub.dias_credito || 0),
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
        const firstTar = mappedSubClients.flatMap((s) => s.tarifas)[0];
        if (firstTar) {
          setGlobalIVA(Number(firstTar.iva_porcentaje ?? 16));
          setGlobalRetencion(Number(firstTar.retencion_porcentaje ?? 4));
        }
        toast.info(`Cliente cargado: ${data.razon_social}`);
      } catch (error) {
        toast.error("Error al cargar los datos del cliente");
        navigate("/clients");
      } finally {
        setLoadingData(false);
      }
    };
    void loadClientData();
  }, [clientId, navigate]);

  const addSubCliente = () => {
    const newSub: SubClienteForm = {
      ...emptySubCliente,
      id: `SUB-${Date.now()}`,
      diasCredito: defaultCredito || 15,
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

  const addTarifa = (subClienteIndex: number) => {
    setSubClientes((prev) => {
      const updated = [...prev];
      const newTarifa: TarifaAutorizada = {
        ...emptyTarifa,
        id: `TAR-${Date.now()}`,
        iva_porcentaje: globalIVA,
        retencion_porcentaje: globalRetencion,
        moneda: (defaultMoneda as "MXN" | "USD") || "MXN",
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

  const getOperationBadge = (tipo: string) => {
    switch (tipo?.toLowerCase()) {
      case "nacional":
        return (
          <Badge
            variant="outline"
            className="text-[9px] uppercase tracking-widest font-black bg-emerald-500/10 text-emerald-600 border-emerald-200"
          >
            Nacional
          </Badge>
        );
      case "importación":
        return (
          <Badge
            variant="outline"
            className="text-[9px] uppercase tracking-widest font-black bg-blue-500/10 text-blue-600 border-blue-200"
          >
            Importación
          </Badge>
        );
      case "exportación":
        return (
          <Badge
            variant="outline"
            className="text-[9px] uppercase tracking-widest font-black bg-amber-500/10 text-amber-600 border-amber-200"
          >
            Exportación
          </Badge>
        );
      default:
        return (
          <Badge
            variant="outline"
            className="text-[9px] uppercase tracking-widest font-black"
          >
            Sin definir
          </Badge>
        );
    }
  };

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
            distancia_km: Number(t.distancia_km || 0),
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

  const rutasFiltradasParaModal = useMemo(() => {
    if (!activePickerIndex) return [];
    const { subIdx, tarIdx } = activePickerIndex;
    const currentTarifa = subClientes[subIdx]?.tarifas?.[tarIdx];
    if (!currentTarifa) return [];
    const esFilaFull =
      currentTarifa.tipoUnidad.toLowerCase().includes("full") ||
      currentTarifa.tipoUnidad.toLowerCase().includes("9");

    return rutasFiltradas.filter((r) => {
      const esRutaFull = r.tipo_unidad === "9ejes" || r.tipo_unidad === "full";
      return esFilaFull === esRutaFull;
    });
  }, [rutasFiltradas, activePickerIndex, subClientes]);

  const canProceed =
    fiscalData.razonSocial && fiscalData.rfc && validateRFC(fiscalData.rfc);
  const canProceedStep2 =
    subClientes.length > 0 &&
    subClientes.every((s) => s.nombre && s.direccion && s.ciudad);

  if (loadingData) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-brand-red" />
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
          Cargando datos del cliente...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 md:p-8 animate-page-enter">
      {/*  HEADER TAHOE */}
      <div className="flex items-center gap-4 mb-8">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate("/clients")}
          className="glass-card shadow-sm h-10 w-10"
        >
          <ArrowLeft className="h-5 w-5 text-slate-600" />
        </Button>
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter text-brand-navy drop-shadow-sm heading-crisp flex items-center gap-3">
            <Users className="h-7 w-7 text-brand-red" />
            {isEditMode ? "Editar Cliente" : "Alta de Cliente"}
          </h1>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 mt-1">
            Asistente de registro comercial - Paso {step} de 3
          </p>
        </div>
      </div>

      {/*  STEP INDICATOR TAHOE */}
      <div className="flex items-center gap-4 bg-white/40 backdrop-blur-md p-4 rounded-2xl border border-white/20 shadow-sm">
        <div
          className={`flex items-center gap-3 ${step >= 1 ? "text-brand-navy" : "text-slate-400"}`}
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shadow-sm ${step >= 1 ? "bg-brand-navy text-white shadow-brand-navy/30" : "bg-white/50 border border-slate-200"}`}
          >
            {step > 1 ? <Check className="h-4 w-4" /> : "1"}
          </div>
          <span className="font-black uppercase text-[10px] tracking-widest hidden sm:block">
            Datos Fiscales
          </span>
        </div>
        <div className="flex-1 h-[2px] bg-gradient-to-r from-brand-navy/20 to-slate-200/50 rounded-full" />
        <div
          className={`flex items-center gap-3 ${step >= 2 ? "text-brand-navy" : "text-slate-400"}`}
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shadow-sm ${step >= 2 ? "bg-brand-navy text-white shadow-brand-navy/30" : "bg-white/50 border border-slate-200"}`}
          >
            {step > 2 ? <Check className="h-4 w-4" /> : "2"}
          </div>
          <span className="font-black uppercase text-[10px] tracking-widest hidden sm:block">
            Destinos
          </span>
        </div>
        <div className="flex-1 h-[2px] bg-gradient-to-r from-brand-navy/20 to-slate-200/50 rounded-full" />
        <div
          className={`flex items-center gap-3 ${step >= 3 ? "text-brand-navy" : "text-slate-400"}`}
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shadow-sm ${step >= 3 ? "bg-brand-navy text-white shadow-brand-navy/30" : "bg-white/50 border border-slate-200"}`}
          >
            3
          </div>
          <span className="font-black uppercase text-[10px] tracking-widest hidden sm:block">
            Tarifas y Convenios
          </span>
        </div>
      </div>

      {/*  STEP 1: DATOS FISCALES */}
      {step === 1 && (
        <Card
          variant="glass"
          className="animate-in fade-in slide-in-from-bottom-4 duration-500"
        >
          <CardHeader className="bg-brand-navy/5 border-b border-white/20">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-brand-navy" />
              Datos Fiscales (Receptor CFDI 4.0)
            </CardTitle>
            <CardDescription>
              Información corporativa base para emisión de facturas
              electrónicas.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <Label variant="brand" required>
                  Razón Social
                </Label>
                <Input
                  placeholder="Empresa S.A. de C.V."
                  value={fiscalData.razonSocial}
                  onChange={(e) =>
                    setFiscalData({
                      ...fiscalData,
                      razonSocial: e.target.value,
                    })
                  }
                  className="h-11 glass-card font-medium"
                />
              </div>
              <div className="space-y-1.5">
                <Label variant="brand" required>
                  RFC (12-13 CARACTERES)
                </Label>
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
                    "h-11 font-mono font-bold uppercase",
                    fiscalData.rfc &&
                      !validateRFC(fiscalData.rfc) &&
                      "border-destructive bg-destructive/5",
                  )}
                />
                {fiscalData.rfc && !validateRFC(fiscalData.rfc) && (
                  <p className="text-[9px] font-black text-destructive uppercase tracking-widest mt-1">
                    RFC inválido
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-6">
              <div className="space-y-1.5">
                <Label variant="brand" required>
                  Régimen Fiscal
                </Label>
                <Select
                  value={fiscalData.regimenFiscal}
                  onValueChange={(v) =>
                    setFiscalData({ ...fiscalData, regimenFiscal: v })
                  }
                >
                  <SelectTrigger className="h-11 glass-card font-bold">
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent className="glass-panel">
                    <SelectItem value="601">601 - General de Ley</SelectItem>
                    <SelectItem value="603">
                      603 - Sin Fines de Lucro
                    </SelectItem>
                    <SelectItem value="612">612 - Personas Físicas</SelectItem>
                    <SelectItem value="626">626 - RESICO</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label variant="brand">Uso de CFDI</Label>
                <Select
                  value={fiscalData.usoCFDI}
                  onValueChange={(v) =>
                    setFiscalData({ ...fiscalData, usoCFDI: v })
                  }
                >
                  <SelectTrigger className="h-11 glass-card font-bold">
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent className="glass-panel">
                    <SelectItem value="G03">G03 - Gastos en general</SelectItem>
                    <SelectItem value="P01">P01 - Por definir</SelectItem>
                    <SelectItem value="S01">
                      S01 - Sin efectos fiscales
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label variant="brand" required>
                  Código Postal Fiscal
                </Label>
                <Input
                  placeholder="00000"
                  value={fiscalData.codigoPostalFiscal}
                  onChange={(e) =>
                    setFiscalData({
                      ...fiscalData,
                      codigoPostalFiscal: e.target.value
                        .replace(/\D/g, "")
                        .slice(0, 5),
                    })
                  }
                  maxLength={5}
                  className={cn(
                    "h-11 font-mono font-bold",
                    fiscalData.codigoPostalFiscal &&
                      !validateCodigoPostal(fiscalData.codigoPostalFiscal) &&
                      "border-destructive bg-destructive/5",
                  )}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label variant="brand">Dirección Fiscal Completa</Label>
              <Input
                placeholder="Av. Ejemplo 123, Col. Centro, Ciudad, Estado..."
                value={fiscalData.direccionFiscal}
                onChange={(e) =>
                  setFiscalData({
                    ...fiscalData,
                    direccionFiscal: e.target.value,
                  })
                }
                className="h-11 glass-card font-medium"
              />
            </div>

            <div className="grid grid-cols-3 gap-6">
              <div className="space-y-1.5">
                <Label variant="brand">Contacto Principal</Label>
                <Input
                  placeholder="Ing. Roberto Salinas"
                  value={fiscalData.contactoPrincipal}
                  onChange={(e) =>
                    setFiscalData({
                      ...fiscalData,
                      contactoPrincipal: e.target.value,
                    })
                  }
                  className="h-11 glass-card"
                />
              </div>
              <div className="space-y-1.5">
                <Label variant="brand">Teléfono Directo</Label>
                <Input
                  placeholder="55 1234 5678"
                  value={fiscalData.telefono}
                  onChange={(e) =>
                    setFiscalData({ ...fiscalData, telefono: e.target.value })
                  }
                  className="h-11 font-mono glass-card"
                />
              </div>
              <div className="space-y-1.5">
                <Label variant="brand">Email Institucional</Label>
                <Input
                  type="email"
                  placeholder="contacto@empresa.com"
                  value={fiscalData.email}
                  onChange={(e) =>
                    setFiscalData({ ...fiscalData, email: e.target.value })
                  }
                  className="h-11 font-bold text-brand-navy glass-card"
                />
              </div>
            </div>

            {/* Documentos Obligatorios */}
            <div className="space-y-4 pt-6 border-t border-slate-200/50">
              <h4 className="text-[12px] font-black uppercase tracking-widest text-brand-navy flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-emerald-500" />
                Documentación del Cliente
              </h4>

              {!isEditMode ? (
                <div className="p-8 border border-dashed border-slate-300 rounded-2xl bg-white/40 text-center flex flex-col items-center justify-center gap-2 shadow-sm">
                  <AlertTriangle className="h-6 w-6 text-amber-500" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Guarda el cliente primero para habilitar la carga de
                    documentos físicos.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <DocumentUploadManager
                    entityId={parseInt(clientId!)}
                    entityType="client"
                    docType="constancia_fiscal"
                    docLabel="Constancia Fiscal"
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
            <div className="space-y-4 pt-6 border-t border-slate-200/50">
              <div className="flex items-center justify-between">
                <h4 className="text-[12px] font-black uppercase tracking-widest text-brand-navy flex items-center gap-2">
                  <Paperclip className="h-4 w-4 text-blue-500" />
                  Soporte Adicional
                </h4>
                <Badge
                  variant="outline"
                  className="text-[9px] uppercase tracking-widest"
                >
                  Expediente Libre
                </Badge>
              </div>

              {!isEditMode ? (
                <div className="p-6 border border-dashed border-slate-300 rounded-2xl bg-white/40 text-center shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    El repositorio se activa después del primer guardado.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <DocumentUploadManager
                    entityId={parseInt(clientId!)}
                    entityType="client"
                    docType="adicional"
                    docLabel="Repositorio Libre"
                    currentUrl={fiscalData.contratoUrl}
                    accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.csv,.txt,.doc,.docx"
                    onUploadSuccess={(url) => {
                      setFiscalData((prev) => ({ ...prev, contratoUrl: url }));
                      toast.success("Documento adicional guardado");
                    }}
                  />
                  <Card
                    variant="flat"
                    className="bg-blue-50/50 border-blue-100"
                  >
                    <CardContent className="p-4 flex gap-3">
                      <AlertTriangle className="h-5 w-5 text-blue-500 shrink-0" />
                      <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-blue-800">
                          Soporte Multiformato
                        </p>
                        <p className="text-xs font-medium text-blue-600/80 leading-relaxed">
                          Puedes subir contratos, anexos o catálogos en PDF,
                          Imágenes o Excel.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-6 border-t border-slate-200/50 mt-8">
              <Button
                onClick={() => setStep(2)}
                disabled={!canProceed}
                className="btn-primary-gradient h-11 px-10 text-[11px] font-black uppercase tracking-widest"
              >
                Siguiente Paso <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/*  STEP 2: DESTINOS / SUBCLIENTES */}
      {step === 2 && (
        <Card
          variant="glass"
          className="animate-in fade-in slide-in-from-bottom-4 duration-500"
        >
          <CardHeader className="bg-brand-navy/5 border-b border-white/20 flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-brand-navy" />
                Destinos de Entrega
              </CardTitle>
              <CardDescription>
                Registra plantas, almacenes o ubicaciones clave para{" "}
                <strong className="text-brand-navy">
                  {fiscalData.razonSocial}
                </strong>
                .
              </CardDescription>
            </div>
            <Button
              onClick={addSubCliente}
              className="btn-primary-gradient h-10 px-6 text-[10px] font-black uppercase tracking-widest shadow-md"
            >
              <Plus className="h-3 w-3 mr-2" /> Nuevo Destino
            </Button>
          </CardHeader>

          <CardContent className="pt-6">
            {subClientes.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-slate-300 rounded-2xl bg-white/40 shadow-sm flex flex-col items-center">
                <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                  <MapPin className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="font-black text-slate-700 text-lg uppercase tracking-tight">
                  Cero Destinos Configurados
                </h3>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1 mb-6">
                  Debes agregar al menos una ubicación para continuar.
                </p>
                <Button
                  onClick={addSubCliente}
                  variant="outline"
                  className="glass-card font-black uppercase tracking-widest text-[10px] h-11"
                >
                  <Plus className="h-4 w-4 mr-2" /> Crear Primer Destino
                </Button>
              </div>
            ) : (
              <Accordion
                type="single"
                collapsible
                className="space-y-4"
                value={
                  editingIndex !== null ? `sub-${editingIndex}` : undefined
                }
              >
                {subClientes.map((sub, idx) => (
                  <AccordionItem
                    key={sub.id}
                    value={`sub-${idx}`}
                    className={cn(
                      "glass-card rounded-2xl overflow-hidden border transition-all",
                      editingIndex === idx
                        ? "border-brand-navy shadow-md"
                        : "border-slate-200/60",
                    )}
                  >
                    <AccordionTrigger className="px-6 py-4 hover:bg-slate-50/50 hover:no-underline [&[data-state=open]]:bg-slate-50/80 transition-colors">
                      <div className="flex items-center gap-4 flex-1 text-left">
                        <div className="w-10 h-10 rounded-xl bg-brand-navy/5 border border-brand-navy/10 flex items-center justify-center text-brand-navy font-black">
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <p className="font-black text-brand-navy text-sm uppercase tracking-tight">
                            {sub.nombre || (
                              <span className="text-slate-400">
                                NOMBRE DEL DESTINO PENDIENTE
                              </span>
                            )}
                          </p>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                            {sub.ciudad && sub.estado
                              ? `${sub.ciudad}, ${sub.estado}`
                              : "UBICACIÓN SIN DEFINIR"}
                          </p>
                        </div>
                        {sub.tipoOperacion &&
                          getOperationBadge(sub.tipoOperacion)}
                      </div>
                    </AccordionTrigger>

                    <AccordionContent className="px-6 pb-6">
                      <div className="space-y-6 pt-6 border-t border-slate-200/50">
                        <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-1.5">
                            <Label variant="brand" required>
                              Nombre del Destino
                            </Label>
                            <Input
                              placeholder="Ej: Planta Norte Monterrey"
                              value={sub.nombre}
                              onChange={(e) =>
                                updateSubCliente(idx, "nombre", e.target.value)
                              }
                              className="h-11 glass-card font-medium"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label variant="brand">Alias (Uso Interno)</Label>
                            <Input
                              placeholder="Ej: Planta Norte"
                              value={sub.alias}
                              onChange={(e) =>
                                updateSubCliente(idx, "alias", e.target.value)
                              }
                              className="h-11 glass-card"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label variant="brand" required>
                            Dirección Completa
                          </Label>
                          <Input
                            placeholder="Av. Industrial 123..."
                            value={sub.direccion}
                            onChange={(e) =>
                              updateSubCliente(idx, "direccion", e.target.value)
                            }
                            className="h-11 glass-card font-medium"
                          />
                        </div>

                        <div className="grid grid-cols-4 gap-6">
                          <div className="space-y-1.5">
                            <Label variant="brand" required>
                              Ciudad
                            </Label>
                            <Input
                              placeholder="Monterrey"
                              value={sub.ciudad}
                              onChange={(e) =>
                                updateSubCliente(idx, "ciudad", e.target.value)
                              }
                              className="h-11 glass-card font-medium"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label variant="brand">Estado</Label>
                            <Select
                              value={sub.estado}
                              onValueChange={(v) =>
                                updateSubCliente(idx, "estado", v)
                              }
                            >
                              <SelectTrigger className="h-11 glass-card font-bold">
                                <SelectValue placeholder="Seleccionar..." />
                              </SelectTrigger>
                              <SelectContent className="glass-panel max-h-[30vh]">
                                {estadosMexico.map((edo) => (
                                  <SelectItem key={edo} value={edo}>
                                    {edo}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <Label variant="brand">C.P.</Label>
                            <Input
                              placeholder="64000"
                              value={sub.codigoPostal}
                              onChange={(e) =>
                                updateSubCliente(
                                  idx,
                                  "codigoPostal",
                                  e.target.value.replace(/\D/g, "").slice(0, 5),
                                )
                              }
                              maxLength={5}
                              className="h-11 glass-card font-mono"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label variant="brand">Operación</Label>
                            <Select
                              value={sub.tipoOperacion}
                              onValueChange={(v) =>
                                updateSubCliente(idx, "tipoOperacion", v)
                              }
                            >
                              <SelectTrigger className="h-11 glass-card font-bold">
                                <SelectValue placeholder="Seleccionar..." />
                              </SelectTrigger>
                              <SelectContent className="glass-panel">
                                <SelectItem value="nacional">
                                  Nacional
                                </SelectItem>
                                <SelectItem value="importacion">
                                  Importación
                                </SelectItem>
                                <SelectItem value="exportacion">
                                  Exportación
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="grid grid-cols-4 gap-6 pt-4 border-t border-slate-100">
                          <div className="space-y-1.5">
                            <Label
                              variant="brand"
                              className="flex items-center gap-1.5"
                            >
                              <Users className="h-3 w-3 text-slate-400" />{" "}
                              Contacto
                            </Label>
                            <Input
                              placeholder="Ing. Roberto"
                              value={sub.contacto}
                              onChange={(e) =>
                                updateSubCliente(
                                  idx,
                                  "contacto",
                                  e.target.value,
                                )
                              }
                              className="h-11 glass-card"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label
                              variant="brand"
                              className="flex items-center gap-1.5"
                            >
                              <Phone className="h-3 w-3 text-slate-400" />{" "}
                              Teléfono
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
                              className="h-11 glass-card font-mono"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label
                              variant="brand"
                              className="flex items-center gap-1.5"
                            >
                              <Clock className="h-3 w-3 text-slate-400" />{" "}
                              Horario Recepción
                            </Label>
                            <Input
                              placeholder="7:00 - 17:00"
                              value={sub.horarioRecepcion}
                              onChange={(e) =>
                                updateSubCliente(
                                  idx,
                                  "horarioRecepcion",
                                  e.target.value,
                                )
                              }
                              className="h-11 glass-card"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label
                              variant="brand"
                              className="flex items-center gap-1.5"
                            >
                              <Calendar className="h-3 w-3 text-slate-400" />{" "}
                              Horario Cita
                            </Label>
                            <Input
                              placeholder="8:00 - 10:00"
                              value={sub.horarioCita}
                              onChange={(e) =>
                                updateSubCliente(
                                  idx,
                                  "horarioCita",
                                  e.target.value,
                                )
                              }
                              className="h-11 glass-card"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end pt-4">
                          <Button
                            variant="ghost"
                            className="text-[10px] font-black uppercase tracking-widest text-rose-500 hover:bg-rose-50 hover:text-rose-600 h-9"
                            onClick={() => removeSubCliente(idx)}
                          >
                            <Trash2 className="h-3 w-3 mr-2" /> Eliminar Destino
                          </Button>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}

            <div className="flex items-center justify-between pt-8 border-t border-slate-200/50 mt-8">
              <Button
                variant="outline"
                className="h-11 glass-card px-8 text-[11px] font-black uppercase tracking-widest text-slate-500"
                onClick={() => setStep(1)}
              >
                <ArrowLeft className="h-4 w-4 mr-2" /> Atrás
              </Button>
              <Button
                onClick={() => setStep(3)}
                disabled={!canProceedStep2}
                className="btn-primary-gradient h-11 px-10 text-[11px] font-black uppercase tracking-widest"
              >
                Siguiente Paso <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/*  STEP 3: TARIFAS Y CONVENIOS */}
      {step === 3 && (
        <div className="space-y-6 animate-in fade-in duration-500">
          {/* CONFIGURACIÓN GLOBAL */}
          <Card
            variant="glass"
            className="bg-gradient-to-br from-slate-50 to-white border-2 border-dashed border-slate-200 shadow-sm"
          >
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                <div className="space-y-1.5">
                  <Label variant="brand" className="text-primary">
                    IVA Trasladado (%)
                  </Label>
                  <Input
                    type="number"
                    className="h-11 bg-white font-mono font-bold"
                    value={globalIVA}
                    onChange={(e) => setGlobalIVA(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label variant="brand" className="text-rose-600">
                    Retención IVA (%)
                  </Label>
                  <Input
                    type="number"
                    className="h-11 bg-white font-mono font-bold"
                    value={globalRetencion}
                    onChange={(e) => setGlobalRetencion(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label variant="brand" className="text-slate-600">
                    Crédito Global (Días)
                  </Label>
                  <Select
                    value={String(fiscalData.dias_credito)}
                    onValueChange={(val) =>
                      setFiscalData((prev) => ({
                        ...prev,
                        dias_credito: parseInt(val, 10) || 0,
                      }))
                    }
                  >
                    <SelectTrigger className="h-11 bg-white font-bold">
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent className="glass-panel">
                      {dynamicOpcionesDiasCredito.map((op) => (
                        <SelectItem
                          key={op.value}
                          value={String(op.value)}
                          className="font-semibold"
                        >
                          {op.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    className="h-11 bg-white border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 shadow-sm w-full"
                    onClick={handleRefreshTariffs}
                    disabled={isRefreshing}
                  >
                    {isRefreshing ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Repeat className="h-4 w-4 mr-2 text-primary" />
                    )}
                    Sincronizar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* LISTADO DE TARIFAS POR SUBCLIENTE */}
          {subClientes.map((sub, idx) => (
            <Card
              key={sub.id}
              variant="glass"
              className="overflow-hidden border border-slate-200/60"
            >
              <CardHeader className="py-4 bg-brand-navy/5 border-b border-white/20 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-black uppercase tracking-tight flex items-center gap-2 text-brand-navy">
                  <MapPin className="h-4 w-4 text-brand-red" />{" "}
                  {sub.nombre || "DESTINO SIN NOMBRE"}
                </CardTitle>
                <div className="flex items-center gap-3">
                  <Label className="text-[10px] uppercase font-black tracking-widest text-slate-500">
                    Crédito Excepción:
                  </Label>
                  <Select
                    value={String(sub.diasCredito)}
                    onValueChange={(v) =>
                      updateSubCliente(idx, "diasCredito", parseInt(v))
                    }
                  >
                    <SelectTrigger className="h-8 w-32 bg-white font-bold text-xs shadow-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="glass-panel">
                      {opcionesDiasCredito.map((op) => (
                        <SelectItem
                          key={op.value}
                          value={String(op.value)}
                          className="font-semibold text-xs"
                        >
                          {op.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>

              <CardContent className="pt-6 space-y-4 bg-white/40">
                {sub.tarifas.length === 0 ? (
                  <p className="text-center text-[10px] font-bold uppercase tracking-widest text-slate-400 py-4">
                    No hay rutas asignadas a este destino
                  </p>
                ) : (
                  sub.tarifas.map((tarifa, tIdx) => {
                    const info = calcularInfoTarifa(tarifa);
                    return (
                      <div
                        key={tarifa.id}
                        className="relative grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch border border-slate-200/80 p-4 rounded-2xl bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md transition-all group"
                      >
                        {/* 1. TIPO DE CONFIGURACIÓN */}
                        <div className="col-span-2 flex flex-col justify-center space-y-1.5">
                          <Label variant="brand">1. Configuración</Label>
                          <Select
                            value={tarifa.tipoUnidad}
                            onValueChange={(v) => {
                              updateTarifa(idx, tIdx, "tipoUnidad", v);
                              updateTarifa(idx, tIdx, "rate_template_id", null);
                              updateTarifa(idx, tIdx, "nombreRuta", "");
                              updateTarifa(idx, tIdx, "costoCasetas", 0);
                              toast.info(
                                "Tipo actualizado. Selecciona ruta de nuevo.",
                              );
                            }}
                          >
                            <SelectTrigger className="h-10 font-bold border-slate-200 bg-slate-50">
                              <SelectValue placeholder="Tipo..." />
                            </SelectTrigger>
                            <SelectContent className="glass-panel z-[200]">
                              <SelectItem value="sencillo">
                                Sencillo (5 Ejes)
                              </SelectItem>
                              <SelectItem value="full">
                                Doble / Full (9 Ejes)
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* 2. RUTA AUTORIZADA */}
                        <div className="col-span-3 flex flex-col justify-center space-y-1.5">
                          <Label variant="brand">2. Ruta Matriz (SCT)</Label>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full h-10 justify-start font-bold border-slate-200 text-xs shadow-sm",
                              !tarifa.nombreRuta &&
                                "text-rose-500 border-rose-200 bg-rose-50",
                            )}
                            onClick={() => {
                              setActivePickerIndex({
                                subIdx: idx,
                                tarIdx: tIdx,
                              });
                              setIsRoutePickerOpen(true);
                            }}
                          >
                            <Route className="h-4 w-4 mr-2 shrink-0 text-slate-400" />
                            <span className="truncate">
                              {tarifa.nombreRuta || "VINCULAR RUTA..."}
                            </span>
                          </Button>
                        </div>

                        {/* 3. DESGLOSE INTERNO */}
                        <div className="col-span-3 flex flex-col justify-center px-4 border-l border-r border-slate-100 bg-slate-50/50 rounded-xl space-y-1.5">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                              Casetas (Ref):
                            </span>
                            <span className="text-xs font-mono font-bold text-emerald-600">
                              ${tarifa.costoCasetas.toLocaleString()}
                            </span>
                          </div>
                          <Separator className="opacity-50" />
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              IVA ({globalIVA}%):
                            </span>
                            <span className="text-xs font-mono font-bold text-primary">
                              +${" "}
                              {info.iva.toLocaleString("es-MX", {
                                minimumFractionDigits: 2,
                              })}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              Ret ({globalRetencion}%):
                            </span>
                            <span className="text-xs font-mono font-bold text-rose-500">
                              -${" "}
                              {info.ret.toLocaleString("es-MX", {
                                minimumFractionDigits: 2,
                              })}
                            </span>
                          </div>
                        </div>

                        {/* 4. FLETE BASE (INPUT) */}
                        <div className="col-span-2 flex flex-col justify-center space-y-1.5">
                          <Label variant="brand" className="text-brand-navy">
                            3. Flete a Cobrar
                          </Label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
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
                              className="h-10 pl-8 text-sm font-black border-slate-200 bg-white focus-visible:ring-brand-navy shadow-sm"
                            />
                          </div>
                        </div>

                        {/* 5. TOTAL A FACTURAR */}
                        <div className="col-span-2 flex items-center gap-3">
                          <div className="flex-1 bg-brand-navy p-3 rounded-xl text-right shadow-md flex flex-col justify-center h-full">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                              Total Factura
                            </p>
                            <p className="text-lg font-black text-white font-mono leading-none">
                              $
                              {info.total.toLocaleString("es-MX", {
                                minimumFractionDigits: 2,
                              })}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 shrink-0 text-slate-300 hover:text-white hover:bg-destructive rounded-xl shadow-sm bg-white border border-slate-200"
                            onClick={() => removeTarifa(idx, tIdx)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}

                <Button
                  variant="ghost"
                  size="lg"
                  className="w-full border-dashed border-2 border-slate-200 h-12 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-brand-navy hover:border-brand-navy/30 hover:bg-brand-navy/5 rounded-xl transition-all"
                  onClick={() => addTarifa(idx)}
                >
                  <PlusCircle className="h-4 w-4 mr-2" /> Añadir ruta comercial
                </Button>
              </CardContent>
            </Card>
          ))}

          {/*  MODAL RUTAS SCT (LIQUID GLASS) */}
          <Dialog open={isRoutePickerOpen} onOpenChange={setIsRoutePickerOpen}>
            <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col p-0 glass-panel border-none shadow-2xl">
              <DialogHeader className="p-6 pb-4 bg-brand-navy/95 backdrop-blur-md text-white border-b border-white/10">
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                <div className="relative z-10 space-y-4">
                  <DialogTitle className="text-2xl font-black uppercase tracking-tighter heading-crisp flex items-center gap-2 text-white text-shadow-premium">
                    <Route className="h-6 w-6 text-brand-red" /> Catálogo Matriz
                    SCT
                  </DialogTitle>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Buscar por origen o destino..."
                      value={searchQuery}
                      onChange={(e) => handleSearchRoutes(e.target.value)}
                      className="pl-10 h-11 bg-white/10 border-white/20 text-white placeholder:text-slate-400 focus:bg-white focus:text-brand-navy font-bold shadow-inner"
                      autoFocus
                    />
                  </div>
                </div>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 custom-scrollbar">
                <div className="border border-white/40 rounded-2xl bg-white/60 backdrop-blur-sm shadow-xl overflow-hidden liquid-glass-table">
                  <Table>
                    <TableHeader className="bg-slate-900/5 backdrop-blur-md border-b border-white/20">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 h-12 pl-6">
                          Ruta Registrada
                        </TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 h-12 text-right">
                          {activePickerIndex &&
                          (subClientes[activePickerIndex.subIdx]?.tarifas[
                            activePickerIndex.tarIdx
                          ]?.tipoUnidad?.includes("full") ||
                            subClientes[activePickerIndex.subIdx]?.tarifas[
                              activePickerIndex.tarIdx
                            ]?.tipoUnidad?.includes("9")) ? (
                            <span className="text-emerald-700">
                              Costo Full (Ref)
                            </span>
                          ) : (
                            <span className="text-blue-700">
                              Costo Sencillo (Ref)
                            </span>
                          )}
                        </TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 h-12 text-right pr-6">
                          Acción
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="table-staggered">
                      {rutasFiltradasParaModal.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={3}
                            className="text-center py-16 text-[10px] font-bold uppercase tracking-widest text-slate-400"
                          >
                            No hay rutas compatibles con esta configuración.
                          </TableCell>
                        </TableRow>
                      ) : (
                        rutasFiltradasParaModal.map((r) => {
                          const isFull =
                            r.tipo_unidad === "9ejes" ||
                            r.tipo_unidad === "full";
                          return (
                            <TableRow
                              key={r.id}
                              className="cursor-pointer hover:bg-white/60 transition-colors border-b border-white/10 interactive-row"
                            >
                              <TableCell className="py-4 pl-6">
                                <div className="flex flex-col gap-1">
                                  <span className="font-black text-brand-navy text-sm uppercase tracking-tight">
                                    {r.origen}
                                  </span>
                                  <div className="flex flex-wrap items-center gap-x-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                    {r.destino && r.destino !== "N/A" && (
                                      <span className="text-brand-red">
                                        ➔ {r.destino}
                                      </span>
                                    )}
                                    <span className="text-slate-300">•</span>
                                    <span className="font-mono text-slate-500">
                                      {r.distancia_total_km} KM
                                    </span>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell
                                className={cn(
                                  "text-right font-mono text-[12px] font-black py-4",
                                  isFull ? "text-emerald-600" : "text-blue-600",
                                )}
                              >
                                $
                                {(isFull
                                  ? r.costo_total_full
                                  : r.costo_total_sencillo
                                ).toLocaleString("es-MX", {
                                  minimumFractionDigits: 2,
                                })}
                              </TableCell>
                              <TableCell className="text-right py-4 pr-6">
                                <Button
                                  className="h-8 bg-brand-navy hover:bg-brand-navy/90 text-white text-[9px] font-black uppercase tracking-widest shadow-md rounded-lg"
                                  onClick={() => {
                                    if (!activePickerIndex) return;
                                    const { subIdx, tarIdx } =
                                      activePickerIndex;
                                    const costo = isFull
                                      ? r.costo_total_full
                                      : r.costo_total_sencillo;
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
                                    );
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
                                    toast.success("Ruta vinculada al convenio");
                                  }}
                                >
                                  Vincular
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

          {/*  FOOTER FINAL */}
          <div className="flex items-center justify-between pt-8 border-t border-slate-200 mt-12 mb-12">
            <Button
              variant="outline"
              className="h-12 glass-card px-8 text-[11px] font-black uppercase tracking-widest text-slate-500"
              onClick={() => setStep(2)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" /> Paso Anterior
            </Button>
            <Button
              onClick={handleSave}
              className="btn-primary-gradient h-12 px-12 text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl active:scale-95 transition-all"
            >
              <Check className="h-4 w-4 mr-2" /> GUARDAR CONVENIO FINAL
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
