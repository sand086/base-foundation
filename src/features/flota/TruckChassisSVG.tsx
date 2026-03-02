import { useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Interfaz actualizada para coincidir con el JSON de tu API
export interface Tire {
  id?: number | string;
  posicion?: string; // Ej: "Eje 1 Izq"
  marca?: string;
  modelo?: string;
  profundidad_actual?: number; // Ej: 15.5
  estado?: string;
  estado_fisico?: string;
  codigo_interno?: string;
}

interface TruckChassisSVGProps {
  tires: Tire[];
  unitType?: "sencillo" | "full";
}

// Mapeo: Convierte el texto de la BD ("Eje 1 Izq") al ID numérico del SVG (1)
const POSITION_MAP: Record<string, number> = {
  "e1-izq": 1,
  "Eje 1 Izq": 1,
  "Eje 1 Izquierda": 1,

  "e1-der": 2,
  "Eje 1 Der": 2,
  "Eje 1 Derecha": 2,

  "e2-izq": 3,
  "Eje 2 Izq": 3,
  "Eje 2 Izquierda": 3,

  "e2-der": 4,
  "Eje 2 Der": 4,
  "Eje 2 Derecha": 4,

  "e3-izq-ext": 5,
  "Eje 3 Izq Ext": 5,
  "Eje 3 Izquierda Ext": 5,

  "e3-izq-int": 6,
  "Eje 3 Izq Int": 6,
  "Eje 3 Izquierda Int": 6,

  "e3-der-int": 7,
  "Eje 3 Der Int": 7,
  "Eje 3 Derecha Int": 7,

  "e3-der-ext": 8,
  "Eje 3 Der Ext": 8,
  "Eje 3 Derecha Ext": 8,
};

const getTireStatus = (depth: number) => {
  if (depth < 5) {
    // Ajustado a tu lógica (antes era 3)
    return {
      fill: "fill-red-950/50",
      stroke: "stroke-red-500",
      glow: "drop-shadow-[0_0_12px_rgba(239,68,68,0.8)]",
      pulse: "animate-pulse",
      label: "CRÍTICO",
      labelColor: "text-red-400",
    };
  }
  if (depth <= 10) {
    // Ajustado a tu lógica (antes era 6)
    return {
      fill: "fill-amber-950/50",
      stroke: "stroke-amber-500",
      glow: "drop-shadow-[0_0_10px_rgba(245,158,11,0.6)]",
      pulse: "",
      label: "ALERTA",
      labelColor: "text-amber-400",
    };
  }
  return {
    fill: "fill-emerald-950/50",
    stroke: "stroke-emerald-500",
    glow: "drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]",
    pulse: "",
    label: "ÓPTIMO",
    labelColor: "text-emerald-400",
  };
};

export function TruckChassisSVG({
  tires = [],
  unitType = "sencillo",
}: TruckChassisSVGProps) {
  const [hoveredTire, setHoveredTire] = useState<string | number | null>(null);

  // Tire positions for the SVG (worm's-eye view - from below)
  const tirePositions = [
    { x: 80, y: 60, position: 1 },
    { x: 220, y: 60, position: 2 },
    { x: 80, y: 180, position: 3 },
    { x: 220, y: 180, position: 4 },
    { x: 65, y: 280, position: 5 },
    { x: 95, y: 280, position: 6 },
    { x: 205, y: 280, position: 7 },
    { x: 235, y: 280, position: 8 },
  ];

  const fullTirePositions =
    unitType === "full"
      ? [
          { x: 65, y: 360, position: 9 },
          { x: 95, y: 360, position: 10 },
          { x: 205, y: 360, position: 11 },
          { x: 235, y: 360, position: 12 },
        ]
      : [];

  const allTirePositions = [...tirePositions, ...fullTirePositions];
  const svgHeight = unitType === "full" ? 440 : 360;

  // Filtrado seguro para las estadísticas usando profundidad_actual
  const getDepth = (t: Tire) => t.profundidad_actual ?? 0;
  const criticalCount = tires.filter(
    (t) => getDepth(t) > 0 && getDepth(t) < 5,
  ).length;
  const alertCount = tires.filter(
    (t) => getDepth(t) >= 5 && getDepth(t) <= 10,
  ).length;
  const optimalCount = tires.filter((t) => getDepth(t) > 10).length;

  return (
    <TooltipProvider>
      <div className="relative w-full flex flex-col items-center">
        {/* Legend */}
        <div className="flex gap-6 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-500/50 border border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
            <span className="text-xs text-muted-foreground">
              {"<5mm Crítico"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-amber-500/50 border border-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
            <span className="text-xs text-muted-foreground">5-10mm Alerta</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-emerald-500/50 border border-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
            <span className="text-xs text-muted-foreground">
              {">10mm Óptimo"}
            </span>
          </div>
        </div>

        {/* SVG Chassis */}
        <svg
          viewBox={`0 0 300 ${svgHeight}`}
          className="w-full max-w-md"
          style={{ filter: "drop-shadow(0 4px 20px rgba(0,0,0,0.3))" }}
        >
          <defs>
            <radialGradient id="chassisGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.05)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0)" />
            </radialGradient>
            <filter id="neonGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Chassis frame */}
          <rect
            x="120"
            y="40"
            width="60"
            height={svgHeight - 80}
            rx="4"
            className="fill-muted/20 stroke-muted-foreground/30"
            strokeWidth="1"
          />
          <line
            x1="150"
            y1="80"
            x2="150"
            y2={svgHeight - 60}
            className="stroke-muted-foreground/40"
            strokeWidth="3"
            strokeDasharray="8 4"
          />

          {/* Ejes y diferenciales (se mantienen igual) */}
          <line
            x1="60"
            y1="60"
            x2="240"
            y2="60"
            className="stroke-muted-foreground/50"
            strokeWidth="4"
          />
          <circle cx="150" cy="60" r="6" className="fill-muted-foreground/30" />
          <line
            x1="60"
            y1="180"
            x2="240"
            y2="180"
            className="stroke-muted-foreground/50"
            strokeWidth="4"
          />
          <circle
            cx="150"
            cy="180"
            r="8"
            className="fill-muted-foreground/40"
          />
          <ellipse
            cx="150"
            cy="280"
            rx="30"
            ry="15"
            className="fill-muted/30 stroke-muted-foreground/40"
            strokeWidth="2"
          />
          <line
            x1="45"
            y1="280"
            x2="255"
            y2="280"
            className="stroke-muted-foreground/50"
            strokeWidth="4"
          />

          {unitType === "full" && (
            <>
              <ellipse
                cx="150"
                cy="360"
                rx="30"
                ry="15"
                className="fill-muted/30 stroke-muted-foreground/40"
                strokeWidth="2"
              />
              <line
                x1="45"
                y1="360"
                x2="255"
                y2="360"
                className="stroke-muted-foreground/50"
                strokeWidth="4"
              />
            </>
          )}

          {/* Tires with neon effect */}
          {allTirePositions.map((pos) => {
            // CORRECCIÓN MAGISTRAL: Buscar la llanta usando el mapa de traducción de posiciones
            const tire = tires.find((t) => {
              if (!t.posicion) return false;
              // Buscamos si el string ("Eje 1 Izq") mapea al número de esta posición SVG (1)
              return POSITION_MAP[t.posicion] === pos.position;
            });

            if (!tire) return null;

            const tireId = tire.id || `pos-${pos.position}`;
            const depth = tire.profundidad_actual ?? 0;
            const status = getTireStatus(depth);
            const isHovered = hoveredTire === tireId;
            const isDualTire = pos.position >= 5;
            const tireWidth = isDualTire ? 22 : 28;
            const tireHeight = isDualTire ? 50 : 60;

            return (
              <Tooltip key={tireId}>
                <TooltipTrigger asChild>
                  <g
                    onMouseEnter={() => setHoveredTire(tireId)}
                    onMouseLeave={() => setHoveredTire(null)}
                    className="cursor-pointer"
                    style={{
                      transform: isHovered ? "scale(1.1)" : "scale(1)",
                      transformOrigin: `${pos.x}px ${pos.y}px`,
                      transition: "transform 0.2s ease-out",
                    }}
                  >
                    {/* Tire glow effect */}
                    <rect
                      x={pos.x - tireWidth / 2 - 4}
                      y={pos.y - tireHeight / 2 - 4}
                      width={tireWidth + 8}
                      height={tireHeight + 8}
                      rx="6"
                      className={`${status.fill} ${status.glow} ${status.pulse}`}
                      filter="url(#neonGlow)"
                    />
                    {/* Tire body */}
                    <rect
                      x={pos.x - tireWidth / 2}
                      y={pos.y - tireHeight / 2}
                      width={tireWidth}
                      height={tireHeight}
                      rx="4"
                      className={`${status.fill} ${status.stroke} stroke-2 ${status.pulse}`}
                    />
                    {/* Tire tread pattern */}
                    {[...Array(5)].map((_, i) => (
                      <line
                        key={i}
                        x1={pos.x - tireWidth / 2 + 3}
                        y1={pos.y - tireHeight / 2 + 8 + i * 10}
                        x2={pos.x + tireWidth / 2 - 3}
                        y2={pos.y - tireHeight / 2 + 8 + i * 10}
                        className={`${status.stroke} opacity-50`}
                        strokeWidth="1"
                      />
                    ))}
                    {/* Position label */}
                    <text
                      x={pos.x}
                      y={pos.y + 3}
                      textAnchor="middle"
                      className={` font-bold ${status.labelColor} fill-current`}
                    >
                      {pos.position}
                    </text>
                  </g>
                </TooltipTrigger>
                <TooltipContent
                  side="right"
                  className="backdrop-blur-xl bg-black/80 border-white/20 shadow-2xl"
                >
                  <div className="space-y-1">
                    <p className="font-bold text-foreground">{tire.posicion}</p>
                    <p className="text-sm text-muted-foreground">
                      {tire.marca || "Marca N/A"}{" "}
                      {tire.modelo ? `- ${tire.modelo}` : ""}
                    </p>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-lg font-bold ${status.labelColor}`}
                      >
                        {depth}mm
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          depth < 5
                            ? "bg-red-500/20 text-red-400"
                            : depth <= 10
                              ? "bg-amber-500/20 text-amber-400"
                              : "bg-emerald-500/20 text-emerald-400"
                        }`}
                      >
                        {status.label}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground/70">
                      ID: {tire.codigo_interno || "S/N"}
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}

          {/* Labels y flecha de dirección (se mantienen) */}
          <text
            x="20"
            y="65"
            className="text-[9px] fill-muted-foreground/60 font-medium"
          >
            EJE 1
          </text>
          <text
            x="20"
            y="185"
            className="text-[9px] fill-muted-foreground/60 font-medium"
          >
            EJE 2
          </text>
          <text
            x="20"
            y="285"
            className="text-[9px] fill-muted-foreground/60 font-medium"
          >
            EJE 3
          </text>
          {unitType === "full" && (
            <text
              x="20"
              y="365"
              className="text-[9px] fill-muted-foreground/60 font-medium"
            >
              EJE 4
            </text>
          )}

          <polygon
            points="150,15 145,30 155,30"
            className="fill-muted-foreground/40"
          />
          <text
            x="150"
            y="10"
            textAnchor="middle"
            className="text-[8px] fill-muted-foreground/50 uppercase tracking-wider"
          >
            Frente
          </text>
        </svg>

        {/* Stats summary */}
        <div className="grid grid-cols-3 gap-4 mt-8 w-full max-w-md">
          <div className="backdrop-blur-xl bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-red-400">{criticalCount}</p>
            <p className="text-xs text-muted-foreground">Críticas</p>
          </div>
          <div className="backdrop-blur-xl bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-amber-400">{alertCount}</p>
            <p className="text-xs text-muted-foreground">Alerta</p>
          </div>
          <div className="backdrop-blur-xl bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-emerald-400">
              {optimalCount}
            </p>
            <p className="text-xs text-muted-foreground">Óptimas</p>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
