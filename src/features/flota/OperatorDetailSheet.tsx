import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Phone,
  Shield,
  Award,
  Fuel,
  Clock,
  Heart,
  CheckCircle,
  AlertTriangle,
  XCircle,
  CreditCard,
  Calendar as CalendarIcon,
  User,
  Truck,
  Pencil,
  Save,
  X,
  Camera,
  FileText,
} from "lucide-react";
import { DocumentUploadManager } from "@/features/flota/DocumentUploadManager";

// IMPORTANTE: interfaz real del servicio (ID numérico, etc.)
import { operatorService } from "@/services/operatorService";
import { Operator } from "@/types/api.types";

import { format, differenceInYears, isValid } from "date-fns";
import { es } from "date-fns/locale";

// Form Components (Tahoe UI)
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { DatePicker } from "@/components/ui/date-picker"; // 🚀 Importado para reemplazar inputs nativos

interface OperatorDetailSheetProps {
  operator: Operator | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: (operator: Operator) => void;
}

interface DocumentItem {
  id: string;
  name: string;
  type: "pdf" | "image";
  status: "vigente" | "por_vencer" | "faltante" | "vencido";
  expiryDate?: string;
  fileName?: string;
  fileUrl?: string;
}

// --- ESQUEMA ZOD (EDICIÓN EN LÍNEA) ---
const editOperatorSchema = z.object({
  name: z.string().min(2, "El nombre es requerido"),
  phone: z.string().min(10, "Ingrese un número válido"),
  license_number: z.string().min(3, "Número de licencia requerido"),
  license_expiry: z.date({ required_error: "Fecha requerida" }),
  medical_check_expiry: z.date({ required_error: "Fecha requerida" }),
  emergency_contact: z.string().optional(),
  emergency_phone: z.string().optional(),
});

type EditOperatorData = z.infer<typeof editOperatorSchema>;

// --- Helpers de Fecha y Estado ---
const getDaysUntilExpiry = (dateString?: string): number => {
  if (!dateString) return -1;
  const today = new Date();
  const expiry = new Date(dateString);
  if (!isValid(expiry)) return -1;
  const diffTime = expiry.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const getExpiryStatus = (
  dateString?: string,
): "danger" | "warning" | "success" => {
  const days = getDaysUntilExpiry(dateString);
  if (days < 0) return "danger";
  if (days <= 30) return "warning";
  return "success";
};

const getStatusColor = (status?: string) => {
  switch ((status || "").toLowerCase()) {
    case "activo":
      return "ring-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.4)]";
    case "inactivo":
      return "ring-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.4)]";
    case "vacaciones":
      return "ring-sky-500 shadow-[0_0_20px_rgba(14,165,233,0.4)]";
    case "incapacidad":
      return "ring-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.4)]";
    default:
      return "ring-muted shadow-[0_0_20px_rgba(148,163,184,0.4)]";
  }
};

const getStatusLabel = (status?: string) => {
  if (!status) return "Desconocido";
  const s = status.toLowerCase();
  switch (s) {
    case "activo":
      return "Activo";
    case "inactivo":
      return "Inactivo";
    case "vacaciones":
      return "Vacaciones";
    case "incapacidad":
      return "Incapacidad";
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
};

const getLicenseProgressColor = (expiryDate?: string): string => {
  const status = getExpiryStatus(expiryDate);
  switch (status) {
    case "danger":
      return "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.6)]";
    case "warning":
      return "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.6)]";
    case "success":
      return "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.6)]";
  }
};

// --- Componente Principal ---
export function OperatorDetailSheet({
  operator,
  open,
  onOpenChange,
  onSave,
}: OperatorDetailSheetProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [uploadingDocId, setUploadingDocId] = useState<string | null>(null);

  const [documents, setDocuments] = useState<DocumentItem[]>([]);

  // 🚀 REACT HOOK FORM
  const form = useForm<EditOperatorData>({
    resolver: zodResolver(editOperatorSchema),
    defaultValues: {
      name: "",
      phone: "",
      license_number: "",
      license_expiry: new Date(),
      medical_check_expiry: new Date(),
      emergency_contact: "",
      emergency_phone: "",
    },
  });

  const { reset, handleSubmit } = form;

  useEffect(() => {
    if (operator && open) {
      const parseDateSafe = (dateStr?: string) => {
        if (!dateStr) return new Date();
        const d = new Date(`${dateStr}T12:00:00`); // Evita problemas de zona horaria
        return isValid(d) ? d : new Date();
      };

      reset({
        name: operator.name || "",
        phone: operator.phone || "",
        license_number: operator.license_number || "",
        license_expiry: parseDateSafe(operator.license_expiry),
        medical_check_expiry: parseDateSafe(operator.medical_check_expiry),
        emergency_contact: operator.emergency_contact || "",
        emergency_phone: operator.emergency_phone || "",
      });

      setDocuments([
        {
          id: "lic",
          name: "Licencia Federal",
          type: "pdf",
          status:
            getExpiryStatus(operator.license_expiry) === "danger"
              ? "vencido"
              : getExpiryStatus(operator.license_expiry) === "warning"
                ? "por_vencer"
                : "vigente",
          expiryDate: operator.license_expiry,
          fileName: "licencia_federal.pdf",
        },
        {
          id: "ine",
          name: "INE / Identificación",
          type: "image",
          status: "vigente",
          fileName: "ine_frente.jpg",
        },
        {
          id: "med",
          name: "Apto Médico",
          type: "pdf",
          status:
            getExpiryStatus(operator.medical_check_expiry) === "danger"
              ? "vencido"
              : getExpiryStatus(operator.medical_check_expiry) === "warning"
                ? "por_vencer"
                : "vigente",
          expiryDate: operator.medical_check_expiry,
        },
        {
          id: "dom",
          name: "Comprobante Domicilio",
          type: "pdf",
          status: "faltante",
        },
      ]);

      setIsEditing(false);
    }
  }, [operator, open, reset]);

  const handleStartEditing = () => setIsEditing(true);
  const handleCancelEditing = () => {
    reset(); // Revierte a los valores originales cargados en el useEffect
    setIsEditing(false);
  };

  const onFormSubmit = (data: EditOperatorData) => {
    if (!operator) return;

    const updatedOperator: Operator = {
      ...operator,
      name: data.name,
      phone: data.phone,
      license_number: data.license_number,
      license_expiry: format(data.license_expiry, "yyyy-MM-dd"),
      medical_check_expiry: format(data.medical_check_expiry, "yyyy-MM-dd"),
      emergency_contact: data.emergency_contact,
      emergency_phone: data.emergency_phone,
    };

    onSave?.(updatedOperator);

    toast({
      title: "Cambios guardados",
      description: `El expediente de ${data.name} ha sido actualizado.`,
    });

    setIsEditing(false);
  };

  // --- File Handlers ---
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingDocId || !operator) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Archivo demasiado grande",
        variant: "destructive",
        description: "El límite es de 5MB",
      });
      return;
    }

    try {
      const result = await operatorService.uploadDocument(
        operator.id,
        uploadingDocId,
        file,
      );

      setDocuments((prev) =>
        prev.map((doc) =>
          doc.id === uploadingDocId
            ? {
                ...doc,
                fileName: file.name,
                status: "vigente",
                fileUrl: result.url,
                type: file.type.includes("image") ? "image" : "pdf",
              }
            : doc,
        ),
      );

      toast({
        title: "Éxito",
        description: "Documento guardado en el expediente del servidor.",
      });
    } catch (error) {
      toast({
        title: "Error de carga",
        variant: "destructive",
        description: "No se pudo subir el archivo al servidor.",
      });
    } finally {
      setUploadingDocId(null);
      e.target.value = "";
    }
  };

  if (!operator) return null;

  const daysUntilLicense = getDaysUntilExpiry(operator.license_expiry);
  const daysUntilMedical = getDaysUntilExpiry(operator.medical_check_expiry);
  const licenseStatus = getExpiryStatus(operator.license_expiry);
  const medicalStatus = getExpiryStatus(operator.medical_check_expiry);

  const yearsOfService = operator.hire_date
    ? differenceInYears(new Date(), new Date(operator.hire_date))
    : 0;

  return (
    <Sheet
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen && isEditing) handleCancelEditing();
        onOpenChange(isOpen);
      }}
    >
      {/* 🚀 CAPA 1: CASCARÓN DEL SHEET (Fondo azul/blanco translúcido) */}
      <SheetContent className="w-full sm:max-w-xl bg-white/90 dark:bg-brand-navy/95 backdrop-blur-xl border-l border-slate-200/80 dark:border-white/10 p-0 flex flex-col shadow-2xl transition-all duration-300">
        {/* Hidden Inputs */}
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          onChange={handleFileChange}
        />
        <input
          type="file"
          ref={avatarInputRef}
          className="hidden"
          accept="image/*"
        />

        {/* 🚀 CAPA 2: HEADER TAHOE (Blanco puro / Navy puro, z-10) */}
        <SheetHeader className="p-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-white/10 shrink-0 z-10 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-black/5 dark:from-white/5 to-transparent pointer-events-none" />
          <div className="relative z-10 flex flex-row items-center justify-between">
            <SheetTitle className="flex items-center gap-4 text-slate-800 dark:text-white text-xl font-black">
              <div
                className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center shadow-inner shrink-0 icon-plate",
                  isEditing
                    ? "bg-amber-100 dark:bg-amber-900/30"
                    : "bg-blue-100 dark:bg-blue-900/30",
                )}
              >
                <FileText
                  className={cn(
                    "h-6 w-6",
                    isEditing
                      ? "text-amber-600 dark:text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]"
                      : "text-blue-600 dark:text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.4)]",
                  )}
                />
              </div>
              <div className="flex flex-col gap-1 text-left">
                <span className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white heading-crisp leading-none">
                  Expediente Operativo
                </span>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 mt-1 tracking-normal normal-case">
                  Visualización y control documental.
                </span>
              </div>
            </SheetTitle>

            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCancelEditing}
                    className="h-10 w-10 haptic-press rounded-xl text-slate-500"
                    title="Cancelar"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                  <Button
                    size="icon"
                    onClick={form.handleSubmit(onFormSubmit)}
                    className="h-10 w-10 bg-emerald-600 hover:bg-emerald-700 text-white haptic-press border-none rounded-xl shadow-emerald-500/20"
                    title="Guardar Cambios"
                  >
                    <Save className="h-5 w-5" />
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleStartEditing}
                  className="gap-1.5 h-10 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest bg-white dark:bg-slate-800 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-slate-700 shadow-sm haptic-press"
                >
                  <Pencil className="h-4 w-4" /> Editar Datos
                </Button>
              )}
            </div>
          </div>
        </SheetHeader>

        {/* 🚀 CAPA 3: CUERPO Y FORMULARIO (Fondo slate-50 para resaltar tarjetas) */}
        <Form {...form}>
          <form className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50 dark:bg-transparent custom-scrollbar">
            {/* 🚀 Hero / Avatar Section */}
            <div className="flex flex-col items-center text-center pb-6 border-b border-slate-200 dark:border-white/10">
              <div className="relative group mt-2">
                <div
                  className={`p-1.5 rounded-full ring-4 ${getStatusColor(operator.status)} transition-all bg-white dark:bg-slate-900 shadow-xl`}
                >
                  <Avatar className="h-28 w-28 border border-slate-200 dark:border-white/10">
                    <AvatarImage
                      src={`https://api.dicebear.com/7.x/initials/svg?seed=${operator.name}`}
                    />
                    <AvatarFallback className="text-3xl font-black bg-slate-100 dark:bg-slate-800 text-brand-navy dark:text-white uppercase tracking-tighter">
                      {(operator.name || "OP").slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>

                  {isEditing && (
                    <button
                      onClick={() => avatarInputRef.current?.click()}
                      className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
                      type="button"
                    >
                      <Camera className="h-8 w-8 text-white drop-shadow-md" />
                    </button>
                  )}
                </div>

                <div
                  className={cn(
                    "absolute -bottom-2 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg border-2 border-white dark:border-slate-900",
                    (operator.status || "").toLowerCase() === "activo"
                      ? "bg-emerald-500 text-white"
                      : (operator.status || "").toLowerCase() === "inactivo"
                        ? "bg-rose-500 text-white"
                        : "bg-amber-500 text-amber-950",
                  )}
                >
                  {getStatusLabel(operator.status)}
                </div>
              </div>

              <div className="mt-6 w-full max-w-sm space-y-3">
                {isEditing ? (
                  <div className="space-y-4 bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-white/10">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              {...field}
                              className="text-center text-lg font-black uppercase bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-white/5 shadow-inner"
                            />
                          </FormControl>
                          <FormMessage className="text-center text-[10px]" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              {...field}
                              className="text-center text-sm font-mono font-bold bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-white/5 shadow-inner"
                              placeholder="Teléfono"
                            />
                          </FormControl>
                          <FormMessage className="text-center text-[10px]" />
                        </FormItem>
                      )}
                    />
                  </div>
                ) : (
                  <>
                    <h2 className="text-2xl font-black uppercase tracking-tighter text-brand-navy dark:text-white leading-none">
                      {operator.name}
                    </h2>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1.5 mt-2">
                      <User className="h-3.5 w-3.5" /> ID: {operator.id}
                    </p>
                  </>
                )}
              </div>

              {operator.assigned_unit_id && !isEditing && (
                <Badge
                  variant="outline"
                  className="mt-4 font-mono font-black text-sm bg-white dark:bg-slate-900 shadow-sm gap-2 px-4 py-1.5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300"
                >
                  <Truck className="h-4 w-4 text-blue-500" /> ECO-
                  {operator.assigned_unit_id}
                </Badge>
              )}

              {!isEditing && (
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mt-4 bg-slate-100 dark:bg-slate-800/50 px-4 py-1.5 rounded-full border border-slate-200 dark:border-white/5">
                  {yearsOfService > 0
                    ? `${yearsOfService} años`
                    : "Menos de 1 año"}{" "}
                  de Servicio Activo
                </p>
              )}
            </div>

            {/* 🚀 License Card */}
            <div className="relative overflow-hidden rounded-2xl p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-sm transition-all hover:shadow-md">
              <div className="absolute top-0 right-0 p-4 opacity-10 dark:opacity-5 pointer-events-none">
                <CreditCard className="h-24 w-24 text-blue-600 dark:text-blue-400" />
              </div>

              <div className="flex items-start justify-between mb-6 relative z-10">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1.5">
                    <CreditCard className="h-3.5 w-3.5 text-blue-500" />{" "}
                    Licencia Federal
                  </p>
                  <p className="text-2xl font-black text-brand-navy dark:text-white uppercase tracking-tighter">
                    Tipo {operator.license_type}
                  </p>
                </div>

                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] font-black uppercase tracking-widest shadow-sm px-3 py-1",
                    licenseStatus === "success"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-500/30"
                      : licenseStatus === "warning"
                        ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-500/30"
                        : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-500/30",
                  )}
                >
                  {daysUntilLicense < 0
                    ? "Vencida"
                    : `${daysUntilLicense} días`}
                </Badge>
              </div>

              {isEditing ? (
                <div className="space-y-4 relative z-10 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-white/5">
                  <FormField
                    control={form.control}
                    name="license_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel variant="brand">
                          Número de Licencia
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            className="h-10 text-sm font-mono font-bold uppercase bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-sm"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="license_expiry"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel variant="brand">Vencimiento</FormLabel>
                        <FormControl>
                          <DatePicker
                            date={field.value}
                            onDateChange={field.onChange}
                            modalTitle="Vencimiento Licencia"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              ) : (
                <div className="relative z-10">
                  <p className="font-mono text-lg font-black text-slate-800 dark:text-slate-200 mb-4 tracking-wider uppercase bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-white/5">
                    {operator.license_number}
                  </p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                      <span>Vigencia Oficial</span>
                      <span className="text-slate-800 dark:text-slate-200">
                        {operator.license_expiry
                          ? format(
                              new Date(`${operator.license_expiry}T12:00:00`),
                              "dd MMM yyyy",
                              { locale: es },
                            ).toUpperCase()
                          : "N/A"}
                      </span>
                    </div>
                    <div className="relative h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden shadow-inner border border-slate-200 dark:border-white/5">
                      <div
                        className={cn(
                          "absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-out",
                          getLicenseProgressColor(operator.license_expiry),
                        )}
                        style={{ width: "100%" }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 🚀 Medical Check Card */}
            <div
              className={cn(
                "rounded-2xl p-6 transition-all shadow-sm relative overflow-hidden",
                medicalStatus === "success"
                  ? "bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50"
                  : medicalStatus === "warning"
                    ? "bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50"
                    : "bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50",
              )}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      "p-3 rounded-xl shadow-inner border",
                      medicalStatus === "success"
                        ? "bg-emerald-500/20 border-emerald-500/30"
                        : medicalStatus === "warning"
                          ? "bg-amber-500/20 border-amber-500/30"
                          : "bg-rose-500/20 border-rose-500/30",
                    )}
                  >
                    {medicalStatus === "success" ? (
                      <CheckCircle className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                    ) : medicalStatus === "warning" ? (
                      <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                    ) : (
                      <XCircle className="h-6 w-6 text-rose-600 dark:text-rose-400" />
                    )}
                  </div>

                  <div className="flex-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                      Examen Psicofísico SCT
                    </p>
                    <p
                      className={cn(
                        "text-lg font-black uppercase tracking-tighter mt-0.5",
                        medicalStatus === "success"
                          ? "text-emerald-700 dark:text-emerald-400"
                          : medicalStatus === "warning"
                            ? "text-amber-700 dark:text-amber-400"
                            : "text-rose-700 dark:text-rose-400",
                      )}
                    >
                      {daysUntilMedical < 0
                        ? "VENCIDO"
                        : daysUntilMedical <= 30
                          ? `VENCE EN ${daysUntilMedical} DÍAS`
                          : "VIGENTE Y APROBADO"}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 w-full sm:w-auto">
                  {isEditing ? (
                    <FormField
                      control={form.control}
                      name="medical_check_expiry"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <DatePicker
                              date={field.value}
                              onDateChange={field.onChange}
                              modalTitle="Examen Médico"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : (
                    <div className="text-left sm:text-right bg-white/50 dark:bg-slate-900/50 p-3 rounded-xl border border-white/40 dark:border-white/5">
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                        Vencimiento Oficial
                      </p>
                      <p className="text-sm font-mono font-black text-slate-800 dark:text-slate-200">
                        {operator.medical_check_expiry
                          ? format(
                              new Date(
                                `${operator.medical_check_expiry}T12:00:00`,
                              ),
                              "dd MMM yyyy",
                              { locale: es },
                            ).toUpperCase()
                          : "N/A"}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 🚀 Document Management */}
            <div className="rounded-2xl p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-sm">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500 flex items-center gap-2 mb-6 border-b border-slate-100 dark:border-white/5 pb-3">
                <FileText className="h-4 w-4 text-blue-500" />
                Documentación Legal
              </h3>

              <div className="grid grid-cols-1 gap-4">
                {/* Usamos el componente DocumentUploadManager que asumo ya está estandarizado */}
                <DocumentUploadManager
                  entityId={operator.id}
                  entityType="operator"
                  docType="licencia"
                  docLabel="Licencia Federal"
                  currentUrl={operator.licencia_url}
                  onUploadSuccess={(url) => {
                    toast({ title: "Licencia Federal actualizada" });
                  }}
                />

                <DocumentUploadManager
                  entityId={operator.id}
                  entityType="operator"
                  docType="ine"
                  docLabel="INE / Identificación"
                  currentUrl={operator.ine_url}
                  onUploadSuccess={(url) => toast({ title: "INE Actualizada" })}
                />

                <DocumentUploadManager
                  entityId={operator.id}
                  entityType="operator"
                  docType="apto_medico"
                  docLabel="Examen Psicofísico"
                  currentUrl={operator.apto_medico_url}
                  onUploadSuccess={(url) =>
                    toast({ title: "Apto Médico Actualizado" })
                  }
                />
              </div>
            </div>

            {/* 🚀 Contact Info */}
            <div className="rounded-2xl p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-sm">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500 flex items-center gap-2 mb-6 border-b border-slate-100 dark:border-white/5 pb-3">
                <Phone className="h-4 w-4 text-emerald-500" />
                Contacto Adicional
              </h3>

              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4 text-sm">
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50 shadow-inner shrink-0">
                    <Heart className="h-5 w-5 text-rose-500" />
                  </div>

                  <div className="w-full space-y-2">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                      Contacto de Emergencia
                    </p>
                    {isEditing ? (
                      <div className="flex flex-col sm:flex-row gap-3">
                        <FormField
                          control={form.control}
                          name="emergency_contact"
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormControl>
                                <Input
                                  {...field}
                                  placeholder="Nombre completo"
                                  className="h-10 text-sm font-bold uppercase bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-white/5 shadow-sm"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="emergency_phone"
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormControl>
                                <div className="relative">
                                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                                  <Input
                                    {...field}
                                    placeholder="Teléfono"
                                    className="h-10 pl-9 text-sm font-mono font-bold bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-white/5 shadow-sm"
                                  />
                                </div>
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    ) : (
                      <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-white/5">
                        <p className="font-black text-brand-navy dark:text-slate-200 uppercase tracking-tight">
                          {operator.emergency_contact ||
                            "Sin contacto registrado"}
                        </p>
                        <p className="font-mono text-sm font-bold text-slate-600 dark:text-slate-400 mt-1 flex items-center gap-2">
                          <Phone className="h-3 w-3" />
                          {operator.emergency_phone || "N/A"}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Badges Read-only */}
            {!isEditing && (
              <div className="rounded-2xl p-6 bg-gradient-to-br from-amber-50 dark:from-amber-950/20 to-transparent border border-amber-100 dark:border-amber-900/50 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                  <Award className="h-24 w-24 text-amber-500" />
                </div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-700 dark:text-amber-500 flex items-center gap-2 mb-4 relative z-10">
                  <Award className="h-4 w-4 text-amber-500" /> Reconocimientos y
                  Récord
                </h3>

                <div className="flex flex-wrap gap-3 relative z-10">
                  <Badge
                    variant="outline"
                    className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30 shadow-sm"
                  >
                    <Shield className="h-3.5 w-3.5 mr-1.5" /> Sin Accidentes
                  </Badge>
                  <Badge
                    variant="outline"
                    className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/30 shadow-sm"
                  >
                    <Clock className="h-3.5 w-3.5 mr-1.5" /> Puntualidad
                  </Badge>
                  <Badge
                    variant="outline"
                    className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-500/30 shadow-sm"
                  >
                    <Fuel className="h-3.5 w-3.5 mr-1.5" /> Eco-Drive
                  </Badge>
                </div>
              </div>
            )}
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
