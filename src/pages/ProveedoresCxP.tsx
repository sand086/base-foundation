import { useState } from "react";
import { 
  Search, 
  Plus, 
  Upload, 
  Download, 
  Check, 
  FileText,
  Building2,
  AlertCircle
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { ActionButton } from "@/components/ui/action-button";
import { StatusBadge } from "@/components/ui/status-badge";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Mock Data for Suppliers
interface Supplier {
  id: string;
  razonSocial: string;
  rfc: string;
  contacto: string;
  telefono: string;
  giro: string;
  estatus: 'activo' | 'inactivo';
}

interface PayableInvoice {
  id: string;
  proveedor: string;
  uuid: string;
  fechaEmision: string;
  fechaVencimiento: string;
  montoTotal: number;
  saldoPendiente: number;
  estatus: 'pendiente' | 'vencido' | 'pagado';
}

interface Payment {
  id: string;
  proveedor: string;
  folioFactura: string;
  fechaPago: string;
  monto: number;
  metodoPago: string;
  complementoUUID: string;
}

const mockSuppliers: Supplier[] = [
  { id: 'PROV-001', razonSocial: 'Llantas Premium del Norte S.A.', rfc: 'LPN150320AA1', contacto: 'Ing. Carlos Mendoza', telefono: '81 4433 2211', giro: 'Llantas y Refacciones', estatus: 'activo' },
  { id: 'PROV-002', razonSocial: 'Combustibles Nacionales MX', rfc: 'CNM100815BB2', contacto: 'Lic. Ana Torres', telefono: '55 8877 6655', giro: 'Combustible', estatus: 'activo' },
  { id: 'PROV-003', razonSocial: 'Taller Mecánico Automotriz García', rfc: 'TMA090422CC3', contacto: 'Roberto García', telefono: '33 1122 3344', giro: 'Mantenimiento', estatus: 'activo' },
  { id: 'PROV-004', razonSocial: 'Seguros y Fianzas del Bajío', rfc: 'SFB080101DD4', contacto: 'Lic. Patricia Vega', telefono: '442 555 6677', giro: 'Seguros', estatus: 'inactivo' },
  { id: 'PROV-005', razonSocial: 'Casetas TAG Services', rfc: 'CTS120630EE5', contacto: 'Ing. Miguel Ángel Soto', telefono: '55 9988 7766', giro: 'Servicios Carreteros', estatus: 'activo' },
];

const mockPayableInvoices: PayableInvoice[] = [
  { id: 'CXP-001', proveedor: 'Llantas Premium del Norte', uuid: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', fechaEmision: '2024-12-20', fechaVencimiento: '2025-01-20', montoTotal: 85000, saldoPendiente: 85000, estatus: 'pendiente' },
  { id: 'CXP-002', proveedor: 'Combustibles Nacionales MX', uuid: 'b2c3d4e5-f6a7-8901-bcde-f23456789012', fechaEmision: '2024-12-01', fechaVencimiento: '2024-12-31', montoTotal: 125000, saldoPendiente: 125000, estatus: 'vencido' },
  { id: 'CXP-003', proveedor: 'Taller Mecánico García', uuid: 'c3d4e5f6-a7b8-9012-cdef-345678901234', fechaEmision: '2024-12-15', fechaVencimiento: '2025-01-15', montoTotal: 45000, saldoPendiente: 0, estatus: 'pagado' },
  { id: 'CXP-004', proveedor: 'Casetas TAG Services', uuid: 'd4e5f6a7-b8c9-0123-defa-456789012345', fechaEmision: '2024-11-15', fechaVencimiento: '2024-12-15', montoTotal: 67500, saldoPendiente: 67500, estatus: 'vencido' },
  { id: 'CXP-005', proveedor: 'Combustibles Nacionales MX', uuid: 'e5f6a7b8-c9d0-1234-efab-567890123456', fechaEmision: '2025-01-02', fechaVencimiento: '2025-02-01', montoTotal: 98000, saldoPendiente: 98000, estatus: 'pendiente' },
];

const mockPayments: Payment[] = [
  { id: 'PAG-001', proveedor: 'Taller Mecánico García', folioFactura: 'A-4521', fechaPago: '2025-01-05', monto: 45000, metodoPago: 'Transferencia', complementoUUID: 'comp-001-abcd' },
  { id: 'PAG-002', proveedor: 'Llantas Premium del Norte', folioFactura: 'B-1298', fechaPago: '2024-12-28', monto: 62000, metodoPago: 'Transferencia', complementoUUID: 'comp-002-efgh' },
  { id: 'PAG-003', proveedor: 'Combustibles Nacionales MX', folioFactura: 'FC-8821', fechaPago: '2024-12-20', monto: 110000, metodoPago: 'Transferencia', complementoUUID: 'comp-003-ijkl' },
  { id: 'PAG-004', proveedor: 'Seguros y Fianzas del Bajío', folioFactura: 'POL-2024-001', fechaPago: '2024-12-15', monto: 185000, metodoPago: 'Cheque', complementoUUID: 'comp-004-mnop' },
];

export default function ProveedoresCxP() {
  const [searchCatalog, setSearchCatalog] = useState("");
  const [searchCxP, setSearchCxP] = useState("");
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  // Calculate KPIs
  const totalVencido = mockPayableInvoices
    .filter(inv => inv.estatus === 'vencido')
    .reduce((sum, inv) => sum + inv.saldoPendiente, 0);
  
  const totalPorPagar = mockPayableInvoices
    .filter(inv => inv.estatus === 'pendiente')
    .reduce((sum, inv) => sum + inv.saldoPendiente, 0);

  const filteredSuppliers = mockSuppliers.filter(s => 
    s.razonSocial.toLowerCase().includes(searchCatalog.toLowerCase()) ||
    s.rfc.toLowerCase().includes(searchCatalog.toLowerCase())
  );

  const filteredInvoices = mockPayableInvoices.filter(inv =>
    inv.proveedor.toLowerCase().includes(searchCxP.toLowerCase()) ||
    inv.uuid.toLowerCase().includes(searchCxP.toLowerCase())
  );

  const getInvoiceStatus = (invoice: PayableInvoice): 'success' | 'warning' | 'danger' => {
    if (invoice.saldoPendiente === 0) return 'success';
    const today = new Date();
    const vencimiento = new Date(invoice.fechaVencimiento);
    if (vencimiento < today) return 'danger';
    return 'warning';
  };

  const getStatusLabel = (invoice: PayableInvoice): string => {
    if (invoice.saldoPendiente === 0) return 'PAGADO';
    const today = new Date();
    const vencimiento = new Date(invoice.fechaVencimiento);
    if (vencimiento < today) return 'VENCIDO';
    return 'PENDIENTE';
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <Card className="border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Proveedores Activos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-slate-700">
                  {mockSuppliers.filter(s => s.estatus === 'activo').length}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Search and Actions */}
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Buscar por proveedor o UUID..."
                value={searchCxP}
                onChange={(e) => setSearchCxP(e.target.value)}
                className="pl-10"
              />
            </div>
            <Dialog open={isInvoiceModalOpen} onOpenChange={setIsInvoiceModalOpen}>
              <DialogTrigger asChild>
                <ActionButton>
                  <Plus className="h-4 w-4 mr-2" />
                  Registrar Factura
                </ActionButton>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle className="text-slate-700">Registrar Nueva Factura</DialogTitle>
                  <DialogDescription>
                    Ingrese los datos de la factura del proveedor
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="proveedor">Proveedor</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar proveedor" />
                      </SelectTrigger>
                      <SelectContent>
                        {mockSuppliers.filter(s => s.estatus === 'activo').map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.razonSocial}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="xml">Archivo XML (CFDI)</Label>
                    <div className="flex items-center gap-2">
                      <Input id="xml" type="file" accept=".xml" className="flex-1" />
                      <Button variant="outline" size="icon">
                        <Upload className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="monto">Monto Total</Label>
                      <Input id="monto" type="number" placeholder="$0.00" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dias">Días de Crédito</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="15">15 días</SelectItem>
                          <SelectItem value="30">30 días</SelectItem>
                          <SelectItem value="45">45 días</SelectItem>
                          <SelectItem value="60">60 días</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsInvoiceModalOpen(false)}>
                    Cancelar
                  </Button>
                  <ActionButton onClick={() => setIsInvoiceModalOpen(false)}>
                    Guardar Factura
                  </ActionButton>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Invoices Table */}
          <DataTable>
            <DataTableHeader>
              <DataTableRow>
                <DataTableHead>Proveedor</DataTableHead>
                <DataTableHead>UUID</DataTableHead>
                <DataTableHead>Fecha Emisión</DataTableHead>
                <DataTableHead>Fecha Vencimiento</DataTableHead>
                <DataTableHead className="text-right">Monto Total</DataTableHead>
                <DataTableHead className="text-right">Saldo Pendiente</DataTableHead>
                <DataTableHead>Estatus</DataTableHead>
              </DataTableRow>
            </DataTableHeader>
            <DataTableBody>
              {filteredInvoices.map((invoice) => {
                const isVencido = getInvoiceStatus(invoice) === 'danger' && invoice.saldoPendiente > 0;
                return (
                  <DataTableRow 
                    key={invoice.id}
                    className={isVencido ? 'bg-red-50' : ''}
                  >
                    <DataTableCell className="font-medium">{invoice.proveedor}</DataTableCell>
                    <DataTableCell className="font-mono text-xs">
                      {invoice.uuid.substring(0, 8)}...
                    </DataTableCell>
                    <DataTableCell>{invoice.fechaEmision}</DataTableCell>
                    <DataTableCell className={isVencido ? 'text-red-700 font-medium' : ''}>
                      {invoice.fechaVencimiento}
                    </DataTableCell>
                    <DataTableCell className="text-right font-medium">
                      ${invoice.montoTotal.toLocaleString('es-MX')}
                    </DataTableCell>
                    <DataTableCell className={`text-right font-medium ${isVencido ? 'text-red-700' : ''}`}>
                      ${invoice.saldoPendiente.toLocaleString('es-MX')}
                    </DataTableCell>
                    <DataTableCell>
                      <StatusBadge status={getInvoiceStatus(invoice)}>
                        {getStatusLabel(invoice)}
                      </StatusBadge>
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
            <ActionButton>
              <Plus className="h-4 w-4 mr-2" />
              Registrar Pago
            </ActionButton>
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
              {mockPayments.map((payment) => (
                <DataTableRow key={payment.id}>
                  <DataTableCell className="font-mono text-xs">{payment.id}</DataTableCell>
                  <DataTableCell className="font-medium">{payment.proveedor}</DataTableCell>
                  <DataTableCell>{payment.folioFactura}</DataTableCell>
                  <DataTableCell>{payment.fechaPago}</DataTableCell>
                  <DataTableCell className="text-right font-medium">
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
    </div>
  );
}
