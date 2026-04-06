import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  History,
  Search,
  Filter,
  User,
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
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "editar":
      return "bg-amber-100 text-amber-700 border-amber-200";
    case "eliminar":
      return "bg-rose-100 text-rose-700 border-rose-200";
    case "ver":
      return "bg-blue-100 text-blue-700 border-blue-200";
    case "exportar":
      return "bg-purple-100 text-purple-700 border-purple-200";
    case "login":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "logout":
      return "bg-slate-100 text-slate-700 border-slate-200";
    case "seguridad":
      return "bg-orange-100 text-orange-700 border-orange-200";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
};

interface AuditLogPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuditLogPanel({ open, onOpenChange }: AuditLogPanelProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");

  const { logs, isLoading, fetchLogs } = useAuditLogs();

  useEffect(() => {
    if (open) fetchLogs();
  }, [open, fetchLogs]);

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

  const modules = useMemo(
    () => ["all", ...Array.from(new Set(uiLogs.map((log) => log.modulo)))],
    [uiLogs],
  );

  const filteredLogs = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return uiLogs.filter((log) => {
      const matchesSearch =
        !term ||
        log.usuario.toLowerCase().includes(term) ||
        log.accion.toLowerCase().includes(term) ||
        log.detalles.toLowerCase().includes(term) ||
        log.ip.toLowerCase().includes(term);

      const matchesModule =
        moduleFilter === "all" || log.modulo === moduleFilter;

      const matchesAction =
        actionFilter === "all" || log.tipoAccion === actionFilter;

      return matchesSearch && matchesModule && matchesAction;
    });
  }, [uiLogs, searchTerm, moduleFilter, actionFilter]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* CONTAINER: Aplicamos glass-panel, modal-glow y la animación de entrada.
    Mantenemos el tamaño sm:max-w-[1100px] y h-[90vh].
  */}
      <DialogContent className="sm:max-w-[1100px] h-[90vh] flex flex-col p-0 gap-0 overflow-hidden glass-panel border-none shadow-2xl animate-page-enter">
        {/* HEADER PREMIUM: Usamos el Deep Navy con transparencia y spotlight.
      Aplicamos text-shadow-premium para que el texto blanco resalte.
    */}
        <DialogHeader className="px-8 py-6 bg-brand-navy/95 backdrop-blur-md shrink-0 relative overflow-hidden border-b border-white/10">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />

          <DialogTitle className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="icon-plate p-2.5 rounded-xl">
                <History className="h-6 w-6 text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-black heading-crisp text-white text-shadow-premium uppercase tracking-tighter">
                  Log de Auditoría
                </span>
                <span className="text-[10px] font-bold text-brand-secondary uppercase tracking-[0.3em]">
                  Monitoreo de Seguridad de Sistema
                </span>
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* FILTERS AREA: Estilo "Tahoe" con fondo translúcido y blur.
      Los inputs y selects ahora usan glass-card.
    */}
        <div className="flex flex-wrap items-center gap-4 p-5 bg-white/40 backdrop-blur-md border-b border-white/20 z-10">
          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar por usuario, acción, IP o detalles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-11 glass-card border-slate-200/60 focus:ring-brand-red/20 focus:border-brand-red transition-all font-medium"
            />
          </div>

          <div className="flex items-center gap-2">
            <Select value={moduleFilter} onValueChange={setModuleFilter}>
              <SelectTrigger className="w-[180px] h-11 glass-card border-slate-200/60 font-bold text-slate-600">
                <Filter className="h-4 w-4 mr-2 text-slate-400" />
                <SelectValue placeholder="Módulo" />
              </SelectTrigger>
              <SelectContent className="glass-panel border-white/20">
                <SelectItem value="all" className="font-bold">
                  Todos los Módulos
                </SelectItem>
                {modules
                  .filter((m) => m !== "all")
                  .map((modulo) => (
                    <SelectItem
                      key={modulo}
                      value={modulo}
                      className="capitalize"
                    >
                      {modulo}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>

            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[160px] h-11 glass-card border-slate-200/60 font-bold text-slate-600">
                <SelectValue placeholder="Acción" />
              </SelectTrigger>
              <SelectContent className="glass-panel border-white/20">
                <SelectItem value="all" className="font-bold">
                  Todas las Acciones
                </SelectItem>
                <SelectItem value="crear">Crear</SelectItem>
                <SelectItem value="editar">Editar</SelectItem>
                <SelectItem value="eliminar">Eliminar</SelectItem>
                <SelectItem value="login">Login</SelectItem>
                {/* ... otras opciones ... */}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              className="h-11 px-4 gap-2 glass-card border-slate-200/60 hover:bg-white/60 text-slate-600 font-bold transition-all"
              onClick={fetchLogs}
              disabled={isLoading}
            >
              <RefreshCw
                className={cn("h-4 w-4", isLoading && "animate-spin")}
              />
              Actualizar
            </Button>
          </div>
        </div>

        {/* DATA TABLE: Liquid Glass Table.
      Header de tabla con contraste y filas con animación staggered.
    */}
        <div className="flex-1 overflow-hidden relative bg-transparent">
          <ScrollArea className="h-full w-full">
            <div className="min-w-[900px] p-6">
              <div className="rounded-2xl border border-white/20 bg-white/30 backdrop-blur-sm overflow-hidden shadow-xl">
                <Table className="liquid-glass-table">
                  <TableHeader className="bg-slate-900/5 sticky top-0 backdrop-blur-md">
                    <TableRow className="hover:bg-transparent border-b border-white/20">
                      <TableHead className="w-[160px] text-[10px] font-black uppercase tracking-widest text-slate-500">
                        Fecha / Hora
                      </TableHead>
                      <TableHead className="w-[180px] text-[10px] font-black uppercase tracking-widest text-slate-500">
                        Usuario
                      </TableHead>
                      <TableHead className="w-[130px] text-[10px] font-black uppercase tracking-widest text-slate-500">
                        Acción
                      </TableHead>
                      <TableHead className="w-[120px] text-[10px] font-black uppercase tracking-widest text-slate-500">
                        Módulo
                      </TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                        Detalles
                      </TableHead>
                      <TableHead className="w-[130px] text-right text-[10px] font-black uppercase tracking-widest text-slate-500">
                        IP / Disp.
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody className="table-staggered">
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-64 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <Loader2 className="h-8 w-8 animate-spin text-brand-red/50" />
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                              Sincronizando registros...
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredLogs.map((log) => (
                        <TableRow
                          key={log.id}
                          className="hover:bg-white/40 transition-all border-b border-white/10 interactive-row"
                        >
                          <TableCell className="font-mono text-[11px] text-slate-500">
                            <div className="flex items-center gap-2">
                              <Clock className="h-3 w-3 text-emerald-500" />
                              {log.fechaHora}
                            </div>
                          </TableCell>

                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-7 w-7 rounded-lg bg-brand-navy text-white flex items-center justify-center font-black text-[10px] shadow-lg">
                                {log.usuario.substring(0, 2).toUpperCase()}
                              </div>
                              <span className="text-sm font-bold text-slate-700">
                                {log.usuario}
                              </span>
                            </div>
                          </TableCell>

                          <TableCell>
                            <Badge
                              variant="outline"
                              className={cn(
                                "gap-1.5 whitespace-nowrap font-black text-[9px] uppercase tracking-tighter px-2.5 py-1 shadow-sm",
                                getActionColor(log.tipoAccion), // Asegura que esta función devuelva colores de tu CSS como bg-status-success-bg
                              )}
                            >
                              {getActionIcon(log.tipoAccion)}
                              {log.tipoAccion}
                            </Badge>
                          </TableCell>

                          <TableCell>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100/50 px-2 py-0.5 rounded border border-slate-200/50">
                              {log.modulo}
                            </span>
                          </TableCell>

                          <TableCell className="max-w-[300px]">
                            <p className="text-sm font-semibold text-slate-600 truncate">
                              {log.accion}
                            </p>
                            {log.detalles && (
                              <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                                {log.detalles}
                              </p>
                            )}
                          </TableCell>

                          <TableCell className="text-right">
                            <div className="flex flex-col items-end gap-1.5">
                              <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-slate-500 bg-white/50 px-2 py-1 rounded-md border border-white/40 shadow-sm">
                                <Globe className="h-3 w-3 text-blue-400" />
                                {log.ip}
                              </div>
                              {log.dispositivo && (
                                <div className="flex items-center gap-1 text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                                  <Laptop className="h-3 w-3" />
                                  {log.dispositivo.split(" ")[0]}
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </ScrollArea>
        </div>

        {/* FOOTER: Safari-Style Status Bar.
         */}
        <div className="px-8 py-4 border-t border-white/20 bg-white/60 backdrop-blur-xl flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium uppercase tracking-widest text-[10px]">
              Registros Filtrados:
              <strong className="text-slate-700 ml-1.5 bg-white/80 px-2 py-0.5 rounded shadow-sm">
                {filteredLogs.length}
              </strong>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">
                En Vivo
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Compact version for embedding in pages (Widget Tarjeta)
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
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <History className="h-4 w-4 text-primary" />
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
            className="h-8 w-8"
          >
            <RefreshCw
              className={cn(
                "h-4 w-4 text-muted-foreground",
                isLoading && "animate-spin",
              )}
            />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0 flex-1">
        <ScrollArea className="h-full max-h-[300px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-40 text-xs text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mb-2" /> Cargando...
            </div>
          ) : recentLogs.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-xs text-muted-foreground">
              Sin actividad reciente
            </div>
          ) : (
            <div className="flex flex-col">
              {recentLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 p-4 border-b last:border-0 hover:bg-muted/30 transition-colors"
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
                    <p className="text-sm font-medium text-foreground leading-tight">
                      {log.accion}
                    </p>
                    <p
                      className="text-xs text-muted-foreground truncate mt-0.5"
                      title={log.detalles}
                    >
                      {log.detalles || "Sin detalles adicionales"}
                    </p>
                    <div className="flex items-center gap-2  font-mono text-muted-foreground mt-1.5">
                      <span className="font-sans font-medium text-primary/80">
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
