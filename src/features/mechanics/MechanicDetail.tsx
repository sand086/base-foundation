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
      <div className="col-span-2 md:col-span-2 space-y-3">
        {/* Encabezado */}
        <h3 className="font-semibold text-sm flex items-center gap-2 text-slate-800">
          <AlertCircle className="h-4.5 w-4.5 text-red-500" />
          Contacto de Emergencia
        </h3>

        {/* Tarjeta de Información */}
        <div className="bg-red-50/50 p-4 rounded-xl border border-red-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:bg-red-50 hover:shadow-sm">
          {/* Bloque: Nombre del Contacto */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg shrink-0 text-red-600">
              <User className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-red-800/70 mb-0.5">
                Nombre
              </p>
              <p
                className={`text-sm font-medium ${mechanic.contacto_emergencia_nombre ? "text-red-950" : "text-red-800/50 italic"}`}
              >
                {mechanic.contacto_emergencia_nombre || "No configurado"}
              </p>
            </div>
          </div>

          {/* Separador sutil solo visible en pantallas medianas o grandes */}
          <div className="hidden sm:block w-px h-8 bg-red-200/50 mx-2"></div>

          {/* Bloque: Teléfono de Contacto */}
          <div className="flex items-center gap-3 sm:justify-end">
            <div className="p-2 bg-red-100 rounded-lg shrink-0 text-red-600">
              <Phone className="h-4 w-4" />
            </div>
            <div className="sm:text-right">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-red-800/70 mb-0.5">
                Teléfono
              </p>
              <p
                className={`text-sm font-bold ${mechanic.contacto_emergencia_telefono ? "text-red-950" : "text-red-800/50 italic"}`}
              >
                {mechanic.contacto_emergencia_telefono || "Sin registrar"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
