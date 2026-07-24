import React, { useState, useMemo } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  CalendarIcon,
  X,
  Check,
  ChevronsUpDown,
  FileText,
  FileCode,
  RefreshCw,
  Eye,
  MoreHorizontal,
  AlertTriangle,
  Network,
  Search,
  ChevronRight,
  Trash2, // AÑADIDO
  Loader2, // AÑADIDO
} from "lucide-react";
import { toast } from "sonner";
import axiosClient from "@/api/axiosClient";

import { useCfdiVault } from "@/features/finance/hooks/useCfdiVault";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

import {
  EnhancedDataTable,
  ColumnDef,
} from "@/components/ui/enhanced-data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

import { CreateInvoiceModal } from "@/features/receivables/components/CreateInvoiceModal";
import { InvoiceDetailSheet } from "@/features/receivables/components/InvoiceDetailSheet";
import { InvoicePayablesDetailSheet } from "@/features/payables/components/InvoicePayablesDetailSheet";

export default function CFDIVault() {
  const [activeTab, setActiveTab] = useState("FACTURA_CLIENTE");

  const [selectedEntity, setSelectedEntity] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [entityComboOpen, setEntityOpen] = useState(false);

  const [refactorModalOpen, setRefactorModalOpen] = useState(false);
  const [invoiceToRefactor, setInvoiceToRefactor] = useState<any>(null);

  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [payableDetailDrawerOpen, setPayableDetailDrawerOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

  // ESTADOS INTELIGENTES DE CONTROL: Jerarquía, Localizador por Parpadeo y Selección Masiva
  const [expandedParents, setExpandedParents] = useState<
    Record<number, boolean>
  >({});
  const [blinkQuery, setBlinkQuery] = useState<string>("");

  // 🚀 NUEVOS ESTADOS PARA CANCELACIÓN MASIVA
  const [selectedInvoices, setSelectedInvoices] = useState<any[]>([]);
  const [isMassCanceling, setIsMassCanceling] = useState(false);

  const { records, isLoading, refetch } = useCfdiVault(activeTab);

  // 1. Limpiamos los registros de errores
  const cleanRecords = useMemo(() => {
    return records.filter((r) => {
      const statusStr = r.estatus?.toLowerCase() || "";
      return statusStr !== "error_sat" && statusStr !== "error";
    });
  }, [records]);

  // 2. Diccionarios de acceso rápido a la data REAL (para recuperar montos, UUID, y archivos de las hijas)
  const lookupDicts = useMemo(() => {
    const byId = new Map();
    const byFolio = new Map();
    cleanRecords.forEach((r) => {
      if (r.id) byId.set(r.id, r);
      if (r.folio) byFolio.set(r.folio, r);
    });
    return { recordsById: byId, recordsByFolio: byFolio };
  }, [cleanRecords]);

  // 3. Identificamos qué registros son "Hijas" para NO mostrarlos duplicados en el listado raíz
  const { childIds, childFolios } = useMemo(() => {
    const ids = new Set<number>();
    const folios = new Set<string>();
    cleanRecords.forEach((parent) => {
      if (
        parent.cartas_porte_hijas &&
        Array.isArray(parent.cartas_porte_hijas)
      ) {
        parent.cartas_porte_hijas.forEach((child: any) => {
          if (child.id) ids.add(child.id);
          if (child.folio) folios.add(child.folio);
        });
      }
    });
    return { childIds: ids, childFolios: folios };
  }, [cleanRecords]);

  const uniqueStatuses = useMemo(
    () =>
      Array.from(new Set(cleanRecords.map((r) => r.estatus))).filter(Boolean),
    [cleanRecords],
  );
  const uniqueClients = useMemo(
    () =>
      Array.from(
        new Set(cleanRecords.map((r) => r.cliente_proveedor_nombre)),
      ).filter(Boolean),
    [cleanRecords],
  );

  // 4. Aplicamos los filtros del usuario y Ocultamos las Hijas Sueltas
  const filteredRecords = useMemo(() => {
    return cleanRecords.filter((r) => {
      if (childIds.has(r.id) || childFolios.has(r.folio)) return false;

      if (
        selectedEntity !== "all" &&
        r.cliente_proveedor_nombre !== selectedEntity
      )
        return false;
      if (selectedStatus !== "all" && r.estatus !== selectedStatus)
        return false;

      if (dateRange?.from || dateRange?.to) {
        if (!r.fecha_emision) return false;
        const recordDate = new Date(r.fecha_emision);
        recordDate.setHours(0, 0, 0, 0);

        if (dateRange.from) {
          const fromDate = new Date(dateRange.from);
          fromDate.setHours(0, 0, 0, 0);
          if (recordDate < fromDate) return false;
        }

        if (dateRange.to) {
          const toDate = new Date(dateRange.to);
          toDate.setHours(23, 59, 59, 999);
          if (recordDate > toDate) return false;
        }
      }
      return true;
    });
  }, [
    cleanRecords,
    childIds,
    childFolios,
    selectedEntity,
    selectedStatus,
    dateRange,
  ]);

  // 5. Pre-ordenamos los padres por fecha para no usar el "initialSort" de la tabla
  const sortedFilteredRecords = useMemo(() => {
    return [...filteredRecords].sort((a, b) => {
      const folioA = a.folio || a.folio_interno || "";
      const folioB = b.folio || b.folio_interno || "";

      // Extraemos solo los dígitos numéricos del string
      const numA = parseInt(String(folioA).replace(/[^0-9]/g, ""), 10) || 0;
      const numB = parseInt(String(folioB).replace(/[^0-9]/g, ""), 10) || 0;

      if (numA !== numB) {
        return numB - numA; // El número de folio más alto sube al inicio
      }

      // Respaldo alfabético inverso en caso de folios idénticos o sin números
      return String(folioB).localeCompare(String(folioA), undefined, {
        numeric: true,
        sensitivity: "base",
      });
    });
  }, [filteredRecords]);

  // 6. MOTOR JERÁRQUICO: Inyecta las hijas debajo de su padre usando los datos 100% REALES
  const hierarchicalRecords = useMemo(() => {
    const result: any[] = [];
    const { recordsById, recordsByFolio } = lookupDicts;

    sortedFilteredRecords.forEach((parent) => {
      result.push(parent);

      const hasChildren =
        parent.cartas_porte_hijas && parent.cartas_porte_hijas.length > 0;
      const isExpanded =
        !!expandedParents[parent.id] ||
        (blinkQuery && blinkQuery.trim().length >= 3);

      if (hasChildren && isExpanded) {
        parent.cartas_porte_hijas.forEach((childRef: any) => {
          const realChild =
            recordsById.get(childRef.id) ||
            recordsByFolio.get(childRef.folio) ||
            {};

          result.push({
            ...childRef,
            ...realChild,
            id:
              realChild.id ||
              childRef.id ||
              `virtual-${childRef.folio || Math.random()}`,
            isVirtualChild: true,
            parentId: parent.id,
            folio: realChild.folio || childRef.folio || "S/F",
            monto_total:
              realChild.monto_total !== undefined
                ? realChild.monto_total
                : childRef.monto_total || 0,
            cliente_proveedor_nombre:
              realChild.cliente_proveedor_nombre ||
              parent.cliente_proveedor_nombre,
            viaje_id: realChild.viaje_id || parent.viaje_id,
            estatus: realChild.estatus || childRef.estatus || "TIMBRADA",
            fecha_emision:
              realChild.fecha_emision ||
              childRef.fecha_emision ||
              parent.fecha_emision,
          });
        });
      }
    });

    return result;
  }, [sortedFilteredRecords, lookupDicts, expandedParents, blinkQuery]);

  const checkShouldBlink = (row: any) => {
    if (!blinkQuery || blinkQuery.trim().length < 3) return false;
    const query = blinkQuery.toLowerCase().trim();
    const folioTarget = String(
      row.folio || row.folio_interno || "",
    ).toLowerCase();
    const uuidTarget = String(row.uuid || "").toLowerCase();
    return folioTarget.includes(query) || uuidTarget.includes(query);
  };

  // 🚀 FUNCIÓN DE CANCELACIÓN MASIVA ACTUALIZADA
  const handleMassCancel = async () => {
    if (
      !window.confirm(
        `¿Seguro que deseas cancelar ${selectedInvoices.length} documentos?`,
      )
    )
      return;

    setIsMassCanceling(true);
    const toastId = toast.loading(
      `Procesando cancelación de ${selectedInvoices.length} documentos...`,
    );

    try {
      if (activeTab === "PAGO_CLIENTE") {
        const paymentIds = selectedInvoices.map((inv) => inv.id);
        await axiosClient.post("/api/finance/receivables/payments/cancel", {
          payment_ids: paymentIds,
          motivo: "02", // Cancelación con error, no relacionado
        });
        toast.success("Pagos cancelados correctamente y saldo restaurado.", {
          id: toastId,
        });
      } else {
        // ========================================================
        // 🚀 NUEVA LÓGICA: ENVIAR ARREGLO DE IDs AL ENDPOINT MASIVO
        // ========================================================
        const invoiceIds = selectedInvoices.map((inv) => inv.id);

        // ⚠️ IMPORTANTE: Verifica que este endpoint coincida con cómo
        // tienes montado el router del SAT en tu main.py
        // (Suele ser /api/sat/stamp/cancel-mass)
        const response = await axiosClient.post(`/api/sat/stamp/cancel-mass`, {
          invoice_ids: invoiceIds,
          motivo: "02",
        });

        // Desestructuramos la respuesta del backend
        const { data } = response.data;
        const criticalErrors = data.filter((r: any) => r.status === "error");
        const queued = data.filter((r: any) => r.status === "queued");
        const success = data.filter((r: any) => r.status === "success");

        if (criticalErrors.length === 0) {
          toast.success(
            `Proceso exitoso: ${success.length} canceladas. ${queued.length > 0 ? `(${queued.length} en cola de reintentos por lentitud del SAT)` : ""}`,
            { id: toastId, duration: 6000 },
          );
        } else {
          toast.warning(
            `Se enviaron a cancelar, pero hubo ${criticalErrors.length} errores críticos. Revisa la consola o los detalles.`,
            { id: toastId, duration: 6000 },
          );
          console.error("Detalle de errores en cancelación:", criticalErrors);
        }
      }
    } catch (err) {
      console.error("Error general:", err);
      toast.error(
        "Ocurrió un error general de conexión al intentar cancelar.",
        {
          id: toastId,
        },
      );
    } finally {
      setSelectedInvoices([]);
      setIsMassCanceling(false);
      if (refetch) refetch();
    }
  };

  const customFiltersUI = (
    <>
      <Popover open={entityComboOpen} onOpenChange={setEntityOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={entityComboOpen}
            className="w-[240px] justify-between h-11 bg-white dark:bg-slate-900 border-slate-200"
          >
            <span className="truncate">
              {selectedEntity === "all"
                ? "Todos los Clientes/Prov."
                : selectedEntity}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[350px] p-0">
          <Command>
            <CommandInput placeholder="Buscar por nombre..." />
            <CommandList>
              <CommandEmpty>No se encontraron resultados.</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  value="all"
                  onSelect={() => {
                    setSelectedEntity("all");
                    setEntityOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedEntity === "all" ? "opacity-100" : "opacity-0",
                    )}
                  />
                  Todos los Clientes/Proveedores
                </CommandItem>
                {uniqueClients.map((client) => (
                  <CommandItem
                    key={client}
                    value={client}
                    onSelect={(currentValue) => {
                      const originalValue =
                        uniqueClients.find(
                          (c) => c.toLowerCase() === currentValue,
                        ) || currentValue;
                      setSelectedEntity(originalValue);
                      setEntityOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedEntity === client ? "opacity-100" : "opacity-0",
                      )}
                    />
                    {client}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Select value={selectedStatus} onValueChange={setSelectedStatus}>
        <SelectTrigger className="w-[160px] h-11 bg-white dark:bg-slate-900 border-slate-200">
          <SelectValue placeholder="Estatus" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Cualquier Estatus</SelectItem>
          {uniqueStatuses.map((s) => (
            <SelectItem key={s} value={s}>
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-[240px] justify-start text-left font-normal h-11 bg-white dark:bg-slate-900 border-slate-200",
              !dateRange.from && "text-muted-foreground",
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateRange?.from ? (
              dateRange.to ? (
                <>
                  {format(dateRange.from, "dd/MM/yy")} -{" "}
                  {format(dateRange.to, "dd/MM/yy")}
                </>
              ) : (
                format(dateRange.from, "dd/MM/yy")
              )
            ) : (
              <span>Filtrar por Fechas</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={dateRange?.from}
            selected={{ from: dateRange.from, to: dateRange.to }}
            onSelect={(range) =>
              setDateRange({ from: range?.from, to: range?.to })
            }
            numberOfMonths={2}
            locale={es}
          />
        </PopoverContent>
      </Popover>

      {(selectedEntity !== "all" ||
        selectedStatus !== "all" ||
        dateRange.from) && (
        <Button
          variant="ghost"
          onClick={() => {
            setSelectedEntity("all");
            setSelectedStatus("all");
            setDateRange({});
          }}
          className="px-3 text-red-500 hover:text-red-700 hover:bg-red-50 h-11"
        >
          <X className="h-4 w-4 mr-1" /> Limpiar
        </Button>
      )}

      {/* 🚀 BOTÓN DINÁMICO DE CANCELACIÓN MASIVA */}
      {selectedInvoices.length > 0 && (
        <Button
          variant="destructive"
          onClick={handleMassCancel}
          disabled={isMassCanceling}
          className="h-11 ml-2 font-bold animate-in fade-in zoom-in duration-200"
        >
          {isMassCanceling ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4 mr-2" />
          )}
          Cancelar {selectedInvoices.length}{" "}
          {selectedInvoices.length === 1 ? "Seleccionada" : "Seleccionadas"}
        </Button>
      )}
    </>
  );

  const handleOpenDetail = (row: any) => {
    // 🚀 MAGIA: Rellenamos la información completa del padre y las hijas usando el diccionario
    const hydratedPadre = row.factura_padre
      ? lookupDicts.recordsById.get(row.factura_padre.id) ||
        lookupDicts.recordsByFolio.get(row.factura_padre.folio_interno) ||
        row.factura_padre
      : null;

    const hydratedHijas =
      row.cartas_porte_hijas?.map((hija: any) => {
        return (
          lookupDicts.recordsById.get(hija.id) ||
          lookupDicts.recordsByFolio.get(hija.folio) ||
          hija
        );
      }) || [];

    if (activeTab === "FACTURA_PROVEEDOR") {
      setSelectedInvoice({
        id: row.id,
        folio_interno: row.folio,
        uuid: row.uuid,
        estatus: row.estatus,
        monto_total: row.monto_total,
        fecha_emision: row.fecha_emision,
        fecha_cancelacion: row.fecha_cancelacion,
        motivo_cancelacion: row.motivo_cancelacion,
        pdf_url: row.pdf_url,
        xml_url: row.xml_url,
        document_history: row.versiones_archivos || [],
        supplier: { razon_social: row.cliente_proveedor_nombre },
        viaje_id: row.viaje_id,
        saldo_pendiente: row.estatus === "TIMBRADO" ? row.monto_total : 0,
        cliente_proveedor_rfc: row.cliente_proveedor_rfc, // Pasamos el RFC
      });
      setPayableDetailDrawerOpen(true);
    } else {
      setSelectedInvoice({
        id: row.id,
        folio_interno: row.folio,
        uuid: row.uuid,
        estatus: row.estatus,
        monto_total: row.monto_total,
        fecha_emision: row.fecha_emision,
        fecha_cancelacion: row.fecha_cancelacion,
        motivo_cancelacion: row.motivo_cancelacion,
        pdf_url: row.pdf_url,
        xml_url: row.xml_url,
        document_history: row.versiones_archivos || [],
        client: { razon_social: row.cliente_proveedor_nombre },
        cliente_proveedor_rfc: row.cliente_proveedor_rfc, // Pasamos el RFC
        viaje_id: row.viaje_id,
        saldo_pendiente: row.estatus === "TIMBRADA" ? row.monto_total : 0,
        status_sat: row.status_sat || row.estatus,
        intentos_cancelacion: row.intentos_cancelacion || 0,
        detalle_sat: row.detalle_sat,
        factura_padre: hydratedPadre, // Enviamos el Padre 100% completo
        cartas_porte_hijas: hydratedHijas, // Enviamos las Hijas 100% completas
        is_nominal: row.is_nominal,
      });
      setDetailDrawerOpen(true);
    }
  };

  const columns = useMemo(() => {
    const cols: ColumnDef<any>[] = [];

    if (activeTab === "PAGO_CLIENTE") {
      cols.push({
        key: "numero_complemento",
        header: "No. Complemento",
        render: (_, row: any) => {
          let displayFolio = "N/A";
          const rawFolio = String(
            row.folio_interno || row.folio || row.numero_complemento || "",
          );

          if (row.uuid && rawFolio.toUpperCase().startsWith("PAGO-")) {
            const idReal = parseInt(rawFolio.replace(/[^0-9]/g, "")) || row.id;
            displayFolio = `COM-${idReal + 2546}`;
          } else {
            const cleanFolio = rawFolio.replace(/^(PAGO|COM)-?/i, "");
            displayFolio = cleanFolio ? `COM-${cleanFolio}` : "N/A";
          }
          const isBlinking = checkShouldBlink(row);
          return (
            <div
              className={cn(
                "py-1",
                isBlinking &&
                  "animate-row-blink border-l-4 border-yellow-400 pl-2 rounded",
              )}
            >
              <span className="font-mono font-bold">{displayFolio}</span>
            </div>
          );
        },
      });
      cols.push({
        key: "uuid",
        header: "UUID",
        render: (val, row) => (
          <div
            className={cn(
              checkShouldBlink(row) &&
                "animate-row-blink font-black text-slate-950 dark:text-white",
            )}
          >
            <span className="font-mono text-xs">{val || "—"}</span>
          </div>
        ),
      });
      cols.push({
        key: "folio_relacionado",
        header: "Origen (CP/F)",
        render: (_, row: any) => (
          <span className="font-mono text-xs text-slate-500">
            {row.folio_relacionado || "N/A"}
          </span>
        ),
      });
    } else {
      cols.push({
        key: "folio",
        header: "Folio",
        render: (val, row: any) => {
          const hasChildren =
            row.cartas_porte_hijas && row.cartas_porte_hijas.length > 0;
          const isExpanded = !!expandedParents[row.id];
          const isBlinking = checkShouldBlink(row);

          if (row.isVirtualChild) {
            return (
              <div
                className={cn(
                  "flex items-center gap-2 pl-6 py-1 bg-indigo-50/40 dark:bg-indigo-950/10 rounded-xl border-l-4 border-indigo-500 ml-4 relative shadow-sm",
                  isBlinking && "animate-row-blink border-l-yellow-400",
                )}
              >
                <div className="absolute w-3 h-4 border-l-2 border-b-2 border-slate-300 dark:border-slate-700 -left-4 -top-2 rounded-bl-md" />
                <Network className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                <span className="font-mono text-xs font-black text-slate-700 dark:text-slate-300">
                  {row.folio || "S/F"}
                </span>
                <Badge
                  variant="outline"
                  className="text-[8px] h-4 px-1.5 font-black uppercase tracking-wider bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400"
                >
                  CPT
                </Badge>
              </div>
            );
          }

          return (
            <div
              className={cn(
                "flex items-center gap-2 py-1",
                isBlinking &&
                  "animate-row-blink bg-yellow-400/20 p-1 rounded border border-yellow-300",
              )}
            >
              {hasChildren && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 rounded-lg p-0 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-indigo-400"
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedParents((prev) => ({
                      ...prev,
                      [row.id]: !prev[row.id],
                    }));
                  }}
                >
                  <ChevronRight
                    className={cn(
                      "h-3.5 w-3.5 transition-transform duration-200",
                      isExpanded ? "rotate-90" : "rotate-0",
                    )}
                  />
                </Button>
              )}
              <span className="font-mono font-black text-slate-900 dark:text-slate-100">
                {val || "S/F"}
              </span>

              {hasChildren && (
                <Badge className="text-[9px] h-4 bg-indigo-600 text-white font-sans font-black shadow-sm">
                  {row.cartas_porte_hijas.length}
                </Badge>
              )}
            </div>
          );
        },
      });
      cols.push({
        key: "uuid",
        header: "UUID",
        render: (val, row) => (
          <div
            className={cn(
              "font-mono text-xs truncate max-w-[140px]",
              checkShouldBlink(row) &&
                "animate-row-blink font-black text-slate-950 dark:text-white bg-yellow-300/10",
            )}
          >
            {val || "—"}
          </div>
        ),
      });
      cols.push({
        key: "viaje_id",
        header: "Viaje",
        render: (val) =>
          val ? (
            <Badge
              variant="outline"
              className="bg-blue-50 text-blue-700 border-blue-200 font-mono text-xs font-bold"
            >
              #{val}
            </Badge>
          ) : (
            <span className="text-muted-foreground text-xs">N/A</span>
          ),
      });
    }

    cols.push(
      {
        key: "cliente_proveedor_nombre",
        header: "Entidad",
        width: "max-w-[220px] truncate",
        render: (val, row) => (
          <span
            className={cn(
              "text-xs font-bold",
              checkShouldBlink(row) &&
                "animate-row-blink text-slate-950 dark:text-white",
            )}
          >
            {val}
          </span>
        ),
      },
      {
        key: "fecha_emision",
        header: "Emisión",
        render: (val) => (val ? format(new Date(val), "dd/MMM/yyyy") : "N/A"),
      },
      {
        key: "monto_total",
        header: "Monto",
        render: (val) =>
          `$${(val || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`,
      },
      {
        key: "estatus",
        header: "Estatus",
        render: (val, row) => {
          const s = (val || "").toUpperCase();
          let badgeClass = "bg-slate-100 text-slate-800 border-slate-200";
          let displayLabel = s;

          if (s === "TIMBRADA" || s === "TIMBRADO")
            badgeClass =
              "bg-green-100 text-green-800 hover:bg-green-200 border-green-300";
          else if (s === "CANCELADO")
            badgeClass =
              "bg-red-100 text-red-800 hover:bg-red-200 border-red-300";
          else if (s === "PROVISIONAL")
            badgeClass =
              "bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-300";
          else if (s === "RECIBO INTERNO")
            badgeClass =
              "bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-300";
          else if (s === "PROCESO_CANCELACION") {
            badgeClass =
              "bg-amber-50 text-amber-700 border-amber-200 animate-pulse font-black";
            displayLabel = "EN PROCESO SAT";
          } else if (s === "PENDIENTE_CANCELAR_SAT") {
            badgeClass =
              "bg-blue-50 text-blue-700 border-blue-200 animate-pulse font-black";
            displayLabel = "EN COLA (REINTENTO)";
          }
          //  1. AGREGAMOS EL CASO DE RECHAZO AQUÍ:
          else if (s === "RECHAZADO_SAT") {
            badgeClass = "bg-rose-100 text-rose-800 border-rose-300 font-black";
            displayLabel = "ERROR TIMBRADO";
          }

          //  2. ASEGURAMOS QUE HASERROR SE ACTIVE CON RECHAZADO_SAT PARA QUE SALGA TU ICONITO DE TRIÁNGULO
          const hasError =
            (row.intentos_cancelacion > 0 || s === "RECHAZADO_SAT") &&
            s !== "CANCELADO" &&
            s !== "PROCESO_CANCELACION" &&
            s !== "PENDIENTE_CANCELAR_SAT";

          return (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={badgeClass}>
                {displayLabel}
              </Badge>
              {hasError && (
                <div
                  // Cambiamos a detalle_sat o sat_error_log según cómo lo hayas dejado en el Schema
                  title={`Mensaje SAT: ${row.detalle_sat || row.sat_error_log || "Alerta de sincronización"}`}
                  className="p-1 bg-rose-100 rounded-full cursor-help animate-pulse"
                >
                  <AlertTriangle className="w-3 h-3 text-rose-600" />
                </div>
              )}
            </div>
          );
        },
      },
      {
        key: "archivos",
        header: "Acciones",
        sortable: false,
        render: (_, row: any) => {
          const listaArchivos = Array.isArray(row.versiones_archivos)
            ? row.versiones_archivos
            : [];
          const xmlDoc =
            listaArchivos.find(
              (f: any) => f.document_type === "xml" && f.is_active,
            ) || listaArchivos.find((f: any) => f.document_type === "xml");
          const pdfDoc =
            listaArchivos.find(
              (f: any) => f.document_type === "pdf" && f.is_active,
            ) || listaArchivos.find((f: any) => f.document_type === "pdf");

          const forceDownloadCustomName = async (
            fileUrl: string,
            customName: string,
          ) => {
            try {
              const response = await fetch(fileUrl);
              const blob = await response.blob();
              const url = window.URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = customName;
              document.body.appendChild(link);
              link.click();
              link.remove();
              window.URL.revokeObjectURL(url);
            } catch (error) {
              console.error("No se pudo renombrar, abriendo normal...", error);
              window.open(fileUrl, "_blank");
            }
          };

          const downloadFile = (type: "pdf" | "xml") => {
            let fileUrl = "";
            if (row.uuid) {
              const rawBaseURL = import.meta.env.VITE_API_BASE_URL || "";
              const baseURL = rawBaseURL.replace(/\/$/, "");
              fileUrl = `${baseURL}/api/sat/invoice/${row.uuid}/${type}`;
            } else {
              fileUrl =
                type === "pdf"
                  ? row.pdf_url || pdfDoc?.file_url
                  : row.xml_url || xmlDoc?.file_url;
            }
            if (!fileUrl) return;

            if (activeTab === "PAGO_CLIENTE") {
              const rfc =
                row.cliente_proveedor_rfc || row.rfc_cliente || "RFC_PENDIENTE";
              let cleanFolio = "";
              const rawFolio = String(
                row.folio_interno ||
                  row.folio ||
                  row.numero_complemento ||
                  "SF",
              );
              if (row.uuid && rawFolio.toUpperCase().startsWith("PAGO-")) {
                const idReal =
                  parseInt(rawFolio.replace(/[^0-9]/g, "")) || row.id;
                cleanFolio = `${idReal + 2546}`;
              } else {
                cleanFolio = rawFolio.replace(/^(PAGO|COM)-?/i, "");
              }
              const targetUuid = row.uuid || "SIN_UUID";
              const customName = `COM-${cleanFolio}_${rfc}_${targetUuid}.${type}`;
              forceDownloadCustomName(fileUrl, customName);
            } else {
              window.open(fileUrl, "_blank");
            }
          };

          const hasPdf = !!(row.uuid || row.pdf_url || pdfDoc?.file_url);
          const hasXml = !!(row.uuid || row.xml_url || xmlDoc?.file_url);

          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-xl transition-all shadow-sm border border-slate-200/50 dark:border-white/10 hover:bg-slate-100 dark:bg-slate-800 bg-white/50 dark:bg-slate-900/50"
                >
                  <MoreHorizontal className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="glass-panel border-white/20 min-w-[200px] z-50 dark:bg-slate-900/95 shadow-2xl p-1"
              >
                <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 px-2 py-1.5">
                  Consultas
                </DropdownMenuLabel>

                <DropdownMenuItem
                  onClick={() => handleOpenDetail(row)}
                  className="gap-2 font-bold text-xs cursor-pointer dark:text-slate-200 dark:focus:bg-slate-800 rounded-md"
                >
                  <Eye className="h-4 w-4 text-blue-500" /> Ver Detalles
                </DropdownMenuItem>

                {hasPdf && (
                  <DropdownMenuItem
                    onClick={() => downloadFile("pdf")}
                    className="gap-2 font-bold text-xs cursor-pointer dark:text-slate-200 dark:focus:bg-slate-800 rounded-md"
                  >
                    <FileText className="h-4 w-4 text-rose-500" /> Descargar PDF
                  </DropdownMenuItem>
                )}

                {hasXml && (
                  <DropdownMenuItem
                    onClick={() => downloadFile("xml")}
                    className="gap-2 font-bold text-xs cursor-pointer dark:text-slate-200 dark:focus:bg-slate-800 rounded-md"
                  >
                    <FileCode className="h-4 w-4 text-blue-500" /> Descargar XML
                  </DropdownMenuItem>
                )}

                {activeTab === "FACTURA_CLIENTE" &&
                  row.estatus !== "PROVISIONAL" && (
                    <>
                      <DropdownMenuSeparator className="my-1 opacity-50" />
                      <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-orange-500/70 px-2 py-1.5">
                        Operaciones
                      </DropdownMenuLabel>
                      <DropdownMenuItem
                        onClick={() => {
                          setInvoiceToRefactor({
                            uuid: row.uuid,
                            subtotal: row.monto_total / 1.16,
                            monto_total: row.monto_total,
                            client: {
                              razon_social: row.cliente_proveedor_nombre,
                            },
                            concepto: `Refacturación de ${row.folio}`,
                          });
                          setRefactorModalOpen(true);
                        }}
                        className="gap-2 font-bold text-xs cursor-pointer text-orange-600 dark:text-orange-400 focus:bg-orange-50 dark:focus:bg-orange-900/30 rounded-md"
                      >
                        <RefreshCw className="h-4 w-4" /> Refacturar CFDI
                      </DropdownMenuItem>
                    </>
                  )}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    );

    return cols;
  }, [activeTab, blinkQuery, expandedParents]);

  const excelExportName =
    activeTab === "PAGO_CLIENTE"
      ? `COM_Reporte_REP_${format(new Date(), "yyyyMMdd")}`
      : `Boveda_CFDI_${activeTab}_${format(new Date(), "yyyyMMdd")}`;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <style>{`
        @keyframes rowBlink {
          0%, 100% { background-color: transparent; }
          50% { background-color: rgba(245, 158, 11, 0.25); }
        }
        .animate-row-blink {
          animation: rowBlink 1.5s infinite ease-in-out;
          border-radius: 6px;
        }
      `}</style>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Bóveda Digital CFDI
        </h1>
        <p className="text-muted-foreground">
          Historial de comprobantes limpios, cancelados y seguimiento de alertas
          fiscales (SAT).
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <Tabs
            value={activeTab}
            onValueChange={(val) => {
              setActiveTab(val);
              setExpandedParents({});
              // 🚀 LIMPIAMOS LA SELECCIÓN AL CAMBIAR DE PESTAÑA
              setSelectedInvoices([]);
            }}
            className="w-full"
          >
            <TabsList className="grid w-full md:w-[600px] grid-cols-3">
              <TabsTrigger value="FACTURA_CLIENTE">
                Ingresos / C. Porte
              </TabsTrigger>
              <TabsTrigger value="FACTURA_PROVEEDOR">Gastos (CxP)</TabsTrigger>
              <TabsTrigger value="PAGO_CLIENTE">Pagos (REP)</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>

        <CardContent>
          <EnhancedDataTable
            data={hierarchicalRecords}
            columns={columns}
            isLoading={isLoading}
            searchPlaceholder="Buscar por uuid, folio..."
            exportFileName={excelExportName}
            customFilters={customFiltersUI}
            onGlobalSearchChange={(value) => setBlinkQuery(value)}
            // 🚀 ENCENDEMOS LAS CASILLAS PARA SELECCIÓN MASIVA
            enableRowSelection={true}
            selectedRows={selectedInvoices}
            onSelectedRowsChange={setSelectedInvoices}
            rowKey="id"
            // Deshabilitamos la selección si ya está cancelada o en proceso
            isRowSelectable={(row) =>
              row.estatus !== "CANCELADO" &&
              row.status_sat !== "CANCELADO" &&
              row.status_sat !== "PROCESO_CANCELACION"
            }
          />
        </CardContent>
      </Card>

      <CreateInvoiceModal
        open={refactorModalOpen}
        onOpenChange={(isOpen) => {
          setRefactorModalOpen(isOpen);
          if (!isOpen) setInvoiceToRefactor(null);
        }}
        invoiceToRefactor={invoiceToRefactor}
        onSubmit={() => {
          if (refetch) refetch();
        }}
      />

      <InvoiceDetailSheet
        open={detailDrawerOpen}
        onOpenChange={(isOpen) => {
          setDetailDrawerOpen(isOpen);
          if (!isOpen) setTimeout(() => setSelectedInvoice(null), 300);
        }}
        invoice={selectedInvoice}
        onVerifySat={async (id) => {
          try {
            const toastId = toast.loading(
              "Consultando estatus real en el SAT...",
            );
            await axiosClient.get(`/api/finance/receivables/${id}/verify-sat`);
            toast.success("Estatus Actualizado", {
              id: toastId,
              description: "La información del SAT se ha sincronizado.",
            });
            if (refetch) refetch();
          } catch (error: any) {
            toast.error(
              error.response?.data?.detail || "No se pudo conectar con el SAT.",
            );
          }
        }}
        onRetryCancel={async (id, motivo) => {
          try {
            const toastId = toast.loading(
              "Enviando solicitud de cancelación al SAT...",
            );

            // 1. Enviamos la orden de cancelación
            await axiosClient.post(
              `/api/finance/receivables/${id}/cancel-sat`,
              { motivo },
            );

            // 2. Cambiamos el mensaje del Toast para avisar que estamos verificando
            toast.loading("Sincronizando estatus final con Hacienda...", {
              id: toastId,
            });

            // 3. Consultamos el estatus real INMEDIATAMENTE después de cancelar
            await axiosClient.get(`/api/finance/receivables/${id}/verify-sat`);

            // 4. Concluimos con éxito y refrescamos la tabla
            toast.success("¡Cancelación procesada y sincronizada!", {
              id: toastId,
            });

            if (refetch) refetch();
          } catch (error: any) {
            toast.error(
              error.response?.data?.detail ||
                "Error al intentar cancelar o verificar la factura.",
            );
            // Refrescamos por si la cancelación pasó pero la verificación falló
            if (refetch) refetch();
          }
        }}
        onStampPayment={async (paymentId) => {
          try {
            const response = await axiosClient.post(
              `/api/finance/receivables/payments/${paymentId}/stamp`,
            );
            const batchStatus = response.data?.data?.batch_status;
            if (response.status === 202 || batchStatus === "CONCILIACION_REQUERIDA") {
              toast.warning(
                response.data?.detail ||
                  "El REP quedó en conciliación. No se reintentará automáticamente.",
              );
            } else {
              toast.success("Complemento timbrado en el SAT con éxito");
            }
            if (refetch) refetch();
          } catch (error: any) {
            const errorMsg =
              error.response?.data?.detail || "Error al timbrar el pago";
            toast.error(errorMsg);
            throw error;
          }
        }}
        onCancelPayments={async (paymentIds) => {
          try {
            await axiosClient.post("/api/finance/receivables/payments/cancel", {
              payment_ids: paymentIds,
              motivo: "02",
            });
            toast.success("Pagos cancelados y saldo restaurado correctamente.");
            if (refetch) refetch();
          } catch (error: any) {
            toast.error(
              error.response?.data?.detail || "Error al cancelar pagos",
            );
            throw error;
          }
        }}
      />

      <InvoicePayablesDetailSheet
        open={payableDetailDrawerOpen}
        onOpenChange={(isOpen) => {
          setPayableDetailDrawerOpen(isOpen);
          if (!isOpen) setTimeout(() => setSelectedInvoice(null), 300);
        }}
        invoice={selectedInvoice}
      />
    </div>
  );
}
