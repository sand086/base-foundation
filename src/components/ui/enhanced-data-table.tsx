import * as React from "react";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import * as XLSX from "xlsx";
import {
  Search,
  Filter,
  Download,
  Copy,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CalendarIcon,
  X,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

// Types
export interface ColumnDef<T> {
  key: keyof T | string;
  header: string;
  sortable?: boolean;
  type?: "text" | "date" | "status" | "number";
  statusOptions?: string[];
  statusNormalizer?: (value: any) => string;
  render?: (value: any, row: T) => React.ReactNode;
  width?: string;
}

interface EnhancedDataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  className?: string;
  onRowClick?: (row: T) => void;
  exportFileName?: string;
  searchPlaceholder?: string;
  isLoading?: boolean;
}

type SortDirection = "asc" | "desc" | null;

interface SortConfig {
  key: string;
  direction: SortDirection;
}

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

interface ColumnFilters {
  [key: string]: {
    type: "text" | "date" | "status";
    value: string | DateRange | string[];
  };
}

export function EnhancedDataTable<T extends Record<string, any>>({
  data,
  columns,
  className,
  onRowClick,
  exportFileName = "export",
  searchPlaceholder = "Buscar en todas las columnas...",
  isLoading = false,
}: EnhancedDataTableProps<T>) {
  // State
  const [globalSearch, setGlobalSearch] = useState("");
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [columnFilters, setColumnFilters] = useState<ColumnFilters>({});
  const [showFilters, setShowFilters] = useState(false);

  // Get value from nested keys
  const getValue = (row: T, key: string): any => {
    return key.split(".").reduce((obj, k) => obj?.[k], row);
  };

  // Filter data
  const filteredData = useMemo(() => {
    let result = [...data];

    // Global search
    if (globalSearch) {
      const searchLower = globalSearch.toLowerCase();
      result = result.filter((row) =>
        columns.some((col) => {
          const value = getValue(row, col.key as string);
          return String(value).toLowerCase().includes(searchLower);
        }),
      );
    }

    // Column filters
    Object.entries(columnFilters).forEach(([key, filter]) => {
      if (!filter.value) return;

      if (
        filter.type === "text" &&
        typeof filter.value === "string" &&
        filter.value
      ) {
        result = result.filter((row) =>
          String(getValue(row, key))
            .toLowerCase()
            .includes(filter.value.toString().toLowerCase()),
        );
      } else if (
        filter.type === "date" &&
        typeof filter.value === "object" &&
        "from" in filter.value
      ) {
        const range = filter.value as DateRange;
        if (range.from || range.to) {
          result = result.filter((row) => {
            const dateValue = new Date(getValue(row, key));
            if (range.from && dateValue < range.from) return false;
            if (range.to && dateValue > range.to) return false;
            return true;
          });
        }
      } else if (
        filter.type === "status" &&
        Array.isArray(filter.value) &&
        filter.value.length > 0
      ) {
        const statusValues = filter.value as string[];
        const column = columns.find((c) => String(c.key) === key);

        result = result.filter((row) => {
          const rawValue = getValue(row, key);
          const comparableValue = column?.statusNormalizer
            ? column.statusNormalizer(rawValue)
            : String(rawValue ?? "");

          return statusValues.includes(comparableValue);
        });
      }
    });

    return result;
  }, [data, globalSearch, columnFilters, columns]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortConfig || !sortConfig.direction) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = getValue(a, sortConfig.key);
      const bValue = getValue(b, sortConfig.key);

      if (aValue === bValue) return 0;
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      const comparison = aValue < bValue ? -1 : 1;
      return sortConfig.direction === "asc" ? comparison : -comparison;
    });
  }, [filteredData, sortConfig]);

  // Paginate data
  const paginatedData = useMemo(() => {
    if (pageSize === -1) return sortedData; // Show all
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const totalPages =
    pageSize === -1 ? 1 : Math.ceil(sortedData.length / pageSize);

  // Handlers
  const handleSort = (key: string) => {
    setSortConfig((prev) => {
      if (prev?.key !== key) return { key, direction: "asc" };
      if (prev.direction === "asc") return { key, direction: "desc" };
      if (prev.direction === "desc") return null;
      return { key, direction: "asc" };
    });
  };

  const handleCopyToClipboard = async () => {
    const headers = columns.map((c) => c.header).join("\t");
    const rows = sortedData
      .map((row) =>
        columns.map((col) => getValue(row, col.key as string)).join("\t"),
      )
      .join("\n");

    await navigator.clipboard.writeText(`${headers}\n${rows}`);
    toast.success("Datos copiados al portapapeles");
  };

  const handleExportExcel = () => {
    const exportData = sortedData.map((row) =>
      columns.reduce(
        (acc, col) => {
          acc[col.header] = getValue(row, col.key as string);
          return acc;
        },
        {} as Record<string, any>,
      ),
    );

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Datos");
    XLSX.writeFile(wb, `${exportFileName}.xlsx`);
    toast.success("Archivo Excel descargado");
  };

  const clearFilters = () => {
    setColumnFilters({});
    setGlobalSearch("");
  };

  const hasActiveFilters =
    Object.keys(columnFilters).length > 0 || globalSearch;

  const getSortIcon = (key: string) => {
    if (sortConfig?.key !== key)
      return <ChevronsUpDown className="h-3.5 w-3.5 text-slate-300 ml-2" />;
    if (sortConfig.direction === "asc")
      return <ChevronUp className="h-3.5 w-3.5 text-emerald-500 ml-2" />;
    return <ChevronDown className="h-3.5 w-3.5 text-emerald-500 ml-2" />;
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* TOOLBAR TAHOE */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {/* Global Search */}
        <div className="relative flex-1 min-w-[250px] max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder={searchPlaceholder}
            value={globalSearch}
            onChange={(e) => {
              setGlobalSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-10 h-10 glass-card border-slate-200 shadow-sm focus:ring-brand-red/20 font-medium"
          />
        </div>

        {/* Filters Button & Popover */}
        <Popover open={showFilters} onOpenChange={setShowFilters}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="h-10 px-4 glass-card border-slate-200 text-[11px] font-black uppercase tracking-widest text-slate-600 hover:text-brand-navy shadow-sm transition-all"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filtros
              {hasActiveFilters && (
                <Badge className="ml-2 h-5 px-1.5 bg-brand-red text-white border-none shadow-sm">
                  {Object.keys(columnFilters).length + (globalSearch ? 1 : 0)}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-80 glass-panel border-white/20 shadow-2xl p-5"
            align="start"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200/50 pb-3">
                <h4 className="text-[11px] font-black text-brand-navy uppercase tracking-[0.2em]">
                  Filtros Avanzados
                </h4>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="h-7 text-[9px] font-bold uppercase tracking-widest text-rose-500 hover:bg-rose-50"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Limpiar
                  </Button>
                )}
              </div>

              <ScrollArea className="max-h-[300px] pr-3 custom-scrollbar">
                <div className="space-y-5">
                  {columns.map((col) => {
                    const key = col.key as string;
                    const colType = col.type || "text";

                    if (colType === "date") {
                      const dateFilter = (columnFilters[key]
                        ?.value as DateRange) || {
                        from: undefined,
                        to: undefined,
                      };
                      return (
                        <div key={key} className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            {col.header}
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className="h-9 glass-card border-slate-200 text-xs justify-start font-medium text-slate-600"
                                >
                                  <CalendarIcon className="h-3 w-3 mr-2 text-slate-400" />
                                  {dateFilter.from
                                    ? format(dateFilter.from, "dd/MM/yy")
                                    : "Desde"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent
                                className="w-auto p-0 glass-panel border-white/20"
                                align="start"
                              >
                                <Calendar
                                  mode="single"
                                  selected={dateFilter.from}
                                  onSelect={(date) => {
                                    setColumnFilters((prev) => ({
                                      ...prev,
                                      [key]: {
                                        type: "date",
                                        value: { ...dateFilter, from: date },
                                      },
                                    }));
                                    setCurrentPage(1);
                                  }}
                                  locale={es}
                                />
                              </PopoverContent>
                            </Popover>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className="h-9 glass-card border-slate-200 text-xs justify-start font-medium text-slate-600"
                                >
                                  <CalendarIcon className="h-3 w-3 mr-2 text-slate-400" />
                                  {dateFilter.to
                                    ? format(dateFilter.to, "dd/MM/yy")
                                    : "Hasta"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent
                                className="w-auto p-0 glass-panel border-white/20"
                                align="start"
                              >
                                <Calendar
                                  mode="single"
                                  selected={dateFilter.to}
                                  onSelect={(date) => {
                                    setColumnFilters((prev) => ({
                                      ...prev,
                                      [key]: {
                                        type: "date",
                                        value: { ...dateFilter, to: date },
                                      },
                                    }));
                                    setCurrentPage(1);
                                  }}
                                  locale={es}
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                        </div>
                      );
                    }

                    if (colType === "status" && col.statusOptions) {
                      const selectedStatuses =
                        (columnFilters[key]?.value as string[]) || [];
                      return (
                        <div key={key} className="space-y-2.5">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            {col.header}
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {col.statusOptions.map((status) => (
                              <div
                                key={status}
                                className={cn(
                                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-widest cursor-pointer transition-all",
                                  selectedStatuses.includes(status)
                                    ? "bg-brand-navy text-white border-brand-navy shadow-md"
                                    : "bg-white/50 text-slate-500 border-slate-200 hover:bg-slate-50",
                                )}
                                onClick={() => {
                                  const newSelected = selectedStatuses.includes(
                                    status,
                                  )
                                    ? selectedStatuses.filter(
                                        (s) => s !== status,
                                      )
                                    : [...selectedStatuses, status];

                                  if (newSelected.length === 0) {
                                    const { [key]: _, ...rest } = columnFilters;
                                    setColumnFilters(rest);
                                  } else {
                                    setColumnFilters((prev) => ({
                                      ...prev,
                                      [key]: {
                                        type: "status",
                                        value: newSelected,
                                      },
                                    }));
                                  }
                                  setCurrentPage(1);
                                }}
                              >
                                <Checkbox
                                  checked={selectedStatuses.includes(status)}
                                  className="h-3 w-3 border-current"
                                />
                                {status}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }

                    return null;
                  })}
                </div>
              </ScrollArea>
            </div>
          </PopoverContent>
        </Popover>

        {/* Export Buttons */}
        <div className="flex items-center gap-2 ml-auto">
          <Button
            variant="outline"
            className="h-10 px-4 glass-card border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-800 shadow-sm transition-all"
            onClick={handleCopyToClipboard}
          >
            <Copy className="h-3.5 w-3.5 mr-2" />
            Copiar
          </Button>
          <Button
            variant="outline"
            className="h-10 px-4 glass-card border-slate-200 text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 shadow-sm transition-all"
            onClick={handleExportExcel}
          >
            <Download className="h-3.5 w-3.5 mr-2" />
            Excel
          </Button>
        </div>
      </div>

      {/* TABLE: Liquid Glass Style */}
      <div className="relative w-full overflow-hidden rounded-2xl border border-white/40 bg-white/30 backdrop-blur-sm shadow-xl liquid-glass-table">
        <div className="overflow-auto max-h-[60vh] custom-scrollbar">
          <table className="w-full caption-bottom text-sm">
            <thead className="sticky top-0 z-20 backdrop-blur-xl bg-slate-900/5 border-b border-white/20">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key as string}
                    className={cn(
                      "h-12 px-6 text-left align-middle",
                      "text-[10px] font-black uppercase tracking-[0.2em] text-slate-500",
                      col.sortable !== false &&
                        "cursor-pointer select-none hover:text-brand-navy transition-colors",
                      col.width,
                    )}
                    onClick={() =>
                      col.sortable !== false && handleSort(col.key as string)
                    }
                  >
                    <div className="flex items-center">
                      {col.header}
                      {col.sortable !== false && getSortIcon(col.key as string)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="[&_tr:last-child]:border-0 table-staggered">
              {isLoading ? (
                <tr>
                  <td colSpan={columns.length} className="p-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Loader2 className="h-8 w-8 animate-spin text-brand-red/50" />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                        Cargando datos...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="p-12 text-center text-[11px] font-bold uppercase tracking-widest text-slate-400"
                  >
                    No se encontraron registros
                  </td>
                </tr>
              ) : (
                paginatedData.map((row, idx) => (
                  <tr
                    key={idx}
                    className={cn(
                      "border-b border-white/10 dark:border-white/5 interactive-row",
                      "transition-colors duration-200 ease-out",
                      "hover:bg-white/50",
                      onRowClick && "cursor-pointer",
                    )}
                    onClick={() => onRowClick?.(row)}
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key as string}
                        className="px-6 py-4 align-middle text-sm font-medium text-slate-700"
                      >
                        {col.render
                          ? col.render(getValue(row, col.key as string), row)
                          : getValue(row, col.key as string)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION: Tahoe Footer Style */}
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 border-t border-white/20 bg-white/50 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Mostrar
            </span>
            <Select
              value={String(pageSize)}
              onValueChange={(val) => {
                setPageSize(val === "all" ? -1 : Number(val));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-[80px] glass-card border-slate-200 font-bold text-xs shadow-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="glass-panel border-white/20">
                <SelectItem value="10" className="font-semibold text-xs">
                  10
                </SelectItem>
                <SelectItem value="20" className="font-semibold text-xs">
                  20
                </SelectItem>
                <SelectItem value="50" className="font-semibold text-xs">
                  50
                </SelectItem>
                <SelectItem value="100" className="font-semibold text-xs">
                  100
                </SelectItem>
                <SelectItem value="all" className="font-semibold text-xs">
                  Todos
                </SelectItem>
              </SelectContent>
            </Select>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              de {sortedData.length} registros
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="px-4 text-[10px] font-black uppercase tracking-[0.2em] text-brand-navy">
              Página {currentPage} de {totalPages}
            </span>
            <div className="flex items-center gap-1 ml-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 glass-card border-slate-200 text-slate-500 hover:text-brand-navy hover:bg-white"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1 || pageSize === -1}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 glass-card border-slate-200 text-slate-500 hover:text-brand-navy hover:bg-white"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1 || pageSize === -1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 glass-card border-slate-200 text-slate-500 hover:text-brand-navy hover:bg-white"
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages || pageSize === -1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 glass-card border-slate-200 text-slate-500 hover:text-brand-navy hover:bg-white"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages || pageSize === -1}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
