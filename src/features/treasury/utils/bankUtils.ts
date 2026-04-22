import BanamexIcon from "@/assets/img/icons/banks/banamex.svg";
import BanorteIcon from "@/assets/img/icons/banks/banorte.svg";
import BbvaIcon from "@/assets/img/icons/banks/bbva.svg";
import HsbcIcon from "@/assets/img/icons/banks/hsbc.svg";
import SantanderIcon from "@/assets/img/icons/banks/santander.svg";
import ScotiaIcon from "@/assets/img/icons/banks/scotia.svg";

export const getBankLogo = (bankName: string | undefined | null) => {
  if (!bankName) return null;

  // Normalizamos el texto a minúsculas para que no fallen las mayúsculas
  const name = bankName.toLowerCase();

  if (name.includes("banamex") || name.includes("citi")) return BanamexIcon;
  if (name.includes("banorte")) return BanorteIcon;
  if (name.includes("bbva") || name.includes("bancomer")) return BbvaIcon;
  if (name.includes("hsbc")) return HsbcIcon;
  if (name.includes("santander")) return SantanderIcon;
  if (name.includes("scotia")) return ScotiaIcon;

  return null; // Retorna null si no encuentra el banco
};
