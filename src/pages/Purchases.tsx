import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ActionButton } from "@/components/ui/action-button";
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
import {
  EnhancedDataTable,
  ColumnDef,
} from "@/components/ui/enhanced-data-table";
import { PageHeader } from "@/components/ui/page-header";
import {
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  CheckCircle,
  Send,
  Printer,
  ArrowRight,
  Package,
} from "lucide-react";
import { toast } from "sonner";

// 🚀 IMPORTS CORREGIDOS A LA ARQUITECTURA FSD
import {
  getOrderTypeColor,
  getStatusInfo,
  getOrderTypeLabel,
  PurchaseOrder, // <-- ¡Solución al Error 2304!
} from "@/features/purchases/types";
import { mockPurchaseOrders } from "@/features/purchases/data";
import { PurchaseOrderWizard } from "@/features/purchases/components/PurchaseOrderWizard";
import {
  ReceiveOrderModal,
  ConvertToCxPModal,
} from "@/features/purchases/components/ReceiveOrderModal";

export default function Purchases() {
  const navigate = useNavigate();

  const [orders, setOrders] = useState<PurchaseOrder[]>(mockPurchaseOrders);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null);
  const [receiveModalOpen, setReceiveModalOpen] = useState(false);
  const [convertModalOpen, setConvertModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(
    null,
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // 🚀 KPIs CORREGIDOS (Usando las propiedades en inglés de PurchaseOrder)
  const kpis = useMemo(
    () => ({
      borradores: orders.filter((o) => o.status === "borrador").length,
      pendientes: orders.filter((o) => o.status === "pendiente_aprobacion")
        .length,
      aprobadas: orders.filter((o) => o.status === "aprobada").length,
      sinConvertir: orders.filter(
        (o) => o.status === "recibida" && !o.converted_to_cxp,
      ).length,
    }),
    [orders],
  );

  const formatCurrency = (amount: number, moneda: string) =>
    new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: moneda,
    }).format(amount);

  // ==========================================
  // HANDLERS
  // ==========================================

  const handleSaveOrder = (order: PurchaseOrder) => {
    if (editingOrder) {
      setOrders(orders.map((o) => (o.id === order.id ? order : o)));
      toast.success("Orden actualizada");
    } else {
      setOrders([order, ...orders]);
      toast.success("Orden creada");
    }
    setEditingOrder(null);
  };

  const handleApprove = (order: PurchaseOrder) => {
    setOrders(
      orders.map((o) =>
        o.id === order.id
          ? {
              ...o,
              status: "aprobada",
            }
          : o,
      ),
    );
    toast.success(`Orden ${order.folio} aprobada`);
  };

  // 🚀 SOLUCIÓN DE TIPOS (string | number)
  const handleReceive = (
    orderId: string | number,
    completo: boolean,
    notas: string,
  ) => {
    setOrders(
      orders.map((o) =>
        o.id === String(orderId)
          ? {
              ...o,
              status: "recibida",
              service_description: notas,
            }
          : o,
      ),
    );
    toast.success("Orden marcada como recibida");
  };

  const handleConvert = (orderId: string | number) => {
    setOrders(
      orders.map((o) =>
        o.id === String(orderId) ? { ...o, converted_to_cxp: true } : o,
      ),
    );
    toast.success("Redirigiendo a Cuentas por Pagar...");
    navigate("/payables"); // 🚀 Redirige a la nueva ruta en inglés
  };

  const handleDelete = () => {
    if (selectedOrder) {
      setOrders(orders.filter((o) => o.id !== selectedOrder.id));
      toast.success("Orden eliminada");
    }
    setDeleteDialogOpen(false);
  };

  const handlePrint = (order: PurchaseOrder) => {
    toast.info(`Generando PDF para la orden ${order.folio}...`);
    // Aquí puedes invocar tu función printOrderPDF(order) si la tienes
  };

  // ==========================================
  // COLUMNAS (Alineadas a types.ts)
  // ==========================================

  const columns: ColumnDef<PurchaseOrder>[] = useMemo(
    () => [
      {
        key: "folio",
        header: "Folio",
        render: (v) => (
          <span className="font-mono font-medium">{v as string}</span>
        ),
      },
      {
        key: "tipo",
        header: "Tipo",
        type: "status",
        statusOptions: ["compra", "servicio", "gasto_indirecto"],
        render: (v) => (
          <Badge className={getOrderTypeColor(v as string)}>
            {getOrderTypeLabel(v as string)}
          </Badge>
        ),
      },
      { key: "supplier_name", header: "Proveedor" }, // 🚀 Corregido de proveedorNombre
      { key: "requester", header: "Solicitante" }, // 🚀 Corregido de solicitante
      {
        key: "total",
        header: "Monto",
        type: "number",
        render: (v, r) => (
          <span className="font-mono">
            {formatCurrency(v as number, r.moneda)}
          </span>
        ),
      },
      {
        key: "status", // 🚀 Corregido de estatus
        header: "Estatus",
        type: "status",
        statusOptions: [
          "borrador",
          "pendiente_aprobacion",
          "aprobada",
          "recibida",
          "cancelada",
        ],
        render: (v) => {
          const s = getStatusInfo(v as string);
          return <Badge className={s.className}>{s.label}</Badge>;
        },
      },
      {
        key: "id",
        header: "Acciones",
        sortable: false,
        render: (_, row) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  setEditingOrder(row);
                  setWizardOpen(true);
                }}
              >
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handlePrint(row)}>
                <Printer className="h-4 w-4 mr-2" />
                Imprimir PDF
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {row.status === "borrador" && (
                <DropdownMenuItem
                  onClick={() => {
                    setOrders(
                      orders.map((o) =>
                        o.id === row.id
                          ? { ...o, status: "pendiente_aprobacion" }
                          : o,
                      ),
                    );
                    toast.success("Enviada a aprobación");
                  }}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Enviar a Aprobación
                </DropdownMenuItem>
              )}
              {row.status === "pendiente_aprobacion" && (
                <DropdownMenuItem onClick={() => handleApprove(row)}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Aprobar
                </DropdownMenuItem>
              )}
              {row.status === "aprobada" && (
                <DropdownMenuItem
                  onClick={() => {
                    setSelectedOrder(row);
                    setReceiveModalOpen(true);
                  }}
                >
                  <Package className="h-4 w-4 mr-2" />
                  Recibir
                </DropdownMenuItem>
              )}
              {row.status === "recibida" && !row.converted_to_cxp && (
                <DropdownMenuItem
                  onClick={() => {
                    setSelectedOrder(row);
                    setConvertModalOpen(true);
                  }}
                >
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Convertir a CxP
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  setSelectedOrder(row);
                  setDeleteDialogOpen(true);
                }}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [orders],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="COMPRAS Y APROVISIONAMIENTO"
        description="Gestión de órdenes de compra, servicio y gastos indirectos"
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-l-4 border-l-slate-400">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Borradores</p>
            <p className="text-3xl font-bold">{kpis.borradores}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              Pendientes Aprobación
            </p>
            <p className="text-3xl font-bold text-amber-600">
              {kpis.pendientes}
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Aprobadas</p>
            <p className="text-3xl font-bold text-emerald-600">
              {kpis.aprobadas}
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Recibidas sin CxP</p>
            <p className="text-3xl font-bold text-blue-600">
              {kpis.sinConvertir}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Órdenes</CardTitle>
          <ActionButton onClick={() => setWizardOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Orden
          </ActionButton>
        </CardHeader>
        <CardContent>
          <EnhancedDataTable
            data={orders}
            columns={columns}
            exportFileName="ordenes_compra"
          />
        </CardContent>
      </Card>

      <PurchaseOrderWizard
        open={wizardOpen}
        onOpenChange={(o) => {
          setWizardOpen(o);
          if (!o) setEditingOrder(null);
        }}
        onSave={handleSaveOrder}
        editingOrder={editingOrder}
      />

      <ReceiveOrderModal
        order={selectedOrder}
        open={receiveModalOpen}
        onOpenChange={setReceiveModalOpen}
        onReceive={handleReceive}
      />

      <ConvertToCxPModal
        order={selectedOrder}
        open={convertModalOpen}
        onOpenChange={setConvertModalOpen}
        onConvert={handleConvert}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar orden?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
