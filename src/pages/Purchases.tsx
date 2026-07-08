import { useState, useMemo } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  EnhancedDataTable,
  ColumnDef,
} from "@/components/ui/enhanced-data-table";
import { PageHeader } from "@/components/ui/page-header";
import {
  MoreHorizontal,
  FileText,
  AlertCircle,
  Eye,
  CreditCard,
  RefreshCcw,
  Loader2,
  Briefcase,
  Search,
  FilterX,
} from "lucide-react";
import { toast } from "sonner";

// Importaciones de Hooks, Componentes y APIs
import { usePayables } from "@/features/payables/hooks/usePayables";
import { useBankAccounts } from "@/features/treasury/hooks/useBankAccounts";
import axiosClient from "@/api/axiosClient";

import { RegisterPaymentModal } from "@/features/treasury/components/RegisterPaymentModal";
import { InvoicePayablesDetailSheet } from "@/features/payables/components/InvoicePayablesDetailSheet";
import { getStatusFromLabel, StatusBadge } from "@/components/ui/status-badge";

export default function Payables() {
  const { invoices, isLoading, error, refetch } = usePayables();
  const { bankAccounts } = useBankAccounts();
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // ==========================================
  // ESTADOS PARA LOS FILTROS
  // ==========================================
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [cecoFilter, setCecoFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");

  const formatCurrency = (amount: number, moneda: string = "MXN") =>
    new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: moneda || "MXN",
    }).format(Math.abs(amount || 0));

  // ==========================================
  // LÓGICA DE FILTRADO Y EXTRACCIÓN DE OPCIONES
  // ==========================================
  const uniqueCecos = useMemo(() => {
    if (!invoices) return [];
    const cecosMap = new Map();
    invoices.forEach((inv) => {
      if (inv.cost_center) {
        cecosMap.set(inv.cost_center.id, inv.cost_center.nombre);
      }
    });
    return Array.from(cecosMap.entries()).map(([id, nombre]) => ({
      id: String(id),
      nombre,
    }));
  }, [invoices]);

  const filteredInvoices = useMemo(() => {
    if (!invoices) return [];
    return invoices.filter((inv) => {
      // 1. Filtro de Búsqueda (Texto)
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm ||
        inv.folio?.toLowerCase().includes(searchLower) ||
        inv.supplier_razon_social?.toLowerCase().includes(searchLower) ||
        inv.uuid?.toLowerCase().includes(searchLower);

      // 2. Filtro de Estatus
      const matchesStatus =
        statusFilter === "all" ||
        inv.estatus?.toLowerCase() === statusFilter.toLowerCase();

      // 3. Filtro de Centro de Costos
      const matchesCeco =
        cecoFilter === "all" || String(inv.cost_center_id) === cecoFilter;

      // 4. Filtro de Fecha (Emisión)
      const matchesDate =
        !dateFilter || inv.fecha_emision?.startsWith(dateFilter);

      return matchesSearch && matchesStatus && matchesCeco && matchesDate;
    });
  }, [invoices, searchTerm, statusFilter, cecoFilter, dateFilter]);

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setCecoFilter("all");
    setDateFilter("");
  };

  // ==========================================
  // KPIS DINÁMICOS (Responden a los filtros)
  // ==========================================
  const kpis = useMemo(() => {
    if (!filteredInvoices)
      return { totalPendiente: 0, vencidas: 0, pagadas: 0, total: 0 };

    return {
      totalPendiente: filteredInvoices
        .filter((i) => i.estatus !== "pagado" && i.estatus !== "cancelado")
        .reduce((acc, curr) => acc + (curr.saldo_pendiente || 0), 0),
      vencidas: filteredInvoices.filter(
        (i) =>
          new Date(i.fecha_vencimiento) < new Date() &&
          i.estatus !== "pagado" &&
          i.estatus !== "cancelado",
      ).length,
      pagadas: filteredInvoices.filter((i) => i.estatus === "pagado").length,
      total: filteredInvoices.length,
    };
  }, [filteredInvoices]);

  // ==========================================
  // COLUMNAS DE LA TABLA
  // ==========================================
  const columns: ColumnDef<any>[] = useMemo(
    () => [
      {
        key: "folio",
        header: "Folio / UUID",
        render: (_, row) => (
          <div className="flex flex-col">
            <span className="font-mono text-sm font-bold text-slate-700 dark:text-slate-300 uppercase truncate max-w-[120px]">
              {row.folio || row.uuid?.split("-")[0] || "S/F"}
            </span>
            <span
              className="text-[9px] text-slate-400 font-mono tracking-wider truncate max-w-[120px]"
              title={row.uuid}
            >
              {row.uuid?.substring(0, 18)}...
            </span>
          </div>
        ),
      },
      {
        key: "supplier_razon_social",
        header: "Proveedor __",
        render: (_, row) => (
          <span
            className="font-black text-brand-navy dark:text-white uppercase tracking-tight truncate max-w-[200px] block"
            title={row.supplier_razon_social}
          >
            {row.supplier_razon_social || "Proveedor General"}
          </span>
        ),
      },
      {
        key: "cost_center",
        header: "Centro de Costos",
        render: (_, row) =>
          row.cost_center ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400 uppercase tracking-widest whitespace-nowrap">
              <Briefcase className="h-3 w-3" />
              {row.cost_center.nombre}
            </span>
          ) : (
            <span className="text-[10px] font-medium italic text-slate-400 uppercase tracking-widest">
              Sin asignar
            </span>
          ),
      },
      {
        key: "fecha_vencimiento",
        header: "Vencimiento / Crédito",
        render: (v, r) => {
          const isVencida =
            new Date(v as string) < new Date() &&
            r.estatus !== "pagado" &&
            r.estatus !== "cancelado";
          const diasCredito = r.supplier?.dias_credito || 0;

          return (
            <div className="flex flex-col">
              <span
                className={`text-xs font-black ${isVencida ? "text-brand-red dark:text-red-500" : "text-slate-600 dark:text-slate-300"}`}
              >
                {v ? format(new Date(v as string), "dd/MMM/yyyy") : "N/A"}
              </span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5 font-bold">
                {diasCredito > 0 ? `${diasCredito} Días` : "Contado"}
              </span>
            </div>
          );
        },
      },
      {
        key: "monto_total",
        header: "Monto Total",
        type: "number",
        render: (v, r) => (
          <span className="font-mono text-sm font-bold text-slate-700 dark:text-slate-300">
            {formatCurrency(v as number, r.moneda)}
          </span>
        ),
      },
      {
        key: "saldo_pendiente",
        header: "Saldo",
        type: "number",
        render: (v, r) => {
          const isNotaCredito = r.tipo_comprobante === "E" || (v as number) < 0;
          return (
            <span
              className={`font-mono text-sm font-bold ${
                isNotaCredito
                  ? "text-blue-600 dark:text-blue-500"
                  : (v as number) > 0
                    ? "text-amber-600 dark:text-amber-500"
                    : "text-emerald-600 dark:text-emerald-500"
              }`}
            >
              {formatCurrency(v as number, r.moneda)}
            </span>
          );
        },
      },
      {
        key: "estatus",
        header: "Estatus",
        render: (v) => {
          const estatusReal = String(v).toLowerCase();
          return (
            <StatusBadge status={getStatusFromLabel(estatusReal)}>
              {estatusReal.replace("_", " ")}
            </StatusBadge>
          );
        },
      },
      {
        key: "id",
        header: "Acciones",
        sortable: false,
        render: (_, row) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all shadow-sm border border-slate-200/50 dark:border-white/10 bg-white/50 dark:bg-slate-900/50"
              >
                <MoreHorizontal className="h-4 w-4 text-slate-500 dark:text-slate-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="glass-panel border-white/20 min-w-[160px] z-50 dark:bg-slate-900/90"
            >
              <DropdownMenuItem
                onClick={() => {
                  setSelectedInvoice(row);
                  setIsDetailOpen(true);
                }}
                className="gap-2 font-bold text-xs uppercase tracking-tight cursor-pointer dark:text-slate-300 dark:focus:bg-slate-800"
              >
                <Eye className="h-4 w-4 mr-2 text-blue-500" />
                Ver Detalles
              </DropdownMenuItem>

              {row.saldo_pendiente > 0 && (
                <>
                  <DropdownMenuSeparator className="dark:bg-white/10" />
                  <DropdownMenuItem
                    onClick={() => {
                      setSelectedInvoice(row);
                      setIsPaymentModalOpen(true);
                    }}
                    className="gap-2 font-bold text-xs uppercase tracking-tight cursor-pointer dark:text-slate-300 dark:focus:bg-slate-800 text-emerald-600"
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Registrar Pago
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4 sm:items-center">
        <PageHeader
          title="CUENTAS POR PAGAR (CxP)"
          description="Control de facturas de proveedores, filtros y egresos operativos"
        />
        <Button
          onClick={refetch}
          variant="outline"
          size="sm"
          className="gap-2 self-start sm:self-auto font-bold text-[10px] uppercase tracking-widest"
        >
          <RefreshCcw
            className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`}
          />
          Sincronizar
        </Button>
      </div>

      {/* ==========================================
          BARRA DE FILTROS SUPERIOR
          ========================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-white/10">
        {/* Buscador */}
        <div className="relative col-span-1 md:col-span-2 lg:col-span-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar proveedor o folio..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-10 bg-white dark:bg-slate-950"
          />
        </div>

        {/* Estatus */}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-10 bg-white dark:bg-slate-950">
            <SelectValue placeholder="Estatus" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los Estatus</SelectItem>
            <SelectItem value="pendiente">Pendiente</SelectItem>
            <SelectItem value="pago_parcial">Pago Parcial</SelectItem>
            <SelectItem value="pagado">Pagado</SelectItem>
            <SelectItem value="cancelado">Cancelado</SelectItem>
          </SelectContent>
        </Select>

        {/* Centro de Costos */}
        <Select value={cecoFilter} onValueChange={setCecoFilter}>
          <SelectTrigger className="h-10 bg-white dark:bg-slate-950">
            <SelectValue placeholder="Centro de Costos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los CECOs</SelectItem>
            {uniqueCecos.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Rango de Fechas (Por Emisión) */}
        <div className="relative">
          <Input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="h-10 bg-white dark:bg-slate-950 w-full text-sm text-slate-700 dark:text-slate-300"
            title="Filtrar por Fecha de Emisión"
          />
        </div>

        {/* Botón Limpiar */}
        <Button
          variant="ghost"
          onClick={clearFilters}
          className="h-10 text-slate-500 hover:text-brand-red flex items-center gap-2 font-bold text-xs uppercase tracking-widest"
        >
          <FilterX className="h-4 w-4" /> Limpiar
        </Button>
      </div>

      {/* ==========================================
          KPIS
          ========================================== */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-l-4 border-l-slate-400 dark:bg-slate-900/50 backdrop-blur-xl">
          <CardContent className="pt-6">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">
              Total Resultados
            </p>
            <p className="text-3xl font-black">{kpis.total}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500 dark:bg-slate-900/50 backdrop-blur-xl">
          <CardContent className="pt-6">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">
              Saldo por Pagar
            </p>
            <p className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400">
              {formatCurrency(kpis.totalPendiente)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-brand-red dark:bg-slate-900/50 backdrop-blur-xl">
          <CardContent className="pt-6">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">
              Facturas Vencidas
            </p>
            <p className="text-3xl font-black text-brand-red">
              {kpis.vencidas}
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500 dark:bg-slate-900/50 backdrop-blur-xl">
          <CardContent className="pt-6">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">
              Facturas Pagadas
            </p>
            <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
              {kpis.pagadas}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ==========================================
          TABLA
          ========================================== */}
      <Card className="shadow-2xl border-none overflow-hidden bg-transparent">
        <CardHeader className="flex flex-row items-center justify-between border-b border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-xl py-6 px-6">
          <CardTitle className="text-xl font-black uppercase tracking-tighter text-brand-navy dark:text-white heading-crisp flex items-center gap-3">
            <FileText className="h-5 w-5 text-brand-red" />
            Catálogo de CxP
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 bg-white dark:bg-slate-950 [&_thead]:bg-slate-50/80 dark:[&_thead]:bg-slate-900/80 [&_thead]:backdrop-blur-xl [&_th]:bg-transparent [&_th]:border-b [&_th]:border-slate-200 dark:[&_th]:border-white/10 [&_th]:text-[10px] [&_th]:font-black [&_th]:uppercase [&_th]:tracking-[0.2em] [&_th]:text-slate-500 dark:[&_th]:text-slate-400">
          {isLoading ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="h-8 w-8 animate-spin mb-4 text-brand-blue" />
              <p className="text-xs font-bold uppercase tracking-widest">
                Cargando Bóveda Financiera...
              </p>
            </div>
          ) : error ? (
            <div className="h-64 flex flex-col items-center justify-center text-brand-red">
              <AlertCircle className="h-8 w-8 mb-4" />
              <p className="text-xs font-bold uppercase tracking-widest">
                Error al cargar datos
              </p>
            </div>
          ) : (
            <EnhancedDataTable
              data={filteredInvoices || []}
              columns={columns}
              exportFileName="Cuentas_Por_Pagar"
            />
          )}
        </CardContent>
      </Card>

      {/* MODAL DETALLES DE FACTURA */}
      {selectedInvoice && (
        <InvoicePayablesDetailSheet
          invoice={selectedInvoice}
          open={isDetailOpen}
          onOpenChange={(isOpen) => {
            setIsDetailOpen(isOpen);
            if (!isOpen) setTimeout(() => setSelectedInvoice(null), 300);
          }}
          onPaymentSuccess={refetch}
        />
      )}

      {/* MODAL REGISTRAR PAGO (TESORERÍA) */}
      {selectedInvoice && (
        <RegisterPaymentModal
          invoice={selectedInvoice}
          open={isPaymentModalOpen}
          onOpenChange={(isOpen) => {
            setIsPaymentModalOpen(isOpen);
            if (!isOpen) setTimeout(() => setSelectedInvoice(null), 300);
          }}
          bankAccounts={bankAccounts || []}
          onSubmit={async (invoiceId, paymentPayload) => {
            try {
              await axiosClient.post(
                `/api/suppliers/invoices/${invoiceId}/payments`,
                paymentPayload,
              );
              toast.success(
                "Pago registrado con éxito. Se actualizó la Tesorería.",
              );
              setIsPaymentModalOpen(false);
              setTimeout(() => setSelectedInvoice(null), 300);
              refetch();
            } catch (err: any) {
              console.error(err);
              toast.error(
                err.response?.data?.detail || "Error al registrar el pago",
              );
            }
          }}
        />
      )}
    </div>
  );
}
