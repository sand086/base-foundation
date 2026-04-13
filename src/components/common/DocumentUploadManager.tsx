// src/features/flota/DocumentUploadManager.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Upload,
  History,
  Eye,
  Loader2,
  Trash2,
  FileText,
  FileSpreadsheet,
  FileArchive,
  File as FileIcon,
} from "lucide-react";
import {
  FleetUnitsService,
  FleetOperatorsService,
  FleetFuelService,
} from "@/api/generated";
import { clientService } from "@/features/clients/services/clientService";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter, // Importado para cumplir la regla de 4 capas
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import axiosClient from "@/api/axiosClient";
import { cn } from "@/lib/utils";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "/";

//   Extendemos los tipos soportados
export type EntityType =
  | "unit"
  | "client"
  | "operator"
  | "fuel"
  | "cxp_payment"
  | "cxc_payment"
  | "bank_movement"
  | "trip_delivery";

export type DocHistoryItem = {
  id: number;
  filename: string;
  file_url: string;
  version: number;
  created_at: string | null;
  is_active?: boolean;
  mime_type?: string | null;
  size_bytes?: number | null;
};

export interface DocumentUploadManagerProps {
  entityId: number | string;
  entityType: EntityType;
  docType: string;
  docLabel: string;
  currentUrl?: string | null;
  onUploadSuccess: (newUrl: string) => void;
  statusBadge?: React.ReactNode;
  dateInput?: React.ReactNode;
  accept?: string;

  // unitId permite que el documento “pertenezca” a unit aunque entityId sea otra cosa
  unitId?: number;
  unitEconomico?: string;
}

const DEFAULT_ACCEPT = ".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.csv,.txt";

const getFullUrl = (path: string) => {
  if (!path) return "";
  if (
    path.startsWith("http") ||
    path.startsWith("data:") ||
    path.startsWith("blob:")
  ) {
    return path;
  }

  const baseUrl = (
    import.meta.env.VITE_BACKEND_URL || window.location.origin
  ).replace(/\/api$/, "");

  // 2. Limpiamos el path que viene de la DB (ej: /static/operators/...)
  const cleanPath = path.startsWith("/") ? path : `/${path}`;

  // 3. Forzamos el prefijo /api si el path no lo tiene
  // Esto asegura que la ruta sea /api/static/...
  const finalPath = cleanPath.startsWith("/api")
    ? cleanPath
    : `/api${cleanPath}`;

  return `${baseUrl}${finalPath}`;
};

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

const getFileIcon = (filename: string) => {
  const ext = (filename.split(".").pop() || "").toLowerCase();
  if (["xlsx", "xls", "csv"].includes(ext)) {
    return (
      <FileSpreadsheet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
    );
  }
  if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) {
    return (
      <FileArchive className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
    );
  }
  if (["pdf"].includes(ext)) {
    return <FileText className="w-5 h-5 text-rose-600 dark:text-rose-400" />;
  }
  return <FileIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
};

function buildHistoryEndpoint(
  entityType: EntityType,
  activeId: number,
  docType: string,
) {
  if (
    ["cxp_payment", "cxc_payment", "bank_movement", "trip_delivery"].includes(
      entityType,
    )
  ) {
    return `/api/utils/receipt/${entityType}/${activeId}/history`;
  }
  switch (entityType) {
    case "unit":
      return `/api/fleet/units/${activeId}/documents/${docType}/history`;
    case "client":
      return `/api/clients/${activeId}/documents/${docType}/history`;
    case "operator":
      return `/api/fleet/operators/${activeId}/documents/${docType}/history`;
    case "fuel":
      return `/api/fleet/fuel-logs/${activeId}/documents/${docType}/history`;
  }
}

function buildDeleteEndpoint(entityType: EntityType, docId: number) {
  if (
    ["cxp_payment", "cxc_payment", "bank_movement", "trip_delivery"].includes(
      entityType,
    )
  ) {
    // Aquí docId es el id de la entidad (pago/viaje) porque así lo armamos en el backend
    return `/api/utils/receipt/${entityType}/${docId}`;
  }
  switch (entityType) {
    case "client":
      return `/api/clients/documents/${docId}`;
    case "unit":
      return `/api/fleet/units/documents/${docId}`;
    case "operator":
      return `/api/fleet/operators/documents/${docId}`;
    case "fuel":
      return `/api/fleet/fuel-logs/documents/${docId}`;
  }
}

export function DocumentUploadManager({
  entityId,
  unitId,
  entityType,
  docType,
  docLabel,
  currentUrl,
  onUploadSuccess,
  statusBadge,
  dateInput,
  accept = DEFAULT_ACCEPT,
}: DocumentUploadManagerProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [history, setHistory] = useState<DocHistoryItem[]>([]);
  const [lastUploadDate, setLastUploadDate] = useState<string | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  const activeId = useMemo(() => {
    if (entityType === "unit") return (unitId ?? entityId) as number;
    return entityId as number;
  }, [entityId, unitId, entityType]);

  const inputId = `file-${entityType}-${activeId}-${docType}`;

  //   useCallback (update)
  const loadHistory = useCallback(
    async (showToast = true) => {
      if (!activeId) return;

      try {
        const endpoint = buildHistoryEndpoint(entityType, activeId, docType);
        const res = await axiosClient.get(endpoint);

        const items = (res.data || []) as DocHistoryItem[];
        setHistory(items);

        const activeDoc = items.find((d) => d.is_active) ?? items[0];
        if (activeDoc?.created_at) setLastUploadDate(activeDoc.created_at);
        else setLastUploadDate(null);
      } catch (error) {
        console.error("Error al cargar historial:", error);
        if (showToast) toast.error("Error al cargar historial");
      }
    },
    [activeId, entityType, docType],
  );

  //   useEffect con loadHistory estable
  useEffect(() => {
    if (activeId) void loadHistory(false);
  }, [activeId, currentUrl, loadHistory]);

  //   Lógica de servicio dinámica para subida
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeId) return;
    setIsUploading(true);

    try {
      let result: any;

      if (
        [
          "cxp_payment",
          "cxc_payment",
          "bank_movement",
          "trip_delivery",
        ].includes(entityType)
      ) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await axiosClient.post(
          `/api/utils/upload-receipt/${entityType}/${activeId}`,
          formData,
        );
        result = res.data;
      } else if (entityType === "unit") {
        result =
          await FleetUnitsService.uploadUnitDocumentApiFleetUnitsUnitTermDocumentsDocTypePost(
            String(activeId),
            docType,
            { file },
          );
      } else if (entityType === "client") {
        result = await clientService.uploadDocument(activeId, docType, file);
      } else if (entityType === "operator") {
        result =
          await FleetOperatorsService.uploadOperatorDocumentApiFleetOperatorsOperatorIdDocumentsDocTypePost(
            Number(activeId),
            docType,
            { file },
          );
      } else if (entityType === "fuel") {
        result =
          await FleetFuelService.uploadFuelDocumentApiFleetFuelLogsLogIdDocumentsDocTypePost(
            Number(activeId),
            docType,
            { file },
          );
      }

      if (result?.url) {
        toast.success("Archivo cargado con éxito");
        onUploadSuccess(result.url);
        await loadHistory(false);
      }
    } catch (error) {
      console.error("Error al subir documento:", error);
      toast.error("Error al subir documento");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  //   Lógica de eliminación dinámica
  const handleDelete = async (docId: number) => {
    const ok = confirm("¿Estás seguro de eliminar esta versión?");
    if (!ok) return;

    try {
      const endpoint = buildDeleteEndpoint(entityType, docId);
      await axiosClient.delete(endpoint);

      toast.success("Documento eliminado");
      await loadHistory(false);
    } catch (error) {
      console.error("Error al eliminar documento:", error);
      toast.error("No se pudo eliminar el documento");
    }
  };

  return (
    <div className="flex flex-col gap-4 p-5 rounded-2xl bg-white/60 dark:bg-slate-900/50 border border-slate-200/80 dark:border-white/10 shadow-sm hover:shadow-md transition-all group backdrop-blur-sm">
      {/* Cabecera del Gestor de Documentos */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex items-center gap-3 min-w-0">
            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-navy dark:text-slate-200 truncate leading-none">
              {docLabel}
            </Label>
            {statusBadge}
          </div>
          {lastUploadDate ? (
            <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1 flex items-center gap-1.5">
              Última act:{" "}
              <span className="font-mono text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded shadow-inner">
                {formatDate(lastUploadDate)}
              </span>
            </p>
          ) : (
            <p className="text-[9px] font-black text-amber-600 dark:text-amber-500 uppercase tracking-widest mt-1">
              Sin documento registrado
            </p>
          )}
        </div>

        {/*  Modal de Historial (Estructura Tahoe 4 Capas) */}
        <Dialog
          open={isHistoryModalOpen}
          onOpenChange={(open) => {
            setIsHistoryModalOpen(open);
            if (open) void loadHistory(false);
          }}
        >
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-9 text-[9px] font-black uppercase tracking-widest gap-2 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-brand-navy dark:hover:text-white haptic-press w-full sm:w-auto shadow-sm"
            >
              <History className="w-3.5 h-3.5" /> Historial
            </Button>
          </DialogTrigger>

          {/* CAPA 1: CASCARÓN */}
          <DialogContent className="w-[95vw] sm:max-w-2xl p-0 flex flex-col max-h-[90vh] bg-white/90 dark:bg-brand-navy/95 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-2xl rounded-2xl transition-all duration-300 overflow-hidden">
            {/* CAPA 2: HEADER TAHOE */}
            <DialogHeader className="p-6 sm:px-8 sm:py-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-white/10 shrink-0 z-10 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-black/5 dark:from-white/5 to-transparent pointer-events-none" />
              <div className="relative z-10 flex items-center gap-4 sm:gap-5">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shadow-inner shrink-0 icon-plate">
                  <History className="h-7 w-7 sm:h-8 sm:w-8 text-blue-600 dark:text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.4)]" />
                </div>
                <div className="flex flex-col gap-1 text-left min-w-0">
                  <DialogTitle className="text-xl sm:text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white heading-crisp leading-none truncate">
                    {docLabel}
                  </DialogTitle>
                  <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 mt-1">
                    Control de Versiones y Expediente Técnico
                  </p>
                </div>
              </div>
            </DialogHeader>

            {/* CAPA 3: CUERPO (Fondo hundido y scroll) */}
            <div className="flex-1 overflow-hidden flex flex-col min-h-0 bg-slate-50/50 dark:bg-transparent">
              <ScrollArea className="flex-1 p-6 sm:p-8 custom-scrollbar">
                {history.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-slate-200 dark:border-white/10 rounded-2xl bg-white/50 dark:bg-slate-900/30">
                    <div className="h-16 w-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4 shadow-inner">
                      <FileText className="h-8 w-8 text-slate-400 dark:text-slate-500" />
                    </div>
                    <p className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                      Registro Documental Vacío
                    </p>
                    <p className="text-xs font-medium text-slate-400 dark:text-slate-500 mt-2">
                      Sube un documento para iniciar el control de versiones.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {history.map((item) => (
                      <div
                        key={item.id}
                        className={cn(
                          "flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 rounded-2xl border shadow-sm transition-all group hover:shadow-md",
                          item.is_active
                            ? "bg-emerald-50/80 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50"
                            : "bg-white dark:bg-slate-900/80 border-slate-200 dark:border-white/10",
                        )}
                      >
                        <div className="flex items-center gap-4 overflow-hidden min-w-0 mb-4 sm:mb-0">
                          <div
                            className={cn(
                              "p-3 rounded-xl shadow-inner shrink-0",
                              item.is_active
                                ? "bg-emerald-500/20"
                                : "bg-slate-100 dark:bg-slate-800",
                            )}
                          >
                            {getFileIcon(item.filename)}
                          </div>
                          <div className="flex flex-col min-w-0 gap-1.5">
                            <p
                              className="text-sm font-black tracking-tight text-brand-navy dark:text-slate-200 truncate pr-2"
                              title={item.filename}
                            >
                              {item.filename}
                            </p>
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[9px] font-black uppercase tracking-widest px-2 py-0.5",
                                  item.is_active
                                    ? "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-500/50 shadow-sm"
                                    : "bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-white/10",
                                )}
                              >
                                v{item.version} {item.is_active && " (Activo)"}
                              </Badge>
                              <span className="text-[10px] font-mono font-bold tracking-widest text-slate-500 dark:text-slate-400 bg-white/60 dark:bg-slate-950/50 px-1.5 rounded">
                                {item.created_at
                                  ? formatDate(item.created_at)
                                  : "N/A"}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 shrink-0 sm:ml-4 border-t sm:border-t-0 border-slate-200 dark:border-white/5 pt-3 sm:pt-0">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-9 px-3 text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/50 hover:bg-blue-50 dark:hover:bg-blue-900/30 shadow-sm transition-colors"
                            asChild
                          >
                            <a
                              href={getFullUrl(item.file_url)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5"
                            >
                              <Eye className="w-3.5 h-3.5" /> Ver
                            </a>
                          </Button>

                          {!item.is_active && (
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-9 w-9 text-rose-500 dark:text-rose-400 border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-900/30 shadow-sm transition-colors"
                              onClick={() => void handleDelete(item.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* CAPA 4: FOOTER */}
            <DialogFooter className="p-6 sm:p-8 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-t border-slate-200 dark:border-white/10 shrink-0 z-10">
              <div className="flex w-full justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => setIsHistoryModalOpen(false)}
                  className="w-full sm:w-auto haptic-press font-black uppercase tracking-widest text-[10px]"
                >
                  Cerrar Historial
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Inputs Activos (Subida y Fecha) - Fuera del modal */}
      <div className="flex flex-col sm:flex-row items-end gap-4 mt-2">
        <div className="relative flex-1 w-full">
          <Input
            type="file"
            className="hidden"
            id={inputId}
            onChange={handleFileChange}
            accept={accept}
            disabled={isUploading}
          />

          <Label
            htmlFor={inputId}
            className={cn(
              "flex items-center justify-center w-full h-12 px-4 text-[10px] font-black uppercase tracking-widest transition-all border-2 border-dashed rounded-xl cursor-pointer shadow-sm haptic-press",
              isUploading
                ? "opacity-50 cursor-not-allowed bg-slate-100 border-slate-300 text-slate-400 dark:bg-slate-800 dark:border-slate-700"
                : "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-brand-navy/40 dark:hover:border-blue-500/40 text-slate-600 dark:text-slate-300 hover:text-brand-navy dark:hover:text-white",
            )}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Sincronizando...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                {currentUrl ? "Actualizar Documento" : "Cargar Archivo"}
              </>
            )}
          </Label>
        </div>

        {/* Input Opcional de Fecha */}
        {dateInput && (
          <div className="flex-1 w-full min-w-[130px]">{dateInput}</div>
        )}

        {/* Botón Ver Documento Actual */}
        {currentUrl && (
          <Button
            variant="default"
            size="lg"
            className="h-12 px-6 bg-brand-navy hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white rounded-xl shadow-lg border-none flex items-center justify-center haptic-press w-full sm:w-auto text-[10px] font-black uppercase tracking-widest"
            asChild
          >
            <a
              href={getFullUrl(currentUrl)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Eye className="w-4 h-4 mr-2" />
              Ver Vigente
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}
