// src/features/cxp/SupplierDetailSheet.tsx
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Building2, Mail, Phone, MapPin, CreditCard, Hash } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { Supplier } from "@/types/api.types";

interface SupplierDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier: Supplier | null;
}

export function SupplierDetailSheet({
  open,
  onOpenChange,
  supplier,
}: SupplierDetailSheetProps) {
  if (!supplier) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[450px] overflow-y-auto">
        <SheetHeader className="pb-4 border-b">
          <SheetTitle className="flex items-center gap-2 text-brand-dark">
            <Building2 className="h-5 w-5" /> Detalle de Proveedor
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 py-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                Razón Social
              </p>
              <h2 className="text-lg font-bold text-slate-800">
                {supplier.razon_social}
              </h2>
            </div>
            <StatusBadge
              status={supplier.estatus === "activo" ? "success" : "warning"}
            >
              {supplier.estatus === "activo" ? "Activo" : supplier.estatus}
            </StatusBadge>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-slate-50 border rounded-lg">
              <p className=" text-muted-foreground uppercase font-bold flex items-center gap-1">
                <Hash className="h-3 w-3" /> RFC
              </p>
              <p className="font-mono text-sm mt-1">{supplier.rfc}</p>
            </div>
            <div className="p-3 bg-slate-50 border rounded-lg">
              <p className=" text-muted-foreground uppercase font-bold flex items-center gap-1">
                <CreditCard className="h-3 w-3" /> Días Crédito
              </p>
              <p className="font-mono text-sm mt-1">
                {supplier.dias_credito} días
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b pb-2 mb-3">
              Contacto
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <div className="h-8 w-8 rounded bg-blue-50 flex items-center justify-center text-blue-600">
                  <Building2 className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    Contacto Principal
                  </p>
                  <p className="font-medium">
                    {supplier.contacto_principal || "No registrado"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="h-8 w-8 rounded bg-green-50 flex items-center justify-center text-green-600">
                  <Phone className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Teléfono</p>
                  <p className="font-medium">
                    {supplier.telefono || "No registrado"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="h-8 w-8 rounded bg-amber-50 flex items-center justify-center text-amber-600">
                  <Mail className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    Correo Electrónico
                  </p>
                  <p className="font-medium">
                    {supplier.email || "No registrado"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="h-8 w-8 rounded bg-purple-50 flex items-center justify-center text-purple-600">
                  <MapPin className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Dirección</p>
                  <p className="font-medium">
                    {supplier.direccion || "No registrada"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b pb-2 mb-3">
              Datos Bancarios
            </h3>
            <div className="bg-slate-50 p-4 rounded-lg border space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Banco</p>
                <p className="font-medium">{supplier.banco || "—"}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Cuenta</p>
                  <p className="font-mono text-sm">
                    {supplier.cuenta_bancaria || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">CLABE</p>
                  <p className="font-mono text-sm">{supplier.clabe || "—"}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
