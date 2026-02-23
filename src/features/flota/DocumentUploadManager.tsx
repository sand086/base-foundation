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
    return <FileSpreadsheet className="w-4 h-4 text-emerald-600" />;
  }
  if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) {
    return <FileArchive className="w-4 h-4 text-indigo-600" />;
  }
  if (["pdf"].includes(ext)) {
    return <FileText className="w-4 h-4 text-rose-600" />;
  }
  return <FileIcon className="w-4 h-4 text-blue-600" />;
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
    <div className="flex flex-col gap-3 p-4 border rounded-xl bg-white/5 border-black/10 shadow-sm hover:border-primary/20 transition-all">
      <div className="flex justify-between items-start gap-3">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <Label className="font-bold text-sm text-foreground/90 truncate">
              {docLabel}
            </Label>
            {statusBadge}
          </div>
          {lastUploadDate && (
            <p className="text-[10px] text-muted-foreground font-mono">
              Ult: {formatDate(lastUploadDate)}
            </p>
          )}
        </div>

        <Dialog onOpenChange={(o) => o && void loadHistory(false)}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[10px] font-bold uppercase gap-1.5 border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100"
            >
              <History className="w-3.5 h-3.5" /> Lista / Historial
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Documentos: {docLabel}</DialogTitle>
            </DialogHeader>

            <ScrollArea className="h-[350px] mt-4 pr-4">
              {history.length === 0 ? (
                <p className="text-center text-muted-foreground py-10 text-xs">
                  No hay documentos cargados.
                </p>
              ) : (
                <div className="space-y-3">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      className={`
                        flex items-center justify-between p-3 rounded-lg border
                        ${
                          item.is_active
                            ? "bg-emerald-50 border-emerald-200"
                            : "bg-card"
                        }
                      `}
                    >
                      <div className="space-y-1 overflow-hidden min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          {getFileIcon(item.filename)}
                          <p
                            className="text-xs font-bold truncate w-48"
                            title={item.filename}
                          >
                            {item.filename}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[9px]">
                            v{item.version}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">
                            {item.created_at
                              ? formatDate(item.created_at)
                              : "N/A"}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          asChild
                        >
                          <a
                            href={getFullUrl(item.file_url)}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Eye className="w-4 h-4 text-primary" />
                          </a>
                        </Button>

                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive"
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

      <div className="flex items-end gap-3 mt-1">
        <div className="relative flex-1">
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
            className={[
              "flex items-center justify-center w-full h-9 px-3 text-[11px] font-bold uppercase transition-all",
              "border border-dashed rounded-lg cursor-pointer bg-background/50 hover:bg-accent",
              isUploading ? "opacity-50 cursor-not-allowed" : "",
            ].join(" ")}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />
                Subiendo...
              </>
            ) : (
              <>
                <Upload className="w-3.5 h-3.5 mr-2" />
                {currentUrl ? "Cargar Nuevo / Reemplazar" : "Subir Archivo"}
              </>
            )}
          </Label>
        </div>

        {dateInput && <div className="flex-1 min-w-[130px]">{dateInput}</div>}

        {currentUrl && (
          <Button
            variant="default"
            size="sm"
            className="h-9 px-3 bg-emerald-600 hover:bg-emerald-700 text-white"
            asChild
          >
            <a
              href={getFullUrl(currentUrl)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Eye className="w-4 h-4" />
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}
