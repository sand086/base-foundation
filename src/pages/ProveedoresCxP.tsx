// src/pages/ProveedoresCxP.tsx
// ✅ Versión SIN datos fake: usa hooks/servicios (DB) en lugar de mockSuppliers/initialPayableInvoices/bankAccounts/initialPayments
// ✅ Mantiene el mismo UI/UX (Tabs, KPIs, tablas, modales)
// ✅ Soporta prefill desde Compras por URL params
// ✅ Aplana pagos desde invoices.payments (tab "Pagos")

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Search,
  Plus,
  Download,
  FileText,
  AlertCircle,
  Eye,
  Edit,
  CreditCard,
  MoreHorizontal,
  Package,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { ActionButton } from "@/components/ui/action-button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import {
  DataTable,
  DataTableHeader,
  DataTableBody,
  DataTableRow,
  DataTableHead,
  DataTableCell,
} from "@/components/ui/data-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

// Feature components
import { RegisterExpenseModal } from "@/features/cxp/RegisterExpenseModal";
import { InvoiceDetailSheet } from "@/features/cxp/InvoiceDetailSheet";
import { RegisterPaymentModal } from "@/features/cxp/RegisterPaymentModal";

// ✅ Tipos & helpers (ajusta si tu proyecto ya los tiene)
import {
  PayableInvoice,
  InvoicePayment,
  getInvoiceStatusInfo,
  getClasificacionLabel,
  getClasificacionColor,
} from "@/features/cxp/types";

// ✅ Hooks reales (DB/API) — crea/ajusta según tus endpoints
import { useSuppliers } from "@/hooks/useSuppliers";
import { useBankAccounts } from "@/hooks/useBankAccounts";

type Supplier = {
  id: number;
  razon_social: string;
  rfc: string;
  contacto?: string | null;
  telefono?: string | null;
  giro?: string | null;
  estatus?: "activo" | "inactivo" | string;
  categoria?: string | null;
  dias_credito?: number | null;
};

interface PrefillData {
  proveedor: string;
  proveedorId: string; // viene como string desde URL
  concepto: string;
  montoTotal: number;
  ordenCompraId: string;
  ordenCompraFolio: string;
}

/**
 * Helpers para normalizar tipos/fechas/strings entre API y UI.
 * Si tu API ya manda todo “bonito”, puedes simplificar.
 */
const safeLower = (v: unknown) =>
  typeof v === "string" ? v.toLowerCase() : "";
const isValidDate = (d: Date) => !Number.isNaN(d.getTime());
const parseDateSafe = (v: unknown): Date | null => {
  if (!v) return null;
  const d = new Date(String(v));
  return isValidDate(d) ? d : null;
};

export default function ProveedoresCxP() {
  const [searchParams, setSearchParams] = useSearchParams();

  // ✅ Data real desde DB/API
  const {
    suppliers,
    invoices,
    isLoadingSuppliers,
    isLoadingInvoices,
    refreshSuppliers,
    refreshInvoices,

    createInvoice, // (payload) => Promise<boolean>
    updateInvoice, // (id, payload) => Promise<boolean>
    registerPayment, // (invoiceId, payload) => Promise<boolean>

    // opcional: si tu hook también trae pagos por separado
    // payments,
  } = useSuppliers();

  const { bankAccounts, isLoadingBankAccounts } = useBankAccounts();

  const [searchCatalog, setSearchCatalog] = useState("");
  const [searchCxP, setSearchCxP] = useState("");

  // Modal states
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // Selections
  const [selectedInvoice, setSelectedInvoice] = useState<PayableInvoice | null>(
    null,
  );
  const [editingInvoice, setEditingInvoice] = useState<PayableInvoice | null>(
    null,
  );
  const [prefillData, setPrefillData] = useState<PrefillData | null>(null);

  /**
   * ✅ Prefill desde Compras vía URL params:
   * /cxp?fromCompras=true&proveedor=...&proveedorId=...&concepto=...&monto=...&ordenId=...&ordenFolio=...
   */
  useEffect(() => {
    const fromCompras = searchParams.get("fromCompras");
    if (fromCompras === "true") {
      const prefill: PrefillData = {
        proveedor: searchParams.get("proveedor") || "",
        proveedorId: searchParams.get("proveedorId") || "",
        concepto: searchParams.get("concepto") || "",
        montoTotal: parseFloat(searchParams.get("monto") || "0"),
        ordenCompraId: searchParams.get("ordenId") || "",
        ordenCompraFolio: searchParams.get("ordenFolio") || "",
      };

      setPrefillData(prefill);
      setEditingInvoice(null);
      setIsExpenseModalOpen(true);

      setSearchParams({});
      toast.info("Datos pre-llenados desde Orden de Compra", {
        description: `${prefill.ordenCompraFolio} - ${prefill.proveedor}`,
      });
    }
  }, [searchParams, setSearchParams]);

  // ✅ KPIs (usa snake_case en invoices si así viene de API)
  const kpis = useMemo(() => {
    const totalVencido = invoices
      .filter((inv) => getInvoiceStatusInfo(inv).status === "danger")
      .reduce(
        (sum, inv) => sum + (inv.saldo_pendiente ?? inv.saldoPendiente ?? 0),
        0,
      );

    const totalPorPagar = invoices
      .filter((inv) => {
        const s = getInvoiceStatusInfo(inv).status;
        return s === "warning" || s === "default";
      })
      .reduce(
        (sum, inv) => sum + (inv.saldo_pendiente ?? inv.saldoPendiente ?? 0),
        0,
      );

    const totalParcial = invoices
      .filter((inv) => getInvoiceStatusInfo(inv).status === "info")
      .reduce(
        (sum, inv) => sum + (inv.saldo_pendiente ?? inv.saldoPendiente ?? 0),
        0,
      );

    const fromComprasCount = invoices.filter(
      (inv) => !!(inv.orden_compra_id ?? inv.ordenCompraId),
    ).length;

    return { totalVencido, totalPorPagar, totalParcial, fromComprasCount };
  }, [invoices]);

  // ✅ Filters
  const filteredSuppliers = useMemo(() => {
    const q = safeLower(searchCatalog);
    return (suppliers as Supplier[]).filter((s) => {
      return (
        safeLower(s.razon_social).includes(q) || safeLower(s.rfc).includes(q)
      );
    });
  }, [suppliers, searchCatalog]);

  const filteredInvoices = useMemo(() => {
    const q = safeLower(searchCxP);
    return invoices.filter((inv) => {
      const proveedor = safeLower(
        inv.supplier_razon_social ?? inv.proveedor ?? "",
      );
      const uuid = safeLower(inv.uuid ?? "");
      const concepto = safeLower(inv.concepto ?? "");
      return proveedor.includes(q) || uuid.includes(q) || concepto.includes(q);
    });
  }, [invoices, searchCxP]);

  // ✅ Aplanar pagos desde invoices.payments (DB)
  const allPayments = useMemo(() => {
    const rows =
      invoices.flatMap((inv) => {
        const supplierName = inv.supplier_razon_social ?? inv.proveedor ?? "";
        const folioFactura =
          inv.folio_interno ??
          inv.id?.toString?.() ??
          (inv.uuid ? inv.uuid.substring(0, 8) : "");
        const payments = (inv.payments ??
          inv.pagos ??
          []) as (InvoicePayment & {
          fecha_pago?: string;
          metodo_pago?: string;
        })[];

        return payments.map((p) => ({
          id: p.id,
          proveedor: supplierName,
          folioFactura,
          fecha_pago: p.fecha_pago ?? p.fecha ?? "",
          monto: p.monto,
          metodo_pago: p.metodo_pago ?? p.metodoPago ?? "Transferencia",
          complemento_uuid:
            (p as any).complemento_uuid ?? (p as any).complementoUUID ?? null,
        }));
      }) ?? [];

    return rows.sort((a, b) => {
      const da = parseDateSafe(a.fecha_pago)?.getTime() ?? 0;
      const db = parseDateSafe(b.fecha_pago)?.getTime() ?? 0;
      return db - da;
    });
  }, [invoices]);

  // ✅ Acciones
  const handleCreateInvoice = async (invoiceData: any) => {
    // invoiceData viene del modal (tu modal ya debe enviar snake_case o tú mapeas aquí)
    const ok = await createInvoice(invoiceData);
    if (ok) {
      toast.success("Factura registrada correctamente");
      setIsExpenseModalOpen(false);
      setPrefillData(null);
      await refreshInvoices?.();
    }
  };

  const handleUpdateInvoice = async (invoiceData: any) => {
    if (!editingInvoice) return;
    const id = Number(editingInvoice.id);
    const ok = await updateInvoice(id, invoiceData);
    if (ok) {
      toast.success("Factura actualizada correctamente");
      setEditingInvoice(null);
      setIsExpenseModalOpen(false);
      await refreshInvoices?.();
    }
  };

  const handleRegisterPayment = async (paymentData: any) => {
    if (!selectedInvoice) return;

    const invoiceId = Number(selectedInvoice.id);
    const ok = await registerPayment(invoiceId, paymentData);
    if (ok) {
      toast.success("Pago registrado correctamente");
      setIsPaymentModalOpen(false);
      setSelectedInvoice(null);
      await refreshInvoices?.();
    }
  };

  // UI handlers
  const handleViewInvoice = (invoice: PayableInvoice) => {
    setSelectedInvoice(invoice);
    setIsDetailSheetOpen(true);
  };

  const handleEditInvoice = (invoice: PayableInvoice) => {
    setEditingInvoice(invoice);
    setPrefillData(null);
    setIsExpenseModalOpen(true);
  };

  const handlePayInvoice = (invoice: PayableInvoice) => {
    setSelectedInvoice(invoice);
    setIsPaymentModalOpen(true);
  };

  const isLoading =
    isLoadingSuppliers || isLoadingInvoices || isLoadingBankAccounts;

  return (
    <div className="space-y-6">
      <PageHeader
        title="PROVEEDORES & CUENTAS POR PAGAR"
        description="Gestión de proveedores, facturas y pagos"
      />

      <Tabs defaultValue="cuentas" className="space-y-4">
        <TabsList className="bg-slate-100">
          <TabsTrigger
            value="catalogo"
            className="data-[state=active]:bg-white"
          >
            Catálogo
          </TabsTrigger>
          <TabsTrigger value="cuentas" className="data-[state=active]:bg-white">
            Cuentas por Pagar
          </TabsTrigger>
          <TabsTrigger value="pagos" className="data-[state=active]:bg-white">
            Pagos y Complementos
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: Catálogo de Proveedores */}
        <TabsContent value="catalogo" className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Buscar por razón social o RFC..."
                value={searchCatalog}
                onChange={(e) => setSearchCatalog(e.target.value)}
                className="pl-10"
              />
            </div>
            <ActionButton
              onClick={() => {
                toast.info("Pendiente: modal de proveedor", {
                  description:
                    "Conecta aquí tu modal/route de alta de proveedor.",
                });
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Proveedor
            </ActionButton>
          </div>

          {isLoading ? (
            <div className="text-sm text-muted-foreground">
              Cargando proveedores...
            </div>
          ) : (
            <DataTable>
              <DataTableHeader>
                <DataTableRow>
                  <DataTableHead>ID</DataTableHead>
                  <DataTableHead>Razón Social</DataTableHead>
                  <DataTableHead>RFC</DataTableHead>
                  <DataTableHead>Contacto</DataTableHead>
                  <DataTableHead>Teléfono</DataTableHead>
                  <DataTableHead>Giro</DataTableHead>
                  <DataTableHead>Estatus</DataTableHead>
                </DataTableRow>
              </DataTableHeader>
              <DataTableBody>
                {filteredSuppliers.map((supplier) => (
                  <DataTableRow key={supplier.id}>
                    <DataTableCell className="font-mono text-xs">
                      {supplier.id}
                    </DataTableCell>
                    <DataTableCell className="font-medium">
                      {supplier.razon_social}
                    </DataTableCell>
                    <DataTableCell className="font-mono text-xs">
                      {supplier.rfc}
                    </DataTableCell>
                    <DataTableCell>{supplier.contacto || "—"}</DataTableCell>
                    <DataTableCell>{supplier.telefono || "—"}</DataTableCell>
                    <DataTableCell>{supplier.giro || "—"}</DataTableCell>
                    <DataTableCell>
                      <StatusBadge
                        status={
                          (supplier.estatus || "activo") === "activo"
                            ? "success"
                            : "warning"
                        }
                      >
                        {(supplier.estatus || "activo") === "activo"
                          ? "Activo"
                          : "Inactivo"}
                      </StatusBadge>
                    </DataTableCell>
                  </DataTableRow>
                ))}
              </DataTableBody>
            </DataTable>
          )}
        </TabsContent>

        {/* TAB 2: Cuentas por Pagar */}
        <TabsContent value="cuentas" className="space-y-4">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-red-200 bg-red-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-red-700 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Total Vencido
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-red-700">
                  ${kpis.totalVencido.toLocaleString("es-MX")}
                </p>
              </CardContent>
            </Card>

            <Card className="border-amber-200 bg-amber-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-amber-700 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Por Pagar (Vigente)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-amber-700">
                  ${kpis.totalPorPagar.toLocaleString("es-MX")}
                </p>
              </CardContent>
            </Card>

            <Card className="border-blue-200 bg-blue-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-blue-700 flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Pagos Parciales
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-blue-700">
                  ${kpis.totalParcial.toLocaleString("es-MX")}
                </p>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Desde Compras
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-slate-700">
                  {kpis.fromComprasCount}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Search and Actions */}
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Buscar por proveedor, UUID o concepto..."
                value={searchCxP}
                onChange={(e) => setSearchCxP(e.target.value)}
                className="pl-10"
              />
            </div>
            <ActionButton
              onClick={() => {
                setEditingInvoice(null);
                setPrefillData(null);
                setIsExpenseModalOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Registrar Gasto
            </ActionButton>
          </div>

          {/* Invoices Table */}
          {isLoading ? (
            <div className="text-sm text-muted-foreground">
              Cargando facturas...
            </div>
          ) : (
            <DataTable>
              <DataTableHeader>
                <DataTableRow>
                  <DataTableHead>ID</DataTableHead>
                  <DataTableHead>Proveedor</DataTableHead>
                  <DataTableHead>Clasificación</DataTableHead>
                  <DataTableHead>Concepto</DataTableHead>
                  <DataTableHead>UUID</DataTableHead>
                  <DataTableHead>Vencimiento</DataTableHead>
                  <DataTableHead className="text-right">Monto</DataTableHead>
                  <DataTableHead className="text-right">Saldo</DataTableHead>
                  <DataTableHead>Estatus</DataTableHead>
                  <DataTableHead className="text-center">
                    Acciones
                  </DataTableHead>
                </DataTableRow>
              </DataTableHeader>

              <DataTableBody>
                {filteredInvoices.map((invoice) => {
                  const statusInfo = getInvoiceStatusInfo(invoice);
                  const saldo =
                    invoice.saldo_pendiente ?? invoice.saldoPendiente ?? 0;
                  const monto = invoice.monto_total ?? invoice.montoTotal ?? 0;

                  const venc =
                    invoice.fecha_vencimiento ?? invoice.fechaVencimiento ?? "";
                  const isOverdue = statusInfo.status === "danger" && saldo > 0;

                  const proveedor =
                    invoice.supplier_razon_social ?? invoice.proveedor ?? "—";
                  const uuid = invoice.uuid ?? "";
                  const clasificacion = (invoice.clasificacion ?? "") as any;

                  const ordenCompraFolio =
                    invoice.orden_compra_folio ??
                    invoice.ordenCompraFolio ??
                    null;

                  return (
                    <DataTableRow
                      key={String(invoice.id)}
                      className={isOverdue ? "bg-red-50/50" : ""}
                    >
                      <DataTableCell className="font-mono text-xs font-medium">
                        <div className="flex flex-col">
                          {invoice.folio_interno ?? invoice.id}
                          {ordenCompraFolio && (
                            <span className="text-[10px] text-muted-foreground">
                              ← {ordenCompraFolio}
                            </span>
                          )}
                        </div>
                      </DataTableCell>

                      <DataTableCell className="font-medium max-w-[150px] truncate">
                        {proveedor}
                      </DataTableCell>

                      <DataTableCell>
                        {clasificacion ? (
                          <Badge
                            className={`text-[10px] ${getClasificacionColor(clasificacion)}`}
                          >
                            {getClasificacionLabel(clasificacion)}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        )}
                      </DataTableCell>

                      <DataTableCell className="max-w-[180px] truncate text-muted-foreground text-xs">
                        {invoice.concepto}
                      </DataTableCell>

                      <DataTableCell className="font-mono text-xs">
                        {uuid ? `${uuid.substring(0, 8)}...` : "—"}
                      </DataTableCell>

                      <DataTableCell
                        className={isOverdue ? "text-red-700 font-medium" : ""}
                      >
                        {venc}
                      </DataTableCell>

                      <DataTableCell className="text-right font-medium">
                        ${monto.toLocaleString("es-MX")}
                        <span className="text-xs text-muted-foreground ml-1">
                          {invoice.moneda ?? invoice.currency ?? "MXN"}
                        </span>
                      </DataTableCell>

                      <DataTableCell
                        className={`text-right font-bold ${
                          saldo === 0
                            ? "text-emerald-700"
                            : isOverdue
                              ? "text-red-700"
                              : "text-amber-700"
                        }`}
                      >
                        ${saldo.toLocaleString("es-MX")}
                      </DataTableCell>

                      <DataTableCell>
                        <StatusBadge status={statusInfo.status}>
                          {statusInfo.label}
                        </StatusBadge>
                      </DataTableCell>

                      <DataTableCell>
                        <div className="flex items-center justify-center gap-1">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent
                              align="end"
                              className="bg-card"
                            >
                              <DropdownMenuItem
                                onClick={() => handleViewInvoice(invoice)}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                Ver Detalle
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() => handleEditInvoice(invoice)}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Editar
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />

                              <DropdownMenuItem
                                onClick={() => handlePayInvoice(invoice)}
                                disabled={saldo === 0}
                                className={
                                  saldo > 0
                                    ? "text-brand-green font-medium"
                                    : ""
                                }
                              >
                                <CreditCard className="h-4 w-4 mr-2" />
                                Registrar Pago
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </DataTableCell>
                    </DataTableRow>
                  );
                })}
              </DataTableBody>
            </DataTable>
          )}
        </TabsContent>

        {/* TAB 3: Pagos y Complementos */}
        <TabsContent value="pagos" className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Buscar por proveedor o folio..."
                className="pl-10"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="text-sm text-muted-foreground">
              Cargando pagos...
            </div>
          ) : (
            <DataTable>
              <DataTableHeader>
                <DataTableRow>
                  <DataTableHead>ID Pago</DataTableHead>
                  <DataTableHead>Proveedor</DataTableHead>
                  <DataTableHead>Folio Factura</DataTableHead>
                  <DataTableHead>Fecha Pago</DataTableHead>
                  <DataTableHead className="text-right">Monto</DataTableHead>
                  <DataTableHead>Método</DataTableHead>
                  <DataTableHead>Acciones</DataTableHead>
                </DataTableRow>
              </DataTableHeader>
              <DataTableBody>
                {allPayments.map((p) => {
                  const fecha = parseDateSafe(p.fecha_pago);
                  return (
                    <DataTableRow key={String(p.id)}>
                      <DataTableCell className="font-mono text-xs">
                        {p.id}
                      </DataTableCell>
                      <DataTableCell className="font-medium">
                        {p.proveedor}
                      </DataTableCell>
                      <DataTableCell>{p.folioFactura}</DataTableCell>
                      <DataTableCell>
                        {fecha
                          ? format(fecha, "dd/MM/yyyy", { locale: es })
                          : p.fecha_pago || "—"}
                      </DataTableCell>
                      <DataTableCell className="text-right font-medium text-emerald-700">
                        ${Number(p.monto || 0).toLocaleString("es-MX")}
                      </DataTableCell>
                      <DataTableCell>
                        <StatusBadge status="success">
                          {p.metodo_pago}
                        </StatusBadge>
                      </DataTableCell>
                      <DataTableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={() => {
                            // TODO: conecta a endpoint real para descargar complemento PDF
                            toast.info("Descarga de complemento", {
                              description:
                                "Conecta el endpoint /payments/{id}/complemento.pdf",
                            });
                          }}
                        >
                          <Download className="h-3 w-3" />
                          Complemento PDF
                        </Button>
                      </DataTableCell>
                    </DataTableRow>
                  );
                })}
              </DataTableBody>
            </DataTable>
          )}
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <RegisterExpenseModal
        open={isExpenseModalOpen}
        onOpenChange={(open) => {
          setIsExpenseModalOpen(open);
          if (!open) {
            setEditingInvoice(null);
            setPrefillData(null);
          }
        }}
        onSubmit={editingInvoice ? handleUpdateInvoice : handleCreateInvoice}
        suppliers={suppliers as any}
        editInvoice={editingInvoice as any}
        prefillData={prefillData as any}
      />

      <InvoiceDetailSheet
        open={isDetailSheetOpen}
        onOpenChange={setIsDetailSheetOpen}
        invoice={selectedInvoice as any}
      />

      <RegisterPaymentModal
        open={isPaymentModalOpen}
        onOpenChange={setIsPaymentModalOpen}
        invoice={selectedInvoice as any}
        bankAccounts={bankAccounts as any} // ✅ pásalo al modal para evitar bankAccounts fake
        onSubmit={handleRegisterPayment}
      />
    </div>
  );
}
