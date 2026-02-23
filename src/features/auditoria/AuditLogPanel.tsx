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
import { useAuditLogs } from "@/hooks/useAuditLogs";

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
      <DialogContent className="sm:max-w-[1100px] h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b bg-muted/30">
          <DialogTitle className="flex items-center justify-between text-foreground">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                <History className="h-4 w-4 text-primary" />
              </div>
              <span className="text-xl">Log de Auditoría</span>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Filters Area */}
        <div className="flex flex-wrap items-center gap-3 p-4 border-b bg-background z-10">
          <div className="relative flex-1 min-w-[250px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por usuario, acción, IP o detalles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 w-full"
            />
          </div>

          <Select value={moduleFilter} onValueChange={setModuleFilter}>
            <SelectTrigger className="w-[180px] h-9">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Módulo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los Módulos</SelectItem>
              {modules
                .filter((m) => m !== "all")
                .map((modulo) => (
                  <SelectItem key={modulo} value={modulo}>
                    {modulo}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>

          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-[160px] h-9">
              <SelectValue placeholder="Acción" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las Acciones</SelectItem>
              <SelectItem value="crear">Crear</SelectItem>
              <SelectItem value="editar">Editar</SelectItem>
              <SelectItem value="eliminar">Eliminar</SelectItem>
              <SelectItem value="ver">Ver</SelectItem>
              <SelectItem value="exportar">Exportar</SelectItem>
              <SelectItem value="login">Login</SelectItem>
              <SelectItem value="logout">Logout</SelectItem>
              <SelectItem value="seguridad">Seguridad</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-2 whitespace-nowrap"
            onClick={fetchLogs}
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            Actualizar
          </Button>
        </div>

        {/* Data Table with Scroll */}
        <div className="flex-1 overflow-hidden relative">
          <ScrollArea className="h-full w-full">
            <div className="min-w-[900px] p-4">
              <div className="rounded-md border bg-card">
                <Table>
                  <TableHeader className="bg-muted/50 sticky top-0 backdrop-blur-sm shadow-sm">
                    <TableRow>
                      <TableHead className="w-[160px]">Fecha / Hora</TableHead>
                      <TableHead className="w-[180px]">Usuario</TableHead>
                      <TableHead className="w-[130px]">Acción</TableHead>
                      <TableHead className="w-[120px]">Módulo</TableHead>
                      <TableHead>Detalles</TableHead>
                      <TableHead className="w-[130px] text-right">
                        IP / Disp.
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="h-32 text-center text-muted-foreground"
                        >
                          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                          Cargando registros de auditoría...
                        </TableCell>
                      </TableRow>
                    ) : filteredLogs.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="h-32 text-center text-muted-foreground"
                        >
                          No se encontraron registros con los filtros aplicados.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredLogs.map((log) => (
                        <TableRow
                          key={log.id}
                          className="hover:bg-muted/30 transition-colors"
                        >
                          <TableCell className="font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-3 w-3" />
                              {log.fechaHora}
                            </div>
                          </TableCell>

                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold">
                                {log.usuario.substring(0, 2).toUpperCase()}
                              </div>
                              <span
                                className="text-sm font-medium truncate max-w-[120px]"
                                title={log.usuario}
                              >
                                {log.usuario}
                              </span>
                            </div>
                          </TableCell>

                          <TableCell>
                            <Badge
                              variant="outline"
                              className={cn(
                                "gap-1.5 whitespace-nowrap pr-2",
                                getActionColor(log.tipoAccion),
                              )}
                            >
                              {getActionIcon(log.tipoAccion)}
                              <span className="capitalize">
                                {log.tipoAccion}
                              </span>
                            </Badge>
                          </TableCell>

                          <TableCell>
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              {log.modulo}
                            </span>
                          </TableCell>

                          <TableCell className="max-w-[300px]">
                            <p
                              className="text-sm font-medium truncate"
                              title={log.accion}
                            >
                              {log.accion}
                            </p>
                            {log.detalles && (
                              <p
                                className="text-[11px] text-muted-foreground truncate mt-0.5"
                                title={log.detalles}
                              >
                                {log.detalles}
                              </p>
                            )}
                          </TableCell>

                          <TableCell className="text-right">
                            <div className="flex flex-col items-end gap-1">
                              <div className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                                <Globe className="h-3 w-3" />
                                {log.ip}
                              </div>
                              {log.dispositivo && (
                                <div
                                  className="flex items-center gap-1 text-[10px] text-muted-foreground max-w-[100px] truncate"
                                  title={log.dispositivo}
                                >
                                  <Laptop className="h-3 w-3 flex-shrink-0" />
                                  <span className="truncate">
                                    {log.dispositivo.split(" ")[0]}
                                  </span>
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

        {/* Footer */}
        <div className="px-6 py-3 border-t bg-muted/30 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Mostrando{" "}
            <strong className="text-foreground">{filteredLogs.length}</strong>{" "}
            de {uiLogs.length} registros
          </span>
          <span className="flex items-center gap-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Conexión activa
          </span>
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
                    <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground mt-1.5">
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
