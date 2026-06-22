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
} from "lucide-react";
import { toast } from "sonner"; // <-- IMPORTANTE AÑADIR TOAST
import axiosClient from "@/api/axiosClient"; // <-- IMPORTACIÓN PARA LLAMADAS AL SAT

import {
  useCfdiVault,
  CFDIHistoryRecord,
} from "@/features/finance/hooks/useCfdiVault";

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
import { cn } from "@/lib/utils";

import { CreateInvoiceModal } from "@/features/receivables/components/CreateInvoiceModal";
import { InvoiceDetailSheet } from "@/features/receivables/components/InvoiceDetailSheet";
import { InvoicePayablesDetailSheet } from "@/features/payables/components/InvoicePayablesDetailSheet";

export default function CFDIVault() {
  const [activeTab, setActiveTab] = useState("FACTURA_CLIENTE");

  // Filtros
  const [selectedEntity, setSelectedEntity] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [entityComboOpen, setEntityOpen] = useState(false);

  // Estados para Modales (Refacturación)
  const [refactorModalOpen, setRefactorModalOpen] = useState(false);
  const [invoiceToRefactor, setInvoiceToRefactor] = useState<any>(null);

  // ESTADOS PARA PANELES DE DETALLE
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [payableDetailDrawerOpen, setPayableDetailDrawerOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

  const { records, isLoading, refetch } = useCfdiVault(activeTab);

  const cleanRecords = useMemo(() => {
    return records.filter((r) => {
      const statusStr = r.estatus?.toLowerCase() || "";
      return statusStr !== "error_sat" && statusStr !== "error";
    });
  }, [records]);

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

  const filteredRecords = useMemo(() => {
    return cleanRecords.filter((r) => {
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
  }, [cleanRecords, selectedEntity, selectedStatus, dateRange]);

  const customFiltersUI = (
    <>
      <Popover open={entityComboOpen} onOpenChange={setEntityOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={entityComboOpen}
            className="w-[280px] justify-between h-11 bg-white dark:bg-slate-900 border-slate-200"
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
        <SelectTrigger className="w-[180px] h-11 bg-white dark:bg-slate-900 border-slate-200">
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
              "w-[260px] justify-start text-left font-normal h-11 bg-white dark:bg-slate-900 border-slate-200",
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
    </>
  );

  const handleOpenDetail = (row: any) => {
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
        viaje_id: row.viaje_id,
        saldo_pendiente: row.estatus === "TIMBRADA" ? row.monto_total : 0,
      });
      setDetailDrawerOpen(true);
    }
  };

  // ==========================================
  // CONFIGURACIÓN DINÁMICA DE COLUMNAS
  // ==========================================
  const columns = useMemo(() => {
    const cols: ColumnDef<any>[] = [];

    // SI ESTAMOS EN LA PESTAÑA DE PAGOS, ESTAS SON LAS COLUMNAS BASE
    if (activeTab === "PAGO_CLIENTE") {
      cols.push({
        key: "numero_complemento",
        header: "No. Complemento",
        render: (_, row: any) => {
          let displayFolio = "N/A";
          const rawFolio = String(
            row.folio_interno || row.folio || row.numero_complemento || "",
          );

          // TRUCO MAESTRO: Sincronización del histórico (ID 28 + 2546 = COM-2574)
          if (row.uuid && rawFolio.toUpperCase().startsWith("PAGO-")) {
            const idReal = parseInt(rawFolio.replace(/[^0-9]/g, "")) || row.id;
            displayFolio = `COM-${idReal + 2546}`;
          } else {
            const cleanFolio = rawFolio.replace(/^(PAGO|COM)-?/i, "");
            displayFolio = cleanFolio ? `COM-${cleanFolio}` : "N/A";
          }

          return <span className="font-mono bold">{displayFolio}</span>;
        },
      });
      cols.push({ key: "uuid", header: "UUID" });
      cols.push({
        key: "folio_relacionado",
        header: "Origen (CP/F)",
        render: (_, row: any) => (
          <span className="font-mono text-xs text-slate-500">
            {row.folio_relacionado || "N/A"}
          </span>
        ),
      });
    }
    // PARA FACTURAS NORMALES DE CLIENTES O PROVEEDORES, ESTAS SON LAS COLUMNAS BASE
    else {
      cols.push({ key: "folio", header: "Folio" });
      cols.push({ key: "uuid", header: "UUID" });
      cols.push({
        key: "viaje_id",
        header: "Viaje",
        render: (val) =>
          val ? (
            <Badge
              variant="outline"
              className="bg-blue-50 text-blue-700 border-blue-200 font-mono"
            >
              #{val}
            </Badge>
          ) : (
            <span className="text-muted-foreground text-xs">N/A</span>
          ),
      });
    }

    // COLUMNAS COMUNES PARA TODAS LAS PESTAÑAS (Entidad, Emisión, Monto, Estatus, Acciones)
    cols.push(
      {
        key: "cliente_proveedor_nombre",
        header: "Entidad",
        width: "max-w-[250px] truncate",
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
        render: (val) => {
          const s = (val || "").toUpperCase();
          let badgeClass = "bg-slate-100 text-slate-800 border-slate-200";
          if (s === "TIMBRADA" || s === "TIMBRADO")
            badgeClass =
              "bg-green-100 text-green-800 hover:bg-green-200 border-green-300";
          if (s === "CANCELADO")
            badgeClass =
              "bg-red-100 text-red-800 hover:bg-red-200 border-red-300";
          if (s === "PROVISIONAL")
            badgeClass =
              "bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-300";
          if (s === "RECIBO INTERNO")
            badgeClass =
              "bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-300";

          return (
            <Badge variant="outline" className={badgeClass}>
              {s}
            </Badge>
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

          // LÓGICA DE DESCARGA FORZADA PARA RENOMBRAR LOS ARCHIVOS
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

            // SI ES COMPLEMENTO DE PAGO, FORZAR EL NOMBRE COM-folio_rfc_uuid
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
            <div className="flex items-center justify-end gap-1 pr-2">
              <Button
                variant="ghost"
                size="icon"
                title="Ver Detalle"
                onClick={() => handleOpenDetail(row)}
                className="text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 h-8 w-8 rounded-lg transition-colors"
              >
                <Eye className="h-4 w-4" />
              </Button>

              {activeTab === "FACTURA_CLIENTE" &&
                row.estatus !== "PROVISIONAL" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    title="Refacturar CFDI"
                    className="text-orange-600 hover:text-orange-900 hover:bg-orange-50 border border-transparent hover:border-orange-200 h-8 px-2"
                    onClick={() => {
                      setInvoiceToRefactor({
                        uuid: row.uuid,
                        subtotal: row.monto_total / 1.16,
                        monto_total: row.monto_total,
                        client: { razon_social: row.cliente_proveedor_nombre },
                        concepto: `Refacturación de ${row.folio}`,
                      });
                      setRefactorModalOpen(true);
                    }}
                  >
                    <RefreshCw className="h-4 w-4 sm:mr-1.5" />
                    <span className="hidden sm:inline">Refacturar</span>
                  </Button>
                )}

              {hasPdf ? (
                <Button
                  variant="ghost"
                  size="icon"
                  title="Descargar PDF"
                  className="text-rose-600 hover:text-rose-900 hover:bg-rose-50 h-8 w-8 rounded"
                  onClick={() => downloadFile("pdf")}
                >
                  <FileText className="h-4 w-4" />
                </Button>
              ) : (
                <span className="text-[10px] text-muted-foreground mr-1">
                  No PDF
                </span>
              )}

              {hasXml ? (
                <Button
                  variant="ghost"
                  size="icon"
                  title="Descargar XML"
                  className="text-blue-600 hover:text-blue-900 hover:bg-blue-50 h-8 w-8 rounded"
                  onClick={() => downloadFile("xml")}
                >
                  <FileCode className="h-4 w-4" />
                </Button>
              ) : (
                <span className="text-[10px] text-muted-foreground">
                  No XML
                </span>
              )}
            </div>
          );
        },
      },
    );

    return cols;
  }, [activeTab]);

  // Nombre de exportación dinámico para Excel
  const excelExportName =
    activeTab === "PAGO_CLIENTE"
      ? `COM_Reporte_REP_${format(new Date(), "yyyyMMdd")}`
      : `Boveda_CFDI_${activeTab}_${format(new Date(), "yyyyMMdd")}`;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Bóveda Digital CFDI
        </h1>
        <p className="text-muted-foreground">
          Historial de comprobantes limpios y cancelados (Excluye rechazos del
          SAT).
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
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
            data={filteredRecords}
            columns={columns}
            isLoading={isLoading}
            searchPlaceholder="Búsqueda rápida (Folio, UUID)..."
            exportFileName={excelExportName}
            initialSort={{ key: "fecha_emision", direction: "desc" }}
            customFilters={customFiltersUI}
          />
        </CardContent>
      </Card>

      {/* MODAL DE REFACTURACIÓN */}
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

      {/* DETALLE FACTURAS CLIENTES Y COMPLEMENTOS 👇 CONECTADO A FASE 2 Y 3 */}
      <InvoiceDetailSheet
        open={detailDrawerOpen}
        onOpenChange={(isOpen) => {
          setDetailDrawerOpen(isOpen);
          if (!isOpen) setTimeout(() => setSelectedInvoice(null), 300);
        }}
        invoice={selectedInvoice}
        onStampPayment={async (paymentId) => {
          try {
            await axiosClient.post(
              `/finance/receivables/payments/${paymentId}/stamp`,
            );
            toast.success("Complemento timbrado en el SAT con éxito");
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

      {/* DETALLE FACTURAS PROVEEDORES */}
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
