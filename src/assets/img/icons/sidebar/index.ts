import Operadores from "./Operadores.svg";
import Clientes from "./Clientes.svg";
import Tarifas from "./Tarifas.svg";
import Flota from "./Flotas.svg";
import Monitoreo from "./Monitoreo.svg";
import Despacho from "./Despacho.svg";
import Combustible from "./Combustible.svg";
import Liquidacion from "./Liquidacion.svg";
import Proveedores from "./Proveedores.svg";
import Cobranza from "./Cobranza.svg";
import Tesoreria from "./Tesoreria.svg";
import Administracion from "./Administracion.svg";
import Usuarios from "./Usuarios.svg";
import CargaMasiva from "./CargaMasiva.svg";

export const sidebarIcons = {
  Operadores,
  Clientes,
  Tarifas,
  Flota,
  Monitoreo,
  Despacho,
  Combustible,
  Liquidacion,
  Proveedores,
  Cobranza,
  Tesoreria,
  Administracion,
  Usuarios,
  CargaMasiva,
} as const;

export type SidebarIconKey = keyof typeof sidebarIcons;
