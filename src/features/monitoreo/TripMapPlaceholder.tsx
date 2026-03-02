// src/features/monitoreo/TripMapPlaceholder.tsx
import { MapPin, Clock, Map } from "lucide-react";
import { cn } from "@/lib/utils";

interface TripMapPlaceholderProps {
  lastUpdate?: string;
  lastLocation?: string;
  className?: string;
}

export function TripMapPlaceholder({
  lastUpdate,
  lastLocation,
  className,
}: TripMapPlaceholderProps) {
  return (
    <div
      className={cn(
        "relative bg-slate-50/50 rounded-xl overflow-hidden border shadow-inner flex items-center justify-center",
        className,
      )}
    >
      {/* Fondo estilo Dot Matrix */}
      <div
        className="absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage: "radial-gradient(#64748b 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      />

      {/* Sombra sutil perimetral para profundidad */}
      <div className="absolute inset-0 shadow-[inset_0_0_20px_rgba(0,0,0,0.05)] pointer-events-none" />

      <div className="relative z-10 w-full px-6 flex flex-col items-center justify-center text-center">
        {/* Tarjeta central de Ubicación */}
        {lastLocation ? (
          <div className=" backdrop-blur-md  px-5 py-4 rounded-2xl max-w-sm w-full transition-all ">
            <div className="flex flex-col items-center gap-3">
              {/* Ícono animado (Ping) */}
              <div className="relative flex h-10 w-10 items-center justify-center">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-30"></span>
                <div className="relative inline-flex rounded-full h-10 w-10 bg-blue-100 items-center justify-center text-blue-600 border border-blue-200">
                  <MapPin className="h-5 w-5" />
                </div>
              </div>

              {/* Textos */}
              <div className="flex flex-col w-full">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                  Ubicación Actual Detectada
                </span>
                <span className="text-sm font-bold text-slate-800 leading-tight">
                  {lastLocation}
                </span>
              </div>

              {/* Divisor */}
              <div className="w-12 h-[1px] bg-slate-200 my-1"></div>

              {/* Timestamp */}
              {lastUpdate && (
                <div className="flex items-center gap-1.5 text-xs font-mono text-slate-500">
                  <Clock className="h-3.5 w-3.5" />
                  Actualizado: {lastUpdate}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 bg-white/80 backdrop-blur-sm border border-slate-200 px-6 py-5 rounded-2xl shadow-sm text-slate-500 max-w-xs w-full">
            <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center mb-1">
              <Map className="h-5 w-5 text-slate-400" />
            </div>
            <span className="text-sm font-medium">
              Esperando datos de telemetría...
            </span>
            <span className="text-xs text-muted-foreground">
              La ubicación aparecerá cuando se actualice el estatus.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
