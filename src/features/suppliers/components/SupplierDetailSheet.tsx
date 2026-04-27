// src/features/cxp/SupplierDetailSheet.tsx
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Hash,
  Briefcase,
  Tags,
  Receipt,
  Wallet,
  CalendarDays,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { Supplier } from "../types";

interface SupplierDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier: Supplier | null;
}

// Utilidad para formatear moneda
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(amount);
};

export function SupplierDetailSheet({
  open,
  onOpenChange,
  supplier,
}: SupplierDetailSheetProps) {
  if (!supplier) return null;

  // Cálculos derivados de las facturas (invoices)
  const totalInvoices = supplier.invoices?.length || 0;
  const totalPendingBalance =
    supplier.invoices?.reduce(
      (acc, invoice) => acc + (invoice.saldo_pendiente || 0),
      0,
    ) || 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[500px] overflow-y-auto bg-background/95 backdrop-blur-sm">
        <SheetHeader className="pb-6 border-b">
          <SheetTitle className="flex items-center gap-2 text-brand-dark">
            <Building2 className="h-5 w-5 text-slate-500 dark:text-white/70" />
            Detalle de Proveedor
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-8 py-6">
          {/* SECCIÓN 1: Encabezado y Etiquetas */}
          <div className="space-y-4">
            <div className="flex justify-between items-start gap-4">
              <div>
                <h2 className="text-xl font-bold text-foreground leading-tight">
                  {supplier.razon_social}
                </h2>
                <div className="flex bold items-center gap-2 mt-2 font-mono text-sm text-muted-foreground">
                  RFC: {supplier.rfc}
                </div>
              </div>
              <StatusBadge
                status={supplier.estatus === "activo" ? "success" : "warning"}
              >
                {supplier.estatus === "activo" ? "Activo" : supplier.estatus}
              </StatusBadge>
            </div>

            {/* Badges descriptivos */}
            <div className="flex flex-wrap gap-2">
              {supplier.tipo_proveedor && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  <Tags className="h-3.5 w-3.5" />
                  {supplier.tipo_proveedor.charAt(0).toUpperCase() +
                    supplier.tipo_proveedor.slice(1)}
                </span>
              )}
              {supplier.cost_center && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
                  <Briefcase className="h-3.5 w-3.5" />
                  {supplier.cost_center.nombre} ({supplier.cost_center.codigo})
                </span>
              )}
            </div>
          </div>

          {/* SECCIÓN 2: Resumen Financiero y Crédito */}
          <section>
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
              <Wallet className="h-4 w-4" /> Finanzas y Operación
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-card border border-border shadow-sm rounded-xl transition-all hover:shadow-md">
                <p className="text-xs text-muted-foreground mb-1">
                  Saldo Pendiente
                </p>
                <p className="text-lg font-bold text-red-600 dark:text-red-400">
                  {formatCurrency(totalPendingBalance)}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                  <Receipt className="h-3 w-3" /> {totalInvoices} facturas
                  registradas
                </p>
              </div>

              <div className="p-3 bg-card border border-border shadow-sm rounded-xl transition-all hover:shadow-md">
                <p className="text-xs text-muted-foreground mb-1">
                  Límite de Crédito
                </p>
                <p className="text-lg font-bold text-foreground">
                  {supplier.limite_credito > 0
                    ? formatCurrency(supplier.limite_credito)
                    : "Sin límite"}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                  <CalendarDays className="h-3 w-3" /> {supplier.dias_credito}{" "}
                  días de plazo
                </p>
              </div>
            </div>
          </section>

          {/* SECCIÓN 3: Contacto y Ubicación */}
          <section>
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest border-b pb-2 mb-4">
              Contacto y Ubicación
            </h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3 text-sm">
                <div className="h-8 w-8 rounded-full bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 mt-0.5">
                  <Building2 className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    Contacto Principal
                  </p>
                  <p className="font-medium text-foreground">
                    {supplier.contacto_principal || "No registrado"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-start gap-3 text-sm">
                  <div className="h-8 w-8 rounded-full bg-green-50 dark:bg-green-950/50 flex items-center justify-center text-green-600 dark:text-green-400 shrink-0 mt-0.5">
                    <Phone className="h-4 w-4" />
                  </div>
                  <div className="truncate">
                    <p className="text-xs text-muted-foreground">Teléfono</p>
                    <p className="font-medium text-foreground truncate">
                      {supplier.telefono || "—"}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <div className="h-8 w-8 rounded-full bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
                    <Mail className="h-4 w-4" />
                  </div>
                  <div className="truncate">
                    <p className="text-xs text-muted-foreground">Correo</p>
                    <p
                      className="font-medium text-foreground truncate"
                      title={supplier.email || ""}
                    >
                      {supplier.email || "—"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 text-sm">
                <div className="h-8 w-8 rounded-full bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0 mt-0.5">
                  <MapPin className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Dirección</p>
                  <p className="font-medium text-foreground leading-relaxed">
                    {supplier.direccion || "No registrada"}
                    {supplier.codigo_postal
                      ? ` C.P. ${supplier.codigo_postal}`
                      : ""}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* SECCIÓN 4: Datos Bancarios */}
          <section>
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest border-b pb-2 mb-4">
              Datos Bancarios
            </h3>
            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-border">
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="h-5 w-5 text-slate-400" />
                <p className="font-bold text-foreground">
                  {supplier.banco || "Banco no especificado"}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Cuenta</p>
                  <p className="font-mono text-sm bg-background px-2 py-1 rounded border inline-block">
                    {supplier.cuenta_bancaria || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">CLABE</p>
                  <p className="font-mono text-sm bg-background px-2 py-1 rounded border inline-block">
                    {supplier.clabe || "—"}
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
