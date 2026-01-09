import { MapPin, Navigation, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LocationPoint {
  label: string;
  type: 'origin' | 'destination' | 'checkpoint' | 'alert' | 'current';
  time?: string;
}

interface TripMapPlaceholderProps {
  origin: string;
  destination: string;
  checkpoints?: { event: string; time: string; type: string }[];
  lastUpdate?: string;
  lastLocation?: string;
  className?: string;
}

export function TripMapPlaceholder({
  origin,
  destination,
  checkpoints = [],
  lastUpdate,
  lastLocation,
  className,
}: TripMapPlaceholderProps) {
  // Generate location points from checkpoints
  const locationPoints: LocationPoint[] = [
    { label: origin, type: 'origin' },
    ...checkpoints
      .filter(cp => cp.type === 'checkpoint' || cp.type === 'alert')
      .slice(0, 3)
      .map(cp => ({
        label: cp.event.split(' - ')[1] || cp.event,
        type: cp.type as 'checkpoint' | 'alert',
        time: cp.time,
      })),
    { label: destination, type: 'destination' },
  ];

  return (
    <div className={cn("relative bg-slate-100 rounded-lg overflow-hidden border", className)}>
      {/* Map Background - Static placeholder with grid pattern */}
      <div className="absolute inset-0 opacity-30">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#94a3b8" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>
      
      {/* Map Content */}
      <div className="relative h-full p-4 flex flex-col">
        {/* Route Visualization */}
        <div className="flex-1 flex items-center justify-center">
          <div className="relative w-full max-w-xs">
            {/* Route Line */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-brand-green via-brand-red to-brand-dark" />
            
            {/* Location Points */}
            <div className="space-y-6 relative z-10">
              {locationPoints.map((point, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  {/* Marker */}
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-md",
                      point.type === 'origin' && "bg-brand-green text-white",
                      point.type === 'destination' && "bg-brand-dark text-white",
                      point.type === 'checkpoint' && "bg-white text-brand-green border-2 border-brand-green",
                      point.type === 'alert' && "bg-status-danger text-white",
                      point.type === 'current' && "bg-brand-red text-white animate-pulse"
                    )}
                  >
                    {point.type === 'origin' ? (
                      <Navigation className="h-4 w-4" />
                    ) : point.type === 'destination' ? (
                      <MapPin className="h-4 w-4" />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-current" />
                    )}
                  </div>
                  
                  {/* Label */}
                  <div className="flex-1 min-w-0 pt-1">
                    <p className={cn(
                      "text-xs font-medium truncate",
                      (point.type === 'origin' || point.type === 'destination') 
                        ? "text-brand-dark" 
                        : "text-muted-foreground"
                    )}>
                      {point.label}
                    </p>
                    {point.time && (
                      <p className="text-[10px] text-muted-foreground">{point.time}</p>
                    )}
                    {point.type === 'origin' && (
                      <span className="text-[10px] text-brand-green font-medium">ORIGEN</span>
                    )}
                    {point.type === 'destination' && (
                      <span className="text-[10px] text-brand-dark font-medium">DESTINO</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Last Location Overlay */}
        {lastLocation && (
          <div className="absolute bottom-3 left-3 right-3">
            <div className="bg-white/95 backdrop-blur-sm rounded-lg border shadow-lg p-3">
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-brand-red flex items-center justify-center shrink-0">
                  <MapPin className="h-3 w-3 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                    Última Ubicación
                  </p>
                  <p className="text-xs font-medium text-brand-dark truncate">
                    {lastLocation}
                  </p>
                  {lastUpdate && (
                    <div className="flex items-center gap-1 mt-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground">
                        {lastUpdate}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Map Legend */}
        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded border px-2 py-1.5 text-[9px] space-y-1">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-brand-green" />
            <span className="text-muted-foreground">Origen</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-status-danger" />
            <span className="text-muted-foreground">Alerta</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-brand-dark" />
            <span className="text-muted-foreground">Destino</span>
          </div>
        </div>

        {/* "Mapa Placeholder" Label */}
        <div className="absolute top-3 left-3 bg-slate-800/80 text-white text-[9px] px-2 py-1 rounded font-medium">
          Vista de Ruta (Demo)
        </div>
      </div>
    </div>
  );
}
