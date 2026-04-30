import React, { useEffect, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  History,
  Clock,
  Globe,
  FileText,
  Edit,
  Trash2,
  Plus,
  Eye,
  Download,
  LogIn,
  LogOut,
  Shield,
  RefreshCw,
  Laptop,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuditLogs } from "@/features/audit/hooks/useAuditLogs";

//  1. IMPORTAMOS TU COMPONENTE MÁGICO
import {
  EnhancedDataTable,
  ColumnDef,
} from "@/components/ui/enhanced-data-table";

/** UI shape (camelCase) */
export interface AuditLogEntry {
  id: string;
  usuario: string;
  accion: string;
  tipoAccion:
    | "crear"
    | "editar"
    | "eliminar"
    | "ver"
    | "exportar"
    | "login"
    | "logout"
    | "seguridad";
  modulo: string;
  detalles: string;
  ip: string;
  fechaHora: string;
  dispositivo?: string;
}

/** API shape (snake_case) */
type AuditLogApiUser =
  | string
  | { nombre?: string; apellido?: string; email?: string }
  | null
  | undefined;

type AuditLogApi = {
  id: string | number;
  usuario?: AuditLogApiUser;
  accion: string;
  tipoAccion: string;
  modulo: string;
  detalles?: string | null;
  ip?: string | null;
  dispositivo?: string | null;
  fechaHora: string; // ISO
};

const toUserName = (u: AuditLogApiUser): string => {
  if (!u) return "Sistema";
  if (typeof u === "string") return u;
  const full = [u.nombre, u.apellido].filter(Boolean).join(" ").trim();
  return full || u.email || "Sistema";
};

const coerceTipoAccion = (v: string): AuditLogEntry["tipoAccion"] => {
  const x = (v || "").toLowerCase();
  if (
    [
      "crear",
      "editar",
      "eliminar",
      "ver",
      "exportar",
      "login",
      "logout",
      "seguridad",
    ].includes(x)
  )
    return x as AuditLogEntry["tipoAccion"];
  return "seguridad";
};

const formatFechaHora = (iso: string) => {
  if (!iso) return "";
  if (iso.includes(" ") && iso.length >= 16) return iso;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

const getActionIcon = (tipo: AuditLogEntry["tipoAccion"]) => {
  switch (tipo) {
    case "crear":
      return <Plus className="h-3 w-3" />;
    case "editar":
      return <Edit className="h-3 w-3" />;
    case "eliminar":
      return <Trash2 className="h-3 w-3" />;
    case "ver":
      return <Eye className="h-3 w-3" />;
    case "exportar":
      return <Download className="h-3 w-3" />;
    case "login":
      return <LogIn className="h-3 w-3" />;
    case "logout":
      return <LogOut className="h-3 w-3" />;
    case "seguridad":
      return <Shield className="h-3 w-3" />;
    default:
      return <FileText className="h-3 w-3" />;
  }
};

const getActionColor = (tipo: AuditLogEntry["tipoAccion"]) => {
  switch (tipo) {
    case "crear":
    case "login":
      return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-500/5 dark:text-emerald-400 dark:border-emerald-500/30";
    case "editar":
      return "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:bg-amber-500/5 dark:text-amber-400 dark:border-amber-500/30";
    case "eliminar":
      return "bg-rose-500/10 text-rose-600 border-rose-500/20 dark:bg-brand-red/10 dark:text-red-400 dark:border-brand-red/30";
    case "ver":
      return "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:bg-blue-500/5 dark:text-blue-400 dark:border-blue-500/30";
    case "exportar":
      return "bg-purple-500/10 text-purple-600 border-purple-500/20 dark:bg-purple-500/5 dark:text-purple-400 dark:border-purple-500/30";
    case "seguridad":
      return "bg-orange-500/10 text-orange-600 border-orange-500/20 dark:bg-orange-500/5 dark:text-orange-400 dark:border-orange-500/30";
    case "logout":
    default:
      return "bg-slate-500/10 text-slate-600 border-slate-500/20 dark:bg-white/5 dark:text-white/50 dark:border-white/10";
  }
};

interface AuditLogPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuditLogPanel({ open, onOpenChange }: AuditLogPanelProps) {
  const { logs, isLoading, fetchLogs } = useAuditLogs();

  useEffect(() => {
    if (open) fetchLogs();
  }, [open, fetchLogs]);

  // Parseamos los datos
  const uiLogs: AuditLogEntry[] = useMemo(() => {
    return (logs as unknown as AuditLogApi[]).map((l) => ({
      id: String(l.id),
      usuario: toUserName(l.usuario),
      accion: l.accion,
      tipoAccion: coerceTipoAccion(l.tipoAccion),
      modulo: l.modulo,
      detalles: l.detalles ?? "",
      ip: l.ip ?? "-",
      fechaHora: formatFechaHora(l.fechaHora),
      dispositivo: l.dispositivo ?? undefined,
    }));
  }, [logs]);

  // Extraemos los módulos únicos para el filtro de la tabla
  const uniqueModules = useMemo(
    () => Array.from(new Set(uiLogs.map((log) => log.modulo))),
    [uiLogs],
  );

  //  2. DEFINICIÓN DE COLUMNAS PARA EL ENHANCED DATA TABLE
  const columns: ColumnDef<AuditLogEntry>[] = useMemo(
    () => [
      {
        key: "fechaHora",
        header: "Fecha / Hora",
        type: "date",
        width: "w-[160px]",
        render: (val) => (
          <div className="flex items-center gap-2 font-mono text-[11px] text-slate-500 dark:text-slate-400">
            <Clock className="h-3 w-3 text-emerald-500" />
            {val}
          </div>
        ),
      },
      {
        key: "usuario",
        header: "Usuario",
        type: "text",
        width: "w-[180px]",
        render: (val) => (
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded-lg bg-brand-navy text-white flex items-center justify-center font-black text-[10px] shadow-sm">
              {String(val).substring(0, 2).toUpperCase()}
            </div>
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
              {val}
            </span>
          </div>
        ),
      },
      {
        key: "tipoAccion",
        header: "Acción",
        type: "status",
        statusOptions: [
          "crear",
          "editar",
          "eliminar",
          "ver",
          "exportar",
          "login",
          "logout",
          "seguridad",
        ],
        width: "w-[130px]",
        render: (val) => (
          <Badge
            variant="outline"
            className={cn(
              "gap-1.5 whitespace-nowrap font-black text-[9px] uppercase tracking-tighter px-2.5 py-1 shadow-sm backdrop-blur-md",
              getActionColor(val as AuditLogEntry["tipoAccion"]),
            )}
          >
            {getActionIcon(val as AuditLogEntry["tipoAccion"])}
            {val}
          </Badge>
        ),
      },
      {
        key: "modulo",
        header: "Módulo",
        type: "status",
        statusOptions: uniqueModules, // Módulos dinámicos para el menú de filtros
        width: "w-[120px]",
        render: (val) => (
          <span className="text-[10px] font-black text-slate-500 dark:text-slate-300 uppercase tracking-widest bg-slate-100/80 dark:bg-white/5 px-2 py-0.5 rounded border border-slate-200/80 dark:border-white/10">
            {val}
          </span>
        ),
      },
      {
        key: "accion", // Combinamos acción y detalles en la vista, pero filtramos por acción
        header: "Detalles",
        type: "text",
        render: (val, row) => (
          <div className="max-w-[300px]">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">
              {val}
            </p>
            {row.detalles && (
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                {row.detalles}
              </p>
            )}
          </div>
        ),
      },
      {
        key: "ip",
        header: "IP / Disp.",
        type: "text",
        width: "w-[130px]",
        render: (val, row) => (
          <div className="flex flex-col items-end gap-1.5">
            <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-slate-600 dark:text-slate-300 bg-white/80 dark:bg-black/40 px-2 py-1 rounded-md border border-slate-200/50 dark:border-white/10 shadow-sm">
              <Globe className="h-3 w-3 text-blue-500 dark:text-blue-400" />
              {val}
            </div>
            {row.dispositivo && (
              <div className="flex items-center gap-1 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-tighter">
                <Laptop className="h-3 w-3" />
                {row.dispositivo.split(" ")[0]}
              </div>
            )}
          </div>
        ),
      },
    ],
    [uniqueModules],
  );

  //  3. BOTÓN DE ACTUALIZAR INYECTADO EN LA BARRA DE FILTROS
  const RefreshButton = (
    <Button
      variant="outline"
      className="h-11 px-5 bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/10 shadow-sm transition-all rounded-xl haptic-press"
      onClick={fetchLogs}
      disabled={isLoading}
    >
      <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
      Actualizar
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1200px] h-[90vh] flex flex-col p-0 gap-0 overflow-hidden border-none shadow-2xl animate-page-enter bg-slate-50 dark:bg-slate-900 rounded-lg">
        {/* HEADER PREMIUM */}
        <DialogHeader className="px-8 py-6 bg-brand-navy/95 dark:bg-black/60 backdrop-blur-md shrink-0 relative overflow-hidden border-b border-brand-navy/10 dark:border-white/10">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
          <DialogTitle className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="icon-plate p-2.5 rounded-xl bg-white/5 shadow-inner">
                <History className="h-6 w-6 text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-black heading-crisp text-white text-shadow-premium uppercase tracking-tighter">
                  Log de Auditoría
                </span>
                <span className="text-[10px] font-bold text-slate-300 dark:text-brand-secondary uppercase tracking-[0.3em]">
                  Monitoreo de Seguridad de Sistema
                </span>
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* CONTENEDOR PRINCIPAL CON LA TABLA ENHANCED */}
        <div className="flex-1 overflow-hidden p-6 relative">
          <EnhancedDataTable
            data={uiLogs}
            columns={columns}
            isLoading={isLoading}
            searchPlaceholder="BUSCAR LOGS, USUARIO O IP..."
            exportFileName="Reporte_Auditoria"
            customFilters={RefreshButton}
            className="h-full flex flex-col"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Compact version for embedding in pages (Widget Tarjeta) - Se queda igual
export function AuditLogCard() {
  const { logs, isLoading, fetchLogs } = useAuditLogs();

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const uiLogs: AuditLogEntry[] = useMemo(() => {
    return (logs as unknown as AuditLogApi[]).map((l) => ({
      id: String(l.id),
      usuario: toUserName(l.usuario),
      accion: l.accion,
      tipoAccion: coerceTipoAccion(l.tipoAccion),
      modulo: l.modulo,
      detalles: l.detalles ?? "",
      ip: l.ip ?? "-",
      fechaHora: formatFechaHora(l.fechaHora),
    }));
  }, [logs]);

  const recentLogs = uiLogs.slice(0, 5);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 border-b border-slate-100 dark:border-white/5">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <History className="h-4 w-4 text-brand-red dark:text-brand-red" />
              Actividad Reciente
            </CardTitle>
            <CardDescription className="text-xs">
              Últimas 5 acciones en el sistema
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={fetchLogs}
            disabled={isLoading}
            className="h-8 w-8 hover:bg-slate-100 dark:hover:bg-white/5"
          >
            <RefreshCw
              className={cn(
                "h-4 w-4 text-slate-500 dark:text-slate-400",
                isLoading && "animate-spin",
              )}
            />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0 flex-1">
        <ScrollArea className="h-full max-h-[300px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-40 text-xs text-slate-500 dark:text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin mb-2 text-brand-red/50" />{" "}
              Cargando...
            </div>
          ) : recentLogs.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-[11px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
              Sin actividad reciente
            </div>
          ) : (
            <div className="flex flex-col">
              {recentLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 p-4 border-b border-slate-100 dark:border-white/5 last:border-0 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors interactive-row"
                >
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border",
                      getActionColor(log.tipoAccion),
                    )}
                  >
                    {getActionIcon(log.tipoAccion)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 leading-tight">
                      {log.accion}
                    </p>
                    <p
                      className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5"
                      title={log.detalles}
                    >
                      {log.detalles || "Sin detalles adicionales"}
                    </p>
                    <div className="flex items-center gap-2 font-mono text-[10px] text-slate-400 dark:text-slate-500 mt-1.5">
                      <span className="font-sans font-bold text-slate-700 dark:text-slate-300">
                        {log.usuario}
                      </span>
                      <span>•</span>
                      <span>{log.fechaHora.split(" ")[1] ?? ""}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
