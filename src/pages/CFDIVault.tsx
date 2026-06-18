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
  RefreshCw, // <--- NUEVO ICONO
} from "lucide-react";

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

// <--- IMPORTAMOS EL MODAL DE CREACIÓN/REFACTURACIÓN
import { CreateInvoiceModal } from "@/features/receivables/components/CreateInvoiceModal";

export default function CFDIVault() {
  const [activeTab, setActiveTab] = useState("FACTURA_CLIENTE");

  // Estados para nuestros FILTROS PERSONALIZADOS
  const [selectedEntity, setSelectedEntity] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [entityComboOpen, setEntityOpen] = useState(false);

  // <--- ESTADOS PARA EL MODAL DE REFACTURACIÓN
  const [refactorModalOpen, setRefactorModalOpen] = useState(false);
  const [invoiceToRefactor, setInvoiceToRefactor] = useState<any>(null);

  // Traemos los datos de la BD
  const { records, isLoading, refetch } = useCfdiVault(activeTab); // <--- AGREGAMOS mutate (si usas SWR) o recarga

  // Filtramos a nivel local cualquier error sat que se haya colado
  const cleanRecords = useMemo(() => {
    return records.filter((r) => {
      const statusStr = r.estatus?.toLowerCase() || "";
      return statusStr !== "error_sat" && statusStr !== "error";
    });
  }, [records]);

  // Extraemos listas únicas para llenar los Selects (usando cleanRecords)
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

  // ==========================================
  // MOTOR DE FILTRADO EXTERNO
  // ==========================================
  const filteredRecords = useMemo(() => {
    return cleanRecords.filter((r) => {
      // 1. Filtro Cliente / Proveedor
      if (
        selectedEntity !== "all" &&
        r.cliente_proveedor_nombre !== selectedEntity
      )
        return false;

      // 2. Filtro Estatus
      if (selectedStatus !== "all" && r.estatus !== selectedStatus)
        return false;

      // 3. Filtro Rango de Fechas
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

  // ==========================================
  // COMPONENTES DE FILTRO UI
  // ==========================================
  const customFiltersUI = (
    <>
      {/* 1. COMBOBOX: Cliente / Proveedor con Búsqueda */}
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
                    value={client} // Shadcn command internamente lo pasa a minúsculas
                    onSelect={(currentValue) => {
                      // Recuperamos el valor original con mayúsculas de la lista
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

      {/* 2. SELECT NORMAL: Estatus */}
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

      {/* 3. DATE RANGE PICKER: Intervalo de Fechas */}
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

      {/* BOTÓN: Limpiar Filtros */}
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

  // ==========================================
  // DEFINICIÓN DE COLUMNAS
  // ==========================================
  const columns: ColumnDef<CFDIHistoryRecord>[] = [
    { key: "folio", header: "Folio" },
    { key: "uuid", header: "UUID" },
    {
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
    },
    {
      key: "cliente_proveedor_nombre",
      header: "Cliente / Proveedor",
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

        // Asignamos colores semánticos basados en el SAT
        let badgeClass = "bg-slate-100 text-slate-800 border-slate-200";
        if (s === "TIMBRADO")
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
      header: "Descargas",
      sortable: false,
      render: (_, row: any) => {
        // 1. Extraemos de forma segura el arreglo de archivos históricos que manda el backend
        const listaArchivos = Array.isArray(row.versiones_archivos)
          ? row.versiones_archivos
          : [];

        // 2. Buscamos dinámicamente el archivo XML (Priorizando el que esté activo "is_active")
        const xmlDoc =
          listaArchivos.find(
            (f: any) => f.document_type === "xml" && f.is_active,
          ) || listaArchivos.find((f: any) => f.document_type === "xml");
        const finalXmlUrl = row.xml_url || xmlDoc?.file_url || "";

        // 3. Hacemos lo mismo para el PDF como respaldo de row.pdf_url
        const pdfDoc =
          listaArchivos.find(
            (f: any) => f.document_type === "pdf" && f.is_active,
          ) || listaArchivos.find((f: any) => f.document_type === "pdf");
        const finalPdfUrl = row.pdf_url || pdfDoc?.file_url || "";

        return (
          <div className="flex items-center justify-end gap-1.5 pr-2">
            {/* BOTÓN REFACTURAR (Solo aparece si es Ingreso y si tiene un cliente asociado) */}
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

            {/* BOTÓN PDF CORREGIDO */}
            {finalPdfUrl ? (
              <Button
                variant="ghost"
                size="sm"
                title="Ver PDF"
                className="text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 border border-transparent hover:border-indigo-200 h-8 px-2"
                onClick={() => window.open(finalPdfUrl, "_blank")}
              >
                <FileText className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">PDF</span>
              </Button>
            ) : (
              <span className="text-[10px] text-muted-foreground mr-1">
                No PDF
              </span>
            )}

            {/* BOTÓN XML CORREGIDO Y FUNCIONAL PARA CUALQUIER COMPLEMENTO O FACTURA */}
            {finalXmlUrl ? (
              <Button
                variant="ghost"
                size="sm"
                title="Ver XML"
                className="text-amber-600 hover:text-amber-900 hover:bg-amber-50 border border-transparent hover:border-amber-200 h-8 px-2"
                onClick={() => window.open(finalXmlUrl, "_blank")}
              >
                <FileCode className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">XML</span>
              </Button>
            ) : (
              <span className="text-[10px] text-muted-foreground">No XML</span>
            )}
          </div>
        );
      },
    },
  ];

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
            exportFileName={`Boveda_CFDI_${activeTab}_${format(new Date(), "yyyyMMdd")}`}
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
          // Usamos refetch para recargar la tabla desde la BD
          if (refetch) refetch();
        }}
      />
    </div>
  );
}
