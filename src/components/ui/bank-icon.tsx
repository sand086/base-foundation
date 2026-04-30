import React from "react";
import { Landmark } from "lucide-react";
import { cn } from "@/lib/utils";

// NOTA EL "?react" AL FINAL DE CADA LÍNEA
import BanamexLogo from "@/assets/img/icons/banks/banamex.svg?react";
import BanorteLogo from "@/assets/img/icons/banks/banorte.svg?react";
import BbvaLogo from "@/assets/img/icons/banks/bbva.svg?react";
import HsbcLogo from "@/assets/img/icons/banks/hsbc.svg?react";
import SantanderLogo from "@/assets/img/icons/banks/santander.svg?react";
import ScotiaLogo from "@/assets/img/icons/banks/scotia.svg?react";
import Bancoppel from "@/assets/img/icons/banks/coppel.svg?react";
import Inbursa from "@/assets/img/icons/banks/inbursa.svg?react";
import Banregio from "@/assets/img/icons/banks/banregio.svg?react";
import Afirme from "@/assets/img/icons/banks/afirme.svg?react";

export type BankIconName =
  | "Banamex"
  | "Banorte"
  | "BBVA"
  | "HSBC"
  | "Santander"
  | "Scotiabank"
  | "Bancoppel"
  | "Inbursa"
  | "Banregio"
  | "Afirme"
  | string;

interface BankIconProps extends React.SVGProps<SVGSVGElement> {
  bankName: BankIconName;
  className?: string;
}

// Mapa completo con todos los bancos que importaste
const bankIconsMap: Record<string, React.FC<React.SVGProps<SVGSVGElement>>> = {
  Banamex: BanamexLogo,
  Banorte: BanorteLogo,
  BBVA: BbvaLogo,
  HSBC: HsbcLogo,
  Santander: SantanderLogo,
  Scotiabank: ScotiaLogo,
  Bancoppel: Bancoppel,
  Inbursa: Inbursa,
  Banregio: Banregio,
  Afirme: Afirme,
};

//Exportamos las llaves del mapa como nuestro arreglo oficial de bancos.
// Así, si mañana agregas "NuBank" al map, automáticamente aparecerá en todos los Selects de tu sistema.
export const SUPPORTED_BANKS = Object.keys(bankIconsMap);

export const BankIcon = ({ bankName, className, ...props }: BankIconProps) => {
  const normalizedKey = Object.keys(bankIconsMap).find(
    (key) => key.toLowerCase() === bankName?.toLowerCase(),
  );

  const IconComponent = normalizedKey ? bankIconsMap[normalizedKey] : null;

  if (!IconComponent) {
    return (
      <Landmark
        className={cn("text-slate-400 dark:text-slate-500", className)}
        {...(props as any)}
      />
    );
  }

  return (
    <IconComponent
      className={cn(
        "w-full h-full object-contain transition-colors",
        className,
      )}
      {...props}
    />
  );
};
