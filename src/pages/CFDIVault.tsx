import React, { useState, useMemo } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { History, CalendarIcon, X, Check, ChevronsUpDown } from "lucide-react";

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
import { CFDITimelineDrawer } from "@/features/finance/components/CFDITimelineDrawer";
import { cn } from "@/lib/utils";

export default function CFDIVault() {
  const [activeTab, setActiveTab] = useState("FACTURA_CLIENTE");

  // Estados para el Drawer
  const [selectedRecord, setSelectedRecord] =
    useState<CFDIHistoryRecord | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Estados para nuestros FILTROS PERSONALIZADOS
  const [selectedEntity, setSelectedEntity] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [entityComboOpen, setEntityOpen] = useState(false);

  // Traemos los datos de la BD
  const { records, isLoading } = useCfdiVault(activeTab);

  // Extraemos listas únicas para llenar los Selects
  const uniqueStatuses = useMemo(
    () => Array.from(new Set(records.map((r) => r.estatus))).filter(Boolean),
    [records],
  );
  const uniqueClients = useMemo(
    () =>
      Array.from(
        new Set(records.map((r) => r.cliente_proveedor_nombre)),
      ).filter(Boolean),
    [records],
  );

  // ==========================================
  // MOTOR DE FILTRADO EXTERNO
  // ==========================================
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
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
  }, [records, selectedEntity, selectedStatus, dateRange]);

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
  // DEFINICIÓN DE COLUMNAS (Sin filtros internos)
  // ==========================================
  const columns: ColumnDef<CFDIHistoryRecord>[] = [
    { key: "folio", header: "Folio" },
    { key: "uuid", header: "UUID" },
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
      render: (val) => (
        <Badge variant={val === "CANCELADO" ? "destructive" : "default"}>
          {val}
        </Badge>
      ),
    },
    {
      key: "acciones",
      header: "Auditoría",
      sortable: false,
      render: (_, record) => (
        <div className="text-right">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedRecord(record);
              setIsDrawerOpen(true);
            }}
          >
            <History className="h-4 w-4 mr-2" />
            Ver Historial
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Bóveda Digital CFDI
        </h1>
        <p className="text-muted-foreground">
          Historial de versiones, auditoría y trazabilidad de comprobantes.
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
            data={filteredRecords} // Pasamos la data ya filtrada por nuestros controles
            columns={columns}
            isLoading={isLoading}
            searchPlaceholder="Búsqueda global (Folio, UUID)..."
            exportFileName={`Boveda_CFDI_${activeTab}_${format(new Date(), "yyyyMMdd")}`}
            initialSort={{ key: "fecha_emision", direction: "desc" }}
            customFilters={customFiltersUI} // Inyectamos nuestros filtros en la barra superior
          />
        </CardContent>
      </Card>

      <CFDITimelineDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        record={selectedRecord}
      />
    </div>
  );
}
