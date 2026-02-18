import { Mechanic } from "@/types/api.types";
import { User, CreditCard, AlertCircle, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Props {
  mechanic: Mechanic;
}

export function MechanicDetail({ mechanic }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-slate-50/50">
      {/* Tarjeta de Contacto */}
      <div className="space-y-4">
        <h3 className="font-semibold text-sm flex items-center gap-2 text-slate-700">
          <User className="h-4 w-4" /> Datos Personales
        </h3>
        <div className="bg-white p-4 rounded-lg border shadow-sm space-y-3 text-sm">
          <div className="grid grid-cols-3 gap-2">
            <span className="text-muted-foreground">Email:</span>
            <span className="col-span-2 font-medium">
              {mechanic.email || "--"}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <span className="text-muted-foreground">Teléfono:</span>
            <span className="col-span-2 font-medium">
              {mechanic.telefono || "--"}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <span className="text-muted-foreground">Dirección:</span>
            <span className="col-span-2">
              {mechanic.direccion || "No registrada"}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <span className="text-muted-foreground">Nacimiento:</span>
            <span className="col-span-2">
              {mechanic.fecha_nacimiento
                ? new Date(mechanic.fecha_nacimiento).toLocaleDateString()
                : "--"}
            </span>
          </div>
        </div>
      </div>

      {/* Tarjeta Laboral y Fiscal */}
      <div className="space-y-4">
        <h3 className="font-semibold text-sm flex items-center gap-2 text-slate-700">
          <CreditCard className="h-4 w-4" /> Datos Laborales & Fiscales
        </h3>
        <div className="bg-white p-4 rounded-lg border shadow-sm space-y-3 text-sm">
          <div className="grid grid-cols-3 gap-2">
            <span className="text-muted-foreground">RFC:</span>
            <span className="col-span-2 font-mono">{mechanic.rfc || "--"}</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <span className="text-muted-foreground">NSS:</span>
            <span className="col-span-2 font-mono">{mechanic.nss || "--"}</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <span className="text-muted-foreground">Especialidad:</span>
            <span className="col-span-2">
              <Badge variant="outline">
                {mechanic.especialidad || "General"}
              </Badge>
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <span className="text-muted-foreground">Salario Base:</span>
            <span className="col-span-2 font-mono text-emerald-600 font-medium">
              {mechanic.salario_base
                ? `$${mechanic.salario_base.toLocaleString()}`
                : "--"}
            </span>
          </div>
        </div>
      </div>

      {/* Tarjeta Emergencia */}
      <div className="col-span-1 md:col-span-2 space-y-4">
        <h3 className="font-semibold text-sm flex items-center gap-2 text-slate-700">
          <AlertCircle className="h-4 w-4" /> Contacto de Emergencia
        </h3>
        <div className="bg-red-50 p-4 rounded-lg border border-red-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-red-900">
              {mechanic.contacto_emergencia_nombre || "No configurado"}
            </p>
            <p className="text-xs text-red-700">Nombre de contacto</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-red-900 flex items-center gap-1 justify-end">
              <Phone className="h-3 w-3" />
              {mechanic.contacto_emergencia_telefono || "--"}
            </p>
            <p className="text-xs text-red-700">Teléfono</p>
          </div>
        </div>
      </div>
    </div>
  );
}
