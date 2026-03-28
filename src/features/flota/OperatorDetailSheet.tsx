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
import { Calendar } from "@/components/ui/calendar";
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
      return "ring-muted";
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
      return "bg-rose-500";
    case "warning":
      return "bg-amber-500";
    case "success":
      return "bg-emerald-500";
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
        const d = new Date(dateStr);
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-xl border-l border-white/20 p-0 flex flex-col custom-scrollbar">
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

        {/* 🚀 Header Tahoe */}
        <SheetHeader className="p-6 bg-brand-navy/95 dark:bg-slate-900 border-b border-white/10 shrink-0">
          <div className="flex flex-row items-center justify-between">
            <SheetTitle className="text-xl font-black uppercase tracking-tighter text-white text-shadow-premium heading-crisp leading-none">
              Expediente de Operador
            </SheetTitle>

            <div className="flex items-center gap-2 mt-11 pt-4">
              {isEditing ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancelEditing}
                    className="gap-1.5 haptic-press"
                  >
                    <X className="h-4 w-4" /> Cancelar
                  </Button>

                  <Button
                    size="sm"
                    onClick={form.handleSubmit(onFormSubmit)}
                    className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white haptic-press border-none"
                  >
                    <Save className="h-4 w-4" /> Guardar
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleStartEditing}
                  className="gap-1.5 bg-white/10 text-white hover:bg-white/20 border-white/20 haptic-press"
                >
                  <Pencil className="h-4 w-4" /> Editar
                </Button>
              )}
            </div>
          </div>
        </SheetHeader>

        <Form {...form}>
          <form className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Hero / Avatar */}
            <div className="flex flex-col items-center text-center pt-2 pb-6 border-b border-slate-200 dark:border-white/10">
              <div className="relative group">
                <div
                  className={`p-1 rounded-full ring-4 ${getStatusColor(operator.status)} transition-all bg-white dark:bg-slate-900`}
                >
                  <Avatar className="h-28 w-28">
                    <AvatarImage
                      src={`https://api.dicebear.com/7.x/initials/svg?seed=${operator.name}`}
                    />
                    <AvatarFallback className="text-2xl font-black bg-slate-100 dark:bg-slate-800 text-brand-navy dark:text-white">
                      {(operator.name || "OP").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  {isEditing && (
                    <button
                      onClick={() => avatarInputRef.current?.click()}
                      className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      type="button"
                    >
                      <Camera className="h-6 w-6 text-white" />
                    </button>
                  )}
                </div>

                <div
                  className={cn(
                    "absolute -bottom-1 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-md border border-white/20",
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

              <div className="mt-5 w-full max-w-sm space-y-3">
                {isEditing ? (
                  <>
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              {...field}
                              className="text-center text-lg font-black uppercase bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-sm"
                            />
                          </FormControl>
                          <FormMessage className="text-center" />
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
                              className="text-center text-sm font-mono font-bold bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-sm"
                              placeholder="Teléfono"
                            />
                          </FormControl>
                          <FormMessage className="text-center" />
                        </FormItem>
                      )}
                    />
                  </>
                ) : (
                  <>
                    <h2 className="text-xl font-black uppercase tracking-tight text-brand-navy dark:text-white">
                      {operator.name}
                    </h2>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1">
                      <User className="h-3.5 w-3.5" /> ID: {operator.id}
                    </p>
                  </>
                )}
              </div>

              {operator.assigned_unit_id && !isEditing && (
                <Badge
                  variant="outline"
                  className="mt-4 font-mono font-bold text-xs bg-white dark:bg-slate-900 shadow-sm gap-1"
                >
                  <Truck className="h-3 w-3" /> ECO-{operator.assigned_unit_id}
                </Badge>
              )}

              {!isEditing && (
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-3">
                  {yearsOfService > 0
                    ? `${yearsOfService} años`
                    : "Menos de 1 año"}{" "}
                  en la empresa
                </p>
              )}
            </div>

            {/* License Card */}
            <div className="relative overflow-hidden rounded-2xl p-5 bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/50 shadow-sm">
              <div className="absolute top-2 right-2">
                <CreditCard className="h-10 w-10 text-blue-500/10 dark:text-blue-400/10" />
              </div>

              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">
                    Licencia Federal
                  </p>
                  <p className="text-lg font-black text-brand-navy dark:text-white uppercase tracking-tight">
                    Tipo {operator.license_type}
                  </p>
                </div>

                <Badge
                  className={cn(
                    "text-[9px] font-black uppercase tracking-widest shadow-sm",
                    licenseStatus === "success"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 hover:bg-emerald-200"
                      : licenseStatus === "warning"
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 hover:bg-amber-200"
                        : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 hover:bg-rose-200",
                  )}
                >
                  {daysUntilLicense < 0
                    ? "Vencida"
                    : `${daysUntilLicense} días`}
                </Badge>
              </div>

              {isEditing ? (
                <div className="space-y-4">
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
                            className="h-9 text-sm font-mono font-bold bg-white dark:bg-slate-900 border-blue-200 dark:border-blue-800/50"
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
                      <FormItem className="flex flex-col">
                        <FormLabel variant="brand">Vencimiento</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-bold h-9 bg-white dark:bg-slate-900 border-blue-200 dark:border-blue-800/50",
                                  !field.value && "text-muted-foreground",
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {field.value
                                  ? format(field.value, "PPP", { locale: es })
                                  : "Seleccionar fecha"}
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              ) : (
                <>
                  <p className="font-mono text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 uppercase">
                    {operator.license_number}
                  </p>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                      <span>Vigencia</span>
                      <span>
                        {operator.license_expiry
                          ? format(
                              new Date(operator.license_expiry),
                              "dd MMM yyyy",
                              { locale: es },
                            )
                          : "N/A"}
                      </span>
                    </div>
                    <div className="relative h-2 rounded-full bg-blue-200/50 dark:bg-blue-950/50 overflow-hidden shadow-inner">
                      <div
                        className={cn(
                          "absolute inset-y-0 left-0 rounded-full",
                          getLicenseProgressColor(operator.license_expiry),
                        )}
                        style={{ width: "100%" }}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Medical Check Card */}
            <div
              className={cn(
                "rounded-2xl p-5 border transition-all shadow-sm",
                medicalStatus === "success"
                  ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50"
                  : medicalStatus === "warning"
                    ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50"
                    : "bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50",
              )}
            >
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    "p-3 rounded-xl shadow-inner",
                    medicalStatus === "success"
                      ? "bg-emerald-500/20"
                      : medicalStatus === "warning"
                        ? "bg-amber-500/20"
                        : "bg-rose-500/20",
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
                    Examen Psicofísico
                  </p>
                  <p
                    className={cn(
                      "text-sm font-black uppercase tracking-tight mt-0.5",
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
                        : "VIGENTE"}
                  </p>
                </div>

                {isEditing ? (
                  <FormField
                    control={form.control}
                    name="medical_check_expiry"
                    render={({ field }) => (
                      <FormItem>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                size="sm"
                                className="bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-sm haptic-press"
                              >
                                <CalendarIcon className="h-4 w-4" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="end">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : (
                  <div className="text-right">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                      Vence
                    </p>
                    <p className="text-sm font-mono font-bold text-slate-700 dark:text-slate-300">
                      {operator.medical_check_expiry
                        ? format(
                            new Date(operator.medical_check_expiry),
                            "dd/MM/yy",
                          )
                        : "N/A"}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Document Management */}
            <div className="rounded-2xl p-5 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 shadow-sm">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500 flex items-center gap-2 mb-4">
                <FileText className="h-4 w-4 text-brand-navy dark:text-slate-300" />{" "}
                Documentación Legal
              </h3>

              <div className="grid grid-cols-1 gap-3">
                {/* Licencia Federal */}
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

                {/* INE */}
                <DocumentUploadManager
                  entityId={operator.id}
                  entityType="operator"
                  docType="ine"
                  docLabel="INE / Identificación"
                  currentUrl={operator.ine_url}
                  onUploadSuccess={(url) => toast({ title: "INE Actualizada" })}
                />

                {/* Apto Médico */}
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

            {/* Contact Info */}
            <div className="rounded-2xl p-5 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 shadow-sm">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500 flex items-center gap-2 mb-4">
                <Phone className="h-4 w-4 text-brand-navy dark:text-slate-300" />{" "}
                Contacto Adicional
              </h3>

              <div className="space-y-4">
                <div className="flex items-center gap-4 text-sm">
                  <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 shadow-inner">
                    <Heart className="h-4 w-4 text-rose-500" />
                  </div>

                  <div className="w-full space-y-1">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                      Emergencia (Nombre / Teléfono)
                    </p>
                    {isEditing ? (
                      <div className="flex gap-2 mt-1">
                        <FormField
                          control={form.control}
                          name="emergency_contact"
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormControl>
                                <Input
                                  {...field}
                                  placeholder="Nombre"
                                  className="h-9 text-sm bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-white/10 font-bold shadow-sm"
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
                                <Input
                                  {...field}
                                  placeholder="Teléfono"
                                  className="h-9 text-sm font-mono bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-white/10 font-bold shadow-sm"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    ) : (
                      <>
                        <p className="font-bold text-slate-800 dark:text-slate-200 uppercase text-xs tracking-tight">
                          {operator.emergency_contact ||
                            "Sin contacto registrado"}
                        </p>
                        <p className="font-mono text-xs font-bold text-brand-navy dark:text-slate-400 mt-0.5">
                          {operator.emergency_phone || "N/A"}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Badges Read-only */}
            {!isEditing && (
              <div className="rounded-2xl p-5 bg-gradient-to-br from-amber-50 dark:from-amber-950/20 to-transparent border border-amber-100 dark:border-amber-900/50 shadow-sm">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-700 dark:text-amber-500 flex items-center gap-2 mb-3">
                  <Award className="h-4 w-4 text-amber-500" /> Reconocimientos
                </h3>

                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant="outline"
                    className="text-[9px] font-black uppercase tracking-widest bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30 shadow-sm"
                  >
                    <Shield className="h-3 w-3 mr-1" /> Sin Accidentes
                  </Badge>
                  <Badge
                    variant="outline"
                    className="text-[9px] font-black uppercase tracking-widest bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/30 shadow-sm"
                  >
                    <Clock className="h-3 w-3 mr-1" /> Puntualidad
                  </Badge>
                  <Badge
                    variant="outline"
                    className="text-[9px] font-black uppercase tracking-widest bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-500/30 shadow-sm"
                  >
                    <Fuel className="h-3 w-3 mr-1" /> Eficiencia
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
