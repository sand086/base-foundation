import { useState, useEffect, useMemo } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// =====================
// Interfaces
// =====================
export interface Tire {
  id?: number | string;
  posicion?: number | string;
  marca?: string;
  modelo?: string;
  profundidad_actual?: number;
  estado?: string;
  estado_fisico?: string;
  codigo_interno?: string;
}

interface TruckChassisSVGProps {
  tires: Tire[];
  unitType?: string; // T3, R2, D2, etc.
}

// =====================
// Helpers de Lógica
// =====================

// 🚀 Criterio del Mecánico (Opción B): Colores basados en el texto del estado
const getTireStatusByCondition = (condition: string) => {
  const cond = condition?.toLowerCase() || "desconocido";

  if (cond === "mala") {
    return {
      fill: "fill-red-950/50",
      stroke: "stroke-red-500",
      glow: "drop-shadow-[0_0_12px_rgba(239,68,68,0.8)]",
      pulse: "animate-pulse",
      label: "MALA",
      labelColor: "text-red-400",
    };
  }
  if (cond === "regular") {
    return {
      fill: "fill-amber-950/50",
      stroke: "stroke-amber-500",
      glow: "drop-shadow-[0_0_10px_rgba(245,158,11,0.6)]",
      pulse: "",
      label: "REGULAR",
      labelColor: "text-amber-400",
    };
  }
  // "buena" u óptima
  return {
    fill: "fill-emerald-950/50",
    stroke: "stroke-emerald-500",
    glow: "drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]",
    pulse: "",
    label: "BUENA",
    labelColor: "text-emerald-400",
  };
};

// Limpieza de datos de posición que vienen de la DB
const getCleanPosition = (pos: any): number | null => {
  if (pos == null) return null;
  const strPos = String(pos).trim().toLowerCase();
  const num = Number(strPos);
  if (!isNaN(num) && num >= 1 && num <= 12) return num;
  if (strPos.includes("e1-izq") || strPos.includes("eje 1 izq")) return 1;
  if (strPos.includes("e1-der") || strPos.includes("eje 1 der")) return 2;
  return null;
};

// =====================
// Componente Principal
// =====================
export function TruckChassisSVG({
  tires = [],
  unitType = "T3",
}: TruckChassisSVGProps) {
  const [hoveredTire, setHoveredTire] = useState<string | number | null>(null);

  // 🚀 Lógica de Layout Automático
  // T3 = Tracto (10 llantas), R2/D2 = Remolque/Dolly (8 llantas, sin dirección)
  const isTrailerOrDolly = unitType === "R2" || unitType === "D2";

  const allPossiblePositions = [
    { x: 80, y: 60, position: 1, isDirectional: true },
    { x: 220, y: 60, position: 2, isDirectional: true },
    { x: 65, y: 180, position: 3 },
    { x: 95, y: 180, position: 4 },
    { x: 205, y: 180, position: 5 },
    { x: 235, y: 180, position: 6 },
    { x: 65, y: 280, position: 7 },
    { x: 95, y: 280, position: 8 },
    { x: 205, y: 280, position: 9 },
    { x: 235, y: 280, position: 10 },
  ];

  // Filtramos las posiciones que realmente se deben dibujar según el tipo de unidad
  const activePositions = useMemo(() => {
    if (isTrailerOrDolly) {
      return allPossiblePositions.filter((p) => !p.isDirectional);
    }
    return allPossiblePositions;
  }, [isTrailerOrDolly]);

  // Evitamos el "empalme": 1 llanta por hueco físico
  const drawnTires = useMemo(() => {
    return activePositions
      .map((posBox) => {
        return tires.find(
          (t) => getCleanPosition(t.posicion) === posBox.position,
        );
      })
      .filter(Boolean) as Tire[];
  }, [activePositions, tires]);

  // Contadores basados exclusivamente en lo que se dibujó y en el reporte del mecánico
  const stats = useMemo(() => {
    return {
      mala: drawnTires.filter((t) => t.estado_fisico?.toLowerCase() === "mala")
        .length,
      regular: drawnTires.filter(
        (t) => t.estado_fisico?.toLowerCase() === "regular",
      ).length,
      buena: drawnTires.filter(
        (t) => t.estado_fisico?.toLowerCase() === "buena",
      ).length,
    };
  }, [drawnTires]);

  return (
    <TooltipProvider>
      <div className="relative w-full flex flex-col items-center">
        {/* Leyenda Visual */}
        <div className="flex gap-6 mb-8">
          <LegendItem color="bg-red-500" label="Mala" />
          <LegendItem color="bg-amber-500" label="Regular" />
          <LegendItem color="bg-emerald-500" label="Buena" />
        </div>

        {/* SVG Dinámico */}
        <svg
          viewBox="0 0 300 360"
          className="w-full max-w-md"
          style={{ filter: "drop-shadow(0 10px 30px rgba(0,0,0,0.4))" }}
        >
          <defs>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Chasis fierros principales */}
          <rect
            x="125"
            y="40"
            width="50"
            height="280"
            rx="2"
            className="fill-muted/10 stroke-muted-foreground/20"
          />

          {/* EJE 1 (Solo si es Tracto) */}
          {!isTrailerOrDolly && (
            <>
              <line
                x1="60"
                y1="60"
                x2="240"
                y2="60"
                className="stroke-muted-foreground/40"
                strokeWidth="3"
              />
              <text
                x="15"
                y="65"
                className="text-[8px] fill-muted-foreground/50 font-bold uppercase"
              >
                Dir.
              </text>
            </>
          )}

          {/* EJES TRASEROS (Siempre van) */}
          <line
            x1="45"
            y1="180"
            x2="255"
            y2="180"
            className="stroke-muted-foreground/40"
            strokeWidth="4"
          />
          <line
            x1="45"
            y1="280"
            x2="255"
            y2="280"
            className="stroke-muted-foreground/40"
            strokeWidth="4"
          />
          <text
            x="15"
            y="185"
            className="text-[8px] fill-muted-foreground/50 font-bold uppercase"
          >
            Eje 2
          </text>
          <text
            x="15"
            y="285"
            className="text-[8px] fill-muted-foreground/50 font-bold uppercase"
          >
            Eje 3
          </text>

          {/* Renderizado de Llantas */}
          {activePositions.map((pos) => {
            const tire = drawnTires.find(
              (t) => getCleanPosition(t.posicion) === pos.position,
            );
            if (!tire) {
              // Dibujar hueco vacío
              return (
                <rect
                  key={`empty-${pos.position}`}
                  x={pos.x - 10}
                  y={pos.y - 25}
                  width="20"
                  height="50"
                  rx="2"
                  className="fill-muted/5 stroke-muted-foreground/10 stroke-dashed"
                  strokeDasharray="2,2"
                />
              );
            }

            const status = getTireStatusByCondition(tire.estado_fisico || "");
            const isHovered = hoveredTire === tire.id;
            const isDual = pos.position > 2;

            return (
              <Tooltip key={tire.id || pos.position}>
                <TooltipTrigger asChild>
                  <g
                    className="cursor-pointer transition-all duration-300"
                    onMouseEnter={() => setHoveredTire(tire.id || null)}
                    onMouseLeave={() => setHoveredTire(null)}
                    style={{
                      transform: isHovered ? "scale(1.05)" : "scale(1)",
                      transformOrigin: `${pos.x}px ${pos.y}px`,
                    }}
                  >
                    {/* Brillo de fondo */}
                    <rect
                      x={pos.x - (isDual ? 14 : 17)}
                      y={pos.y - (isDual ? 28 : 33)}
                      width={isDual ? 28 : 34}
                      height={isDual ? 56 : 66}
                      rx="6"
                      className={`${status.fill} opacity-20`}
                      filter="url(#glow)"
                    />
                    {/* Llanta principal */}
                    <rect
                      x={pos.x - (isDual ? 11 : 14)}
                      y={pos.y - (isDual ? 25 : 30)}
                      width={isDual ? 22 : 28}
                      height={isDual ? 50 : 60}
                      rx="4"
                      className={`${status.fill} ${status.stroke} stroke-2 ${status.pulse}`}
                    />
                    <text
                      x={pos.x}
                      y={pos.y + 4}
                      textAnchor="middle"
                      className={`font-bold text-[10px] ${status.labelColor} fill-current`}
                    >
                      {pos.position}
                    </text>
                  </g>
                </TooltipTrigger>
                <TooltipContent
                  side="right"
                  className="bg-slate-900 border-slate-700 text-white p-3 shadow-2xl backdrop-blur-md"
                >
                  <div className="space-y-1">
                    <p className="font-black text-blue-400">
                      POSICIÓN {pos.position}
                    </p>
                    <p className="text-xs font-bold uppercase">
                      {tire.marca} {tire.modelo}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-lg font-black">
                        {tire.profundidad_actual}mm
                      </span>
                      <LocalBadge color={status.labelColor}>
                        {status.label}
                      </LocalBadge>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      ID: {tire.codigo_interno}
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </svg>

        {/* 🚀 TARJETAS DE CONTEO FINAL */}
        <div className="grid grid-cols-3 gap-4 mt-10 w-full max-w-md">
          <StatCard
            count={stats.mala}
            label="Malas"
            color="text-red-500"
            bg="bg-red-500/10"
            border="border-red-500/20"
          />
          <StatCard
            count={stats.regular}
            label="Regulares"
            color="text-amber-500"
            bg="bg-amber-500/10"
            border="border-amber-500/20"
          />
          <StatCard
            count={stats.buena}
            label="Buenas"
            color="text-emerald-500"
            bg="bg-emerald-500/10"
            border="border-emerald-500/20"
          />
        </div>
      </div>
    </TooltipProvider>
  );
}

// =====================
// Sub-componentes UI
// =====================

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-3 h-3 rounded-full ${color} shadow-sm`} />
      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
        {label}
      </span>
    </div>
  );
}

function StatCard({ count, label, color, bg, border }: any) {
  return (
    <div
      className={`p-4 rounded-2xl border ${bg} ${border} text-center transition-all hover:scale-105`}
    >
      <p className={`text-3xl font-black ${color}`}>{count}</p>
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
        {label}
      </p>
    </div>
  );
}

function LocalBadge({ children, color }: any) {
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-[9px] font-black border border-current ${color} bg-current/10 uppercase`}
    >
      {children}
    </span>
  );
}
