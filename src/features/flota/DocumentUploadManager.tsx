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
import { unitService } from "@/services/unitService";
import { clientService } from "@/services/clientService";
import { operatorService } from "@/services/operatorService";
import { fuelService } from "@/services/fuelService"; // ✅ IMPORTANTE
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import axiosClient from "@/api/axiosClient";
import { cn } from "@/lib/utils";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "/";

// ✅ Extendemos los tipos soportados
export type EntityType = "unit" | "client" | "operator" | "fuel";

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
  if (path.startsWith("http")) return path;
  return `${BACKEND_URL}${path.startsWith("/") ? "" : "/"}${path}`;
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
  switch (entityType) {
    case "unit":
      return `/units/${activeId}/documents/${docType}/history`;
    case "client":
      return `/clients/${activeId}/documents/${docType}/history`;
    case "operator":
      return `/operators/${activeId}/documents/${docType}/history`;
    case "fuel":
      return `/fuel-logs/${activeId}/documents/${docType}/history`;
  }
}

function buildDeleteEndpoint(entityType: EntityType, docId: number) {
  switch (entityType) {
    case "client":
      return `/clients/documents/${docId}`;
    case "unit":
      return `/units/documents/${docId}`;
    case "operator":
      return `/operators/documents/${docId}`;
    case "fuel":
      return `/fuel-logs/documents/${docId}`;
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

  const activeId = useMemo(() => {
    if (entityType === "unit") return (unitId ?? entityId) as number;
    return entityId as number;
  }, [entityId, unitId, entityType]);

  const inputId = `file-${entityType}-${activeId}-${docType}`;

  // ✅ useCallback (update)
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

  // ✅ useEffect con loadHistory estable
  useEffect(() => {
    if (activeId) void loadHistory(false);
  }, [activeId, currentUrl, loadHistory]);

  // ✅ Lógica de servicio dinámica para subida
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeId) return;
    setIsUploading(true);

    try {
      let result: { url: string } | undefined;

      if (entityType === "unit") {
        result = await unitService.uploadDocument(activeId, docType, file);
      } else if (entityType === "client") {
        result = await clientService.uploadDocument(activeId, docType, file);
      } else if (entityType === "operator") {
        result = await operatorService.uploadDocument(activeId, docType, file);
      } else if (entityType === "fuel") {
        result = await fuelService.uploadDocument(activeId, docType, file);
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

  // ✅ Lógica de eliminación dinámica
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
    <div className="flex flex-col gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 shadow-sm hover:shadow-md transition-all group">
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
            <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">
              Última act:{" "}
              <span className="font-mono">{formatDate(lastUploadDate)}</span>
            </p>
          ) : (
            <p className="text-[9px] font-bold text-amber-500 uppercase tracking-widest mt-1">
              Sin documento registrado
            </p>
          )}
        </div>

        {/* Modal de Historial */}
        <Dialog onOpenChange={(o) => o && void loadHistory(false)}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-[9px] font-black uppercase tracking-widest gap-1.5 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-brand-navy dark:hover:text-white haptic-press w-full sm:w-auto"
            >
              <History className="w-3.5 h-3.5" /> Historial
            </Button>
          </DialogTrigger>

          <DialogContent className="w-[95vw] sm:max-w-lg flex-col max-h-[90vh] overflow-hidden p-0 border-none shadow-2xl animate-modal-show bg-white/90 dark:bg-brand-navy/95 backdrop-blur-xl rounded-2xl">
            {/* Header Tahoe */}
            <DialogHeader className="p-6 bg-brand-navy/95 dark:bg-slate-900 backdrop-blur-md shrink-0 border-b border-white/10 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
              <div className="relative z-10 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center shadow-inner shrink-0 icon-plate">
                  <History className="h-6 w-6 text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.4)]" />
                </div>
                <div className="flex flex-col gap-1 text-left">
                  <DialogTitle className="text-xl font-black uppercase tracking-tighter text-white text-shadow-premium heading-crisp leading-none truncate pr-4">
                    {docLabel}
                  </DialogTitle>
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-brand-secondary dark:text-slate-400 mt-1">
                    Control de Versiones y Expediente
                  </p>
                </div>
              </div>
            </DialogHeader>

            <ScrollArea className="flex-1 overflow-y-auto p-6 bg-slate-50/50 dark:bg-transparent custom-scrollbar max-h-[50vh]">
              {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="h-12 w-12 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center mb-3">
                    <FileText className="h-6 w-6 text-slate-400 dark:text-slate-500" />
                  </div>
                  <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    No hay documentos en el historial
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      className={cn(
                        "flex items-center justify-between p-4 rounded-xl border shadow-sm transition-all",
                        item.is_active
                          ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50"
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10",
                      )}
                    >
                      <div className="flex items-center gap-3 overflow-hidden min-w-0">
                        <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0">
                          {getFileIcon(item.filename)}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <p
                            className="text-[11px] font-bold tracking-tight text-slate-700 dark:text-slate-200 truncate pr-2"
                            title={item.filename}
                          >
                            {item.filename}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[8px] font-black uppercase tracking-widest px-1.5 py-0",
                                item.is_active
                                  ? "text-emerald-600 border-emerald-300 dark:text-emerald-400 dark:border-emerald-500/50"
                                  : "text-slate-500 border-slate-200 dark:text-slate-400 dark:border-white/10",
                              )}
                            >
                              v{item.version}
                            </Badge>
                            <span className="text-[9px] font-bold tracking-widest text-slate-400 uppercase font-mono">
                              {item.created_at
                                ? formatDate(item.created_at)
                                : "N/A"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg"
                          asChild
                        >
                          <a
                            href={getFullUrl(item.file_url)}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Eye className="w-4 h-4" />
                          </a>
                        </Button>

                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg"
                          onClick={() => void handleDelete(item.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>

      {/* Inputs Activos (Subida y Fecha) */}
      <div className="flex flex-col sm:flex-row items-end gap-3 mt-1">
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
              "flex items-center justify-center w-full h-11 px-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all border-2 border-dashed rounded-xl cursor-pointer shadow-sm haptic-press",
              isUploading
                ? "opacity-50 cursor-not-allowed bg-slate-100 border-slate-300 text-slate-400 dark:bg-slate-800 dark:border-slate-700"
                : "bg-slate-50 dark:bg-slate-900/50 border-slate-300 dark:border-slate-700 hover:bg-brand-navy/5 dark:hover:bg-brand-navy/20 hover:border-brand-navy/30 dark:hover:border-blue-500/30 text-slate-600 dark:text-slate-300 hover:text-brand-navy dark:hover:text-white",
            )}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Subiendo Documento...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                {currentUrl ? "Reemplazar Documento" : "Subir Archivo"}
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
            className="h-11 px-5 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white rounded-xl shadow-md flex items-center justify-center haptic-press w-full sm:w-auto"
            asChild
          >
            <a
              href={getFullUrl(currentUrl)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Eye className="w-4 h-4 mr-2" />
              Ver Actual
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}
