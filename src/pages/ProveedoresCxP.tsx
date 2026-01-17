import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { 
  Search, 
  Plus, 
  Download, 
  FileText,
  Building2,
  AlertCircle,
  Eye,
  Edit,
  CreditCard,
  MoreHorizontal,
  Package
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

// Feature components
import { RegisterExpenseModal } from "@/features/cxp/RegisterExpenseModal";
import { InvoiceDetailSheet } from "@/features/cxp/InvoiceDetailSheet";
import { RegisterPaymentModal } from "@/features/cxp/RegisterPaymentModal";
import { 
  PayableInvoice, 
  InvoicePayment,
  getInvoiceStatusInfo,
  getClasificacionLabel,
  getClasificacionColor,
} from "@/features/cxp/types";
import { mockSuppliers, initialPayableInvoices, bankAccounts } from "@/features/cxp/data";

interface Payment {
  id: string;
  proveedor: string;
  folioFactura: string;
  fechaPago: string;
  monto: number;
  metodoPago: string;
  complementoUUID: string;
}

const initialPayments: Payment[] = [
  { id: 'PAG-001', proveedor: 'Taller Mecánico García', folioFactura: 'A-4521', fechaPago: '2025-01-05', monto: 45000, metodoPago: 'Transferencia', complementoUUID: 'comp-001-abcd' },
  { id: 'PAG-002', proveedor: 'Llantas Premium del Norte', folioFactura: 'B-1298', fechaPago: '2024-12-28', monto: 62000, metodoPago: 'Transferencia', complementoUUID: 'comp-002-efgh' },
  { id: 'PAG-003', proveedor: 'Combustibles Nacionales MX', folioFactura: 'FC-8821', fechaPago: '2024-12-20', monto: 110000, metodoPago: 'Transferencia', complementoUUID: 'comp-003-ijkl' },
];

// Interface for prefilled data from Compras module
interface PrefillData {
  proveedor: string;
  proveedorId: string;
  concepto: string;
  montoTotal: number;
  ordenCompraId: string;
  ordenCompraFolio: string;
}

export default function ProveedoresCxP() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchCatalog, setSearchCatalog] = useState("");
  const [searchCxP, setSearchCxP] = useState("");
  
  // State for invoices
  const [invoices, setInvoices] = useState<PayableInvoice[]>(initialPayableInvoices);
  const [payments, setPayments] = useState<Payment[]>(initialPayments);
  
  // Modal states
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  
  // Selected invoice for actions
  const [selectedInvoice, setSelectedInvoice] = useState<PayableInvoice | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<PayableInvoice | null>(null);
  
  // Prefill data from Compras module
  const [prefillData, setPrefillData] = useState<PrefillData | null>(null);

  // Handle URL params from Compras module conversion
  useEffect(() => {
    const fromCompras = searchParams.get('fromCompras');
    if (fromCompras === 'true') {
      const prefill: PrefillData = {
        proveedor: searchParams.get('proveedor') || '',
        proveedorId: searchParams.get('proveedorId') || '',
        concepto: searchParams.get('concepto') || '',
        montoTotal: parseFloat(searchParams.get('monto') || '0'),
        ordenCompraId: searchParams.get('ordenId') || '',
        ordenCompraFolio: searchParams.get('ordenFolio') || '',
      };
      
      setPrefillData(prefill);
      setIsExpenseModalOpen(true);
      
      // Clear URL params
      setSearchParams({});
      
      toast.info('Datos pre-llenados desde Orden de Compra', {
        description: `${prefill.ordenCompraFolio} - ${prefill.proveedor}`,
      });
    }
  }, [searchParams, setSearchParams]);

  // Calculate KPIs
  const totalVencido = invoices
    .filter(inv => getInvoiceStatusInfo(inv).status === 'danger')
    .reduce((sum, inv) => sum + inv.saldoPendiente, 0);
  
  const totalPorPagar = invoices
    .filter(inv => getInvoiceStatusInfo(inv).status === 'warning')
    .reduce((sum, inv) => sum + inv.saldoPendiente, 0);

  const totalParcial = invoices
    .filter(inv => getInvoiceStatusInfo(inv).status === 'info')
    .reduce((sum, inv) => sum + inv.saldoPendiente, 0);

  const fromComprasCount = invoices.filter(inv => inv.ordenCompraId).length;

  const filteredSuppliers = mockSuppliers.filter(s => 
    s.razonSocial.toLowerCase().includes(searchCatalog.toLowerCase()) ||
    s.rfc.toLowerCase().includes(searchCatalog.toLowerCase())
  );

  const filteredInvoices = invoices.filter(inv =>
    inv.proveedor.toLowerCase().includes(searchCxP.toLowerCase()) ||
    inv.uuid.toLowerCase().includes(searchCxP.toLowerCase()) ||
    inv.concepto.toLowerCase().includes(searchCxP.toLowerCase())
  );

  // Handle new invoice creation
  const handleCreateInvoice = (invoiceData: Omit<PayableInvoice, 'id' | 'pagos' | 'estatus'>) => {
    const newInvoice: PayableInvoice = {
      ...invoiceData,
      id: `CXP-${String(invoices.length + 1).padStart(3, '0')}`,
      pagos: [],
      estatus: 'pendiente',
    };
    
    setInvoices([newInvoice, ...invoices]);
    setPrefillData(null); // Clear prefill data after creating
    toast.success('Factura registrada correctamente', {
      description: `${invoiceData.proveedor} - $${invoiceData.montoTotal.toLocaleString('es-MX')}`,
    });
  };

  // Handle invoice update
  const handleUpdateInvoice = (invoiceData: Omit<PayableInvoice, 'id' | 'pagos' | 'estatus'>) => {
    if (!editingInvoice) return;
    
    setInvoices(invoices.map(inv => {
      if (inv.id === editingInvoice.id) {
        return {
          ...inv,
          ...invoiceData,
          // Keep existing payments
          pagos: inv.pagos,
        };
      }
      return inv;
    }));
    
    setEditingInvoice(null);
    toast.success('Factura actualizada correctamente');
  };

  // Handle payment registration
  const handleRegisterPayment = (invoiceId: string, payment: Omit<InvoicePayment, 'id'>) => {
    const account = bankAccounts.find(a => a.id === payment.cuentaRetiro);
    
    setInvoices(invoices.map(inv => {
      if (inv.id === invoiceId) {
        const newPayment: InvoicePayment = {
          ...payment,
          id: `PAY-${Date.now()}`,
          cuentaRetiro: account?.name || payment.cuentaRetiro,
        };
        
        const newSaldo = inv.saldoPendiente - payment.monto;
        const newEstatus = newSaldo === 0 ? 'pagado' : 'pago_parcial';
        
        return {
          ...inv,
          saldoPendiente: newSaldo,
          estatus: newEstatus,
          pagos: [...inv.pagos, newPayment],
        };
      }
      return inv;
    }));

    // Add to payments history
    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (invoice) {
      const newPaymentRecord: Payment = {
        id: `PAG-${String(payments.length + 1).padStart(3, '0')}`,
        proveedor: invoice.proveedor,
        folioFactura: invoice.id,
        fechaPago: payment.fecha,
        monto: payment.monto,
        metodoPago: 'Transferencia',
        complementoUUID: `comp-${Date.now()}`,
      };
      setPayments([newPaymentRecord, ...payments]);
    }

    toast.success('Pago registrado correctamente', {
      description: `$${payment.monto.toLocaleString('es-MX')} aplicado a ${invoiceId}`,
    });
  };

  // Open detail sheet
  const handleViewInvoice = (invoice: PayableInvoice) => {
    setSelectedInvoice(invoice);
    setIsDetailSheetOpen(true);
  };

  // Open edit modal
  const handleEditInvoice = (invoice: PayableInvoice) => {
    setEditingInvoice(invoice);
    setIsExpenseModalOpen(true);
  };

  // Open payment modal
  const handlePayInvoice = (invoice: PayableInvoice) => {
    setSelectedInvoice(invoice);
    setIsPaymentModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="PROVEEDORES & CUENTAS POR PAGAR" 
        description="Gestión de proveedores, facturas y pagos"
      />

      <Tabs defaultValue="cuentas" className="space-y-4">
        <TabsList className="bg-slate-100">
          <TabsTrigger value="catalogo" className="data-[state=active]:bg-white">
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
            <ActionButton>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Proveedor
            </ActionButton>
          </div>

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
                  <DataTableCell className="font-mono text-xs">{supplier.id}</DataTableCell>
                  <DataTableCell className="font-medium">{supplier.razonSocial}</DataTableCell>
                  <DataTableCell className="font-mono text-xs">{supplier.rfc}</DataTableCell>
                  <DataTableCell>{supplier.contacto}</DataTableCell>
                  <DataTableCell>{supplier.telefono}</DataTableCell>
                  <DataTableCell>{supplier.giro}</DataTableCell>
                  <DataTableCell>
                    <StatusBadge status={supplier.estatus === 'activo' ? 'success' : 'warning'}>
                      {supplier.estatus === 'activo' ? 'Activo' : 'Inactivo'}
                    </StatusBadge>
                  </DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
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
                  ${totalVencido.toLocaleString('es-MX')}
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
                  ${totalPorPagar.toLocaleString('es-MX')}
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
                  ${totalParcial.toLocaleString('es-MX')}
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
                  {fromComprasCount}
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
            <ActionButton onClick={() => {
              setEditingInvoice(null);
              setPrefillData(null);
              setIsExpenseModalOpen(true);
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Registrar Gasto
            </ActionButton>
          </div>

          {/* Invoices Table */}
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
                <DataTableHead className="text-center">Acciones</DataTableHead>
              </DataTableRow>
            </DataTableHeader>
            <DataTableBody>
              {filteredInvoices.map((invoice) => {
                const statusInfo = getInvoiceStatusInfo(invoice);
                const isOverdue = statusInfo.status === 'danger' && invoice.saldoPendiente > 0;
                
                return (
                  <DataTableRow 
                    key={invoice.id}
                    className={isOverdue ? 'bg-red-50/50' : ''}
                  >
                    <DataTableCell className="font-mono text-xs font-medium">
                      <div className="flex flex-col">
                        {invoice.id}
                        {invoice.ordenCompraFolio && (
                          <span className="text-[10px] text-muted-foreground">
                            ← {invoice.ordenCompraFolio}
                          </span>
                        )}
                      </div>
                    </DataTableCell>
                    <DataTableCell className="font-medium max-w-[150px] truncate">
                      {invoice.proveedor}
                    </DataTableCell>
                    <DataTableCell>
                      {invoice.clasificacion ? (
                        <Badge className={`text-[10px] ${getClasificacionColor(invoice.clasificacion)}`}>
                          {getClasificacionLabel(invoice.clasificacion)}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </DataTableCell>
                    <DataTableCell className="max-w-[180px] truncate text-muted-foreground text-xs">
                      {invoice.concepto}
                    </DataTableCell>
                    <DataTableCell className="font-mono text-xs">
                      {invoice.uuid.substring(0, 8)}...
                    </DataTableCell>
                    <DataTableCell className={isOverdue ? 'text-red-700 font-medium' : ''}>
                      {invoice.fechaVencimiento}
                    </DataTableCell>
                    <DataTableCell className="text-right font-medium">
                      ${invoice.montoTotal.toLocaleString('es-MX')}
                      <span className="text-xs text-muted-foreground ml-1">{invoice.moneda}</span>
                    </DataTableCell>
                    <DataTableCell className={`text-right font-bold ${
                      invoice.saldoPendiente === 0 
                        ? 'text-emerald-700' 
                        : isOverdue 
                          ? 'text-red-700' 
                          : 'text-amber-700'
                    }`}>
                      ${invoice.saldoPendiente.toLocaleString('es-MX')}
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
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-card">
                            <DropdownMenuItem onClick={() => handleViewInvoice(invoice)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Ver Detalle
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditInvoice(invoice)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handlePayInvoice(invoice)}
                              disabled={invoice.saldoPendiente === 0}
                              className={invoice.saldoPendiente > 0 ? 'text-brand-green font-medium' : ''}
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

          <DataTable>
            <DataTableHeader>
              <DataTableRow>
                <DataTableHead>ID Pago</DataTableHead>
                <DataTableHead>Proveedor</DataTableHead>
                <DataTableHead>Folio Factura</DataTableHead>
                <DataTableHead>Fecha Pago</DataTableHead>
                <DataTableHead className="text-right">Monto</DataTableHead>
                <DataTableHead>Método de Pago</DataTableHead>
                <DataTableHead>Acciones</DataTableHead>
              </DataTableRow>
            </DataTableHeader>
            <DataTableBody>
              {payments.map((payment) => (
                <DataTableRow key={payment.id}>
                  <DataTableCell className="font-mono text-xs">{payment.id}</DataTableCell>
                  <DataTableCell className="font-medium">{payment.proveedor}</DataTableCell>
                  <DataTableCell>{payment.folioFactura}</DataTableCell>
                  <DataTableCell>{payment.fechaPago}</DataTableCell>
                  <DataTableCell className="text-right font-medium text-emerald-700">
                    ${payment.monto.toLocaleString('es-MX')}
                  </DataTableCell>
                  <DataTableCell>
                    <StatusBadge status="success">
                      {payment.metodoPago}
                    </StatusBadge>
                  </DataTableCell>
                  <DataTableCell>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Download className="h-3 w-3" />
                      Complemento PDF
                    </Button>
                  </DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
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
        suppliers={mockSuppliers}
        editInvoice={editingInvoice}
        prefillData={prefillData}
      />

      <InvoiceDetailSheet
        open={isDetailSheetOpen}
        onOpenChange={setIsDetailSheetOpen}
        invoice={selectedInvoice}
      />

      <RegisterPaymentModal
        open={isPaymentModalOpen}
        onOpenChange={setIsPaymentModalOpen}
        invoice={selectedInvoice}
        onSubmit={handleRegisterPayment}
      />
    </div>
  );
}
