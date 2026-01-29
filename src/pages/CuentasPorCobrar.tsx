import { useState, useMemo } from "react";
import { 
  Download, 
  AlertCircle, 
  Eye, 
  MoreHorizontal, 
  Plus, 
  FileInput,
  CreditCard,
  Trash2,
  Clock,
  Ban,
  CheckCircle2,
  DollarSign
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ActionButton } from "@/components/ui/action-button";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { EnhancedDataTable, ColumnDef } from "@/components/ui/enhanced-data-table";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Feature components
import { ImportServicesModal } from "@/features/cxc/ImportServicesModal";
import { CreateInvoiceModal } from "@/features/cxc/CreateInvoiceModal";
import { InvoiceDetailSheet } from "@/features/cxc/InvoiceDetailSheet";
import { RegisterPaymentModal } from "@/features/cxc/RegisterPaymentModal";
import { AccountStatementModal } from "@/features/cxc/AccountStatementModal";
import { 
  ReceivableInvoice, 
  InvoicePayment,
  FinalizableService,
  getInvoiceStatusInfo,
  getAgingCategory,
  calculateDaysOverdue
} from "@/features/cxc/types";
import { 
  initialReceivableInvoices, 
  finalizableServices as initialServices
} from "@/features/cxc/data";

export default function CuentasPorCobrar() {
  // State for invoices and services
  const [invoices, setInvoices] = useState<ReceivableInvoice[]>(initialReceivableInvoices);
  const [services, setServices] = useState<FinalizableService[]>(initialServices);
  
  // Modal states
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAccountStatementOpen, setIsAccountStatementOpen] = useState(false);
  
  // Selected invoice for actions
  const [selectedInvoice, setSelectedInvoice] = useState<ReceivableInvoice | null>(null);
  const [importedServices, setImportedServices] = useState<FinalizableService[] | undefined>();
  const [invoiceToDelete, setInvoiceToDelete] = useState<ReceivableInvoice | null>(null);

  // Calculate Aging Report KPIs
  const agingReport = useMemo(() => {
    const corriente = invoices
      .filter(inv => getAgingCategory(inv) === 'corriente' && inv.saldoPendiente > 0)
      .reduce((sum, inv) => sum + inv.saldoPendiente, 0);
    
    const vencido1_30 = invoices
      .filter(inv => getAgingCategory(inv) === 'vencido_1_30')
      .reduce((sum, inv) => sum + inv.saldoPendiente, 0);
    
    const vencido31_60 = invoices
      .filter(inv => getAgingCategory(inv) === 'vencido_31_60')
      .reduce((sum, inv) => sum + inv.saldoPendiente, 0);
    
    const incobrable = invoices
      .filter(inv => getAgingCategory(inv) === 'incobrable')
      .reduce((sum, inv) => sum + inv.saldoPendiente, 0);
    
    return { corriente, vencido1_30, vencido31_60, incobrable };
  }, [invoices]);

  // Handle importing services
  const handleImportServices = (selectedServices: FinalizableService[]) => {
    setImportedServices(selectedServices);
    setIsImportModalOpen(false);
    setIsCreateModalOpen(true);
  };

  // Handle creating invoice
  const handleCreateInvoice = (invoiceData: Omit<ReceivableInvoice, 'id' | 'folio' | 'cobros' | 'estatus'>) => {
    const newId = `FAC-${String(invoices.length + 1).padStart(3, '0')}`;
    const newFolio = `A-2025-${String(invoices.length + 1).padStart(3, '0')}`;
    
    const newInvoice: ReceivableInvoice = {
      ...invoiceData,
      id: newId,
      folio: newFolio,
      cobros: [],
      estatus: 'corriente',
    };
    
    setInvoices([newInvoice, ...invoices]);
    
    // Mark imported services as invoiced
    if (importedServices) {
      setServices(services.map(s => 
        importedServices.find(imp => imp.id === s.id) 
          ? { ...s, facturado: true } 
          : s
      ));
      setImportedServices(undefined);
    }
    
    toast.success('Factura creada correctamente', {
      description: `${newFolio} - ${invoiceData.cliente} - $${invoiceData.montoTotal.toLocaleString('es-MX')}`,
    });
  };

  // Handle registering payment
  const handleRegisterPayment = (invoiceId: string, payment: Omit<InvoicePayment, 'id'>) => {
    setInvoices(invoices.map(inv => {
      if (inv.id === invoiceId) {
        const newPayment: InvoicePayment = {
          ...payment,
          id: `COB-${Date.now()}`,
        };
        
        const newSaldo = inv.saldoPendiente - payment.monto;
        const newEstatus = newSaldo === 0 ? 'pagada' : 'pago_parcial';
        
        return {
          ...inv,
          saldoPendiente: newSaldo,
          estatus: newEstatus,
          cobros: [...inv.cobros, newPayment],
          requiereREP: payment.requiereREP || inv.requiereREP,
        };
      }
      return inv;
    }));

    toast.success('Cobro registrado correctamente', {
      description: `$${payment.monto.toLocaleString('es-MX')} aplicado a ${invoiceId}`,
    });
  };

  // Handle delete invoice
  const handleDeleteInvoice = () => {
    if (!invoiceToDelete) return;
    
    // Check if invoice has payments
    if (invoiceToDelete.saldoPendiente < invoiceToDelete.montoTotal) {
      toast.error('No se puede eliminar', {
        description: 'Esta factura tiene abonos registrados. No es posible eliminarla.',
      });
      setIsDeleteDialogOpen(false);
      setInvoiceToDelete(null);
      return;
    }
    
    setInvoices(invoices.filter(inv => inv.id !== invoiceToDelete.id));
    toast.success('Factura eliminada correctamente', {
      description: `${invoiceToDelete.folio} ha sido eliminada.`,
    });
    setIsDeleteDialogOpen(false);
    setInvoiceToDelete(null);
  };

  // Open detail sheet
  const handleViewInvoice = (invoice: ReceivableInvoice) => {
    setSelectedInvoice(invoice);
    setIsDetailSheetOpen(true);
  };

  // Open payment modal
  const handlePayInvoice = (invoice: ReceivableInvoice) => {
    setSelectedInvoice(invoice);
    setIsPaymentModalOpen(true);
  };

  // Open delete dialog
  const handleDeleteClick = (invoice: ReceivableInvoice) => {
    setInvoiceToDelete(invoice);
    setIsDeleteDialogOpen(true);
  };

  const handleOpenAccountStatement = () => {
    setIsAccountStatementOpen(true);
  };

  // Define columns for EnhancedDataTable
  const columns: ColumnDef<ReceivableInvoice>[] = useMemo(() => [
    {
      key: 'folio',
      header: 'Folio',
      render: (value, row) => {
        const statusInfo = getInvoiceStatusInfo(row);
        return (
          <div className="flex flex-col">
            <span className={`font-mono text-sm font-medium ${statusInfo.status === 'danger' ? 'text-red-700' : 'text-slate-700'}`}>
              {value}
            </span>
            {row.requiereREP && (
              <span className="text-[9px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded font-medium w-fit mt-0.5">
                PEND. REP
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'cliente',
      header: 'Cliente',
      render: (value) => (
        <span className="text-sm font-medium text-slate-700 max-w-[150px] truncate block">
          {value}
        </span>
      ),
    },
    {
      key: 'montoTotal',
      header: 'Monto',
      type: 'number',
      render: (value, row) => (
        <span className="text-sm font-bold text-slate-700">
          ${value.toLocaleString('es-MX')}
          <span className="text-xs text-muted-foreground ml-1">{row.moneda}</span>
        </span>
      ),
    },
    {
      key: 'saldoPendiente',
      header: 'Saldo',
      type: 'number',
      render: (value, row) => {
        const statusInfo = getInvoiceStatusInfo(row);
        return (
          <span className={`text-sm font-bold ${
            value === 0 
              ? 'text-emerald-700' 
              : statusInfo.status === 'danger' 
                ? 'text-red-700' 
                : 'text-amber-700'
          }`}>
            ${value.toLocaleString('es-MX')}
          </span>
        );
      },
    },
    {
      key: 'fechaEmision',
      header: 'Emisión',
      type: 'date',
      render: (value) => (
        <span className="text-sm text-muted-foreground">
          {new Date(value).toLocaleDateString('es-MX')}
        </span>
      ),
    },
    {
      key: 'fechaVencimiento',
      header: 'Vencimiento',
      type: 'date',
      render: (value, row) => {
        const daysOverdue = calculateDaysOverdue(value);
        const isPastDue = daysOverdue > 0 && row.saldoPendiente > 0;
        return (
          <div className="flex flex-col">
            <span className={`text-sm ${isPastDue ? 'text-red-700 font-medium' : 'text-slate-700'}`}>
              {new Date(value).toLocaleDateString('es-MX')}
            </span>
            {isPastDue && (
              <span className="text-[10px] text-red-600 font-medium">+{daysOverdue}d vencido</span>
            )}
          </div>
        );
      },
    },
    {
      key: 'estatus',
      header: 'Estatus',
      type: 'status',
      statusOptions: ['corriente', 'vencida', 'pagada', 'pago_parcial'],
      render: (_, row) => {
        const statusInfo = getInvoiceStatusInfo(row);
        return <StatusBadge status={statusInfo.status}>{statusInfo.label}</StatusBadge>;
      },
    },
    {
      key: 'id',
      header: 'Acciones',
      sortable: false,
      render: (_, row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-card">
            <DropdownMenuItem onClick={() => handleViewInvoice(row)}>
              <Eye className="h-4 w-4 mr-2" />
              Ver Detalle
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => handlePayInvoice(row)}
              disabled={row.saldoPendiente === 0}
              className={row.saldoPendiente > 0 ? 'text-brand-green font-medium' : ''}
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Registrar Cobro
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => handleDeleteClick(row)}
              className="text-status-danger"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ], []);

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Cuentas por Cobrar" 
        description="Gestión de cartera y estado de cuenta"
      >
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <ActionButton size="md">
                <Plus className="h-4 w-4 mr-2" />
                Facturar Servicio
              </ActionButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-card w-48">
              <DropdownMenuItem onClick={() => {
                setImportedServices(undefined);
                setIsCreateModalOpen(true);
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Factura Manual
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsImportModalOpen(true)}>
                <FileInput className="h-4 w-4 mr-2" />
                Importar de Servicios
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" onClick={handleOpenAccountStatement}>
            <Download className="h-4 w-4 mr-2" />
            Generar Estado de Cuenta
          </Button>
        </div>
      </PageHeader>

      {/* Aging Report Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-l-4 border-l-status-success">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" />
                  Por Cobrar (Corriente)
                </p>
                <p className="text-2xl font-bold text-status-success mt-1">
                  ${agingReport.corriente.toLocaleString('es-MX')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-status-warning">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  Vencido 1-30 días
                </p>
                <p className="text-2xl font-bold text-status-warning mt-1">
                  ${agingReport.vencido1_30.toLocaleString('es-MX')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  Vencido 31-60 días
                </p>
                <p className="text-2xl font-bold text-orange-600 mt-1">
                  ${agingReport.vencido31_60.toLocaleString('es-MX')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-status-danger">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Ban className="h-4 w-4" />
                  Incobrable (+90 días)
                </p>
                <p className="text-2xl font-bold text-status-danger mt-1">
                  ${agingReport.incobrable.toLocaleString('es-MX')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardContent className="pt-6">
          <EnhancedDataTable
            data={invoices}
            columns={columns}
            exportFileName="cuentas_por_cobrar"
          />
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardContent className="pt-6">
          <h4 className="font-semibold text-slate-700 mb-3">Leyenda de Estados</h4>
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-2">
              <StatusBadge status="warning">POR COBRAR</StatusBadge>
              <span className="text-sm text-slate-600">Dentro de plazo</span>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status="info">PAGO PARCIAL</StatusBadge>
              <span className="text-sm text-slate-600">Tiene abonos</span>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status="danger">VENCIDA</StatusBadge>
              <span className="text-sm text-slate-600">Fecha límite excedida</span>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status="success">PAGADA</StatusBadge>
              <span className="text-sm text-slate-600">Cobrada en su totalidad</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      <ImportServicesModal
        open={isImportModalOpen}
        onOpenChange={setIsImportModalOpen}
        services={services}
        onImport={handleImportServices}
      />

      <CreateInvoiceModal
        open={isCreateModalOpen}
        onOpenChange={(open) => {
          setIsCreateModalOpen(open);
          if (!open) setImportedServices(undefined);
        }}
        onSubmit={handleCreateInvoice}
        importedServices={importedServices}
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

      {/* Account Statement Modal */}
      <AccountStatementModal
        open={isAccountStatementOpen}
        onClose={() => setIsAccountStatementOpen(false)}
        invoices={invoices}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar factura?</AlertDialogTitle>
            <AlertDialogDescription>
              {invoiceToDelete && invoiceToDelete.saldoPendiente < invoiceToDelete.montoTotal ? (
                <span className="text-status-danger font-medium">
                  ⚠️ Esta factura tiene abonos registrados y no puede ser eliminada.
                </span>
              ) : (
                <>
                  Esta acción no se puede deshacer. Se eliminará la factura{' '}
                  <strong>{invoiceToDelete?.folio}</strong> de forma permanente.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            {invoiceToDelete && invoiceToDelete.saldoPendiente === invoiceToDelete.montoTotal && (
              <AlertDialogAction
                onClick={handleDeleteInvoice}
                className="bg-status-danger hover:bg-status-danger/90 text-white"
              >
                Eliminar
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
