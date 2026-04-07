import { Tire } from "@/features/tires/types";

// --- HELPERS DE CÁLCULO ---

export const getTireLifePercentage = (tire: Tire): number => {
  if (!tire.profundidad_original || tire.profundidad_original === 0) return 0;
  const percentage = Math.round(
    (tire.profundidad_actual / tire.profundidad_original) * 100,
  );
  return Math.max(0, Math.min(100, percentage));
};

export const getTireSemaphoreStatus = (tire: Tire) => {
  const depth = tire.profundidad_actual;

  if (depth <= 4)
    return {
      color: "text-white",
      bgColor: "bg-red-600",
      label: "Crítico",
      variant: "destructive" as const,
    };

  if (depth <= 8)
    return {
      color: "text-black",
      bgColor: "bg-amber-400",
      label: "Atención",
      variant: "secondary" as const,
    };

  return {
    color: "text-white",
    bgColor: "bg-emerald-600",
    label: "Óptimo",
    variant: "default" as const,
  };
};

export const getEstadoBadge = (estado: string) => {
  switch (estado.toLowerCase()) {
    case "nuevo":
      return {
        className: "bg-emerald-100 text-emerald-700 border-emerald-200",
        label: "Nuevo",
      };
    case "usado":
      return {
        className: "bg-blue-100 text-blue-700 border-blue-200",
        label: "Usado",
      };
    case "renovado":
      return {
        className: "bg-purple-100 text-purple-700 border-purple-200",
        label: "Renovado",
      };
    case "desecho":
      return {
        className: "bg-rose-100 text-rose-700 border-rose-200",
        label: "Desecho",
      };
    default:
      return { className: "bg-gray-100 text-gray-700", label: estado };
  }
};

// --- CONFIGURACIÓN DE POSICIONES ---

export const TIRE_POSITIONS = [
  { id: 1, label: "Posición 1 (Direccional Izq)", eje: 1, lado: "izquierda" },
  { id: 2, label: "Posición 2 (Direccional Der)", eje: 1, lado: "derecha" },
  { id: 3, label: "Posición 3 (Tracción 1 Izq Ext)", eje: 2, lado: "izquierda" },
  { id: 4, label: "Posición 4 (Tracción 1 Izq Int)", eje: 2, lado: "izquierda" },
  { id: 5, label: "Posición 5 (Tracción 1 Der Int)", eje: 2, lado: "derecha" },
  { id: 6, label: "Posición 6 (Tracción 1 Der Ext)", eje: 2, lado: "derecha" },
  { id: 7, label: "Posición 7 (Tracción 2 Izq Ext)", eje: 3, lado: "izquierda" },
  { id: 8, label: "Posición 8 (Tracción 2 Izq Int)", eje: 3, lado: "izquierda" },
  { id: 9, label: "Posición 9 (Tracción 2 Der Int)", eje: 3, lado: "derecha" },
  { id: 10, label: "Posición 10 (Tracción 2 Der Ext)", eje: 3, lado: "derecha" },
  { id: 0, label: "Repuesto", eje: 0, lado: "repuesto" },
];
