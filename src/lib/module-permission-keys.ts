/**
 * Las rutas y ProtectedRoute usan códigos en inglés; en BD el JSON de permisos
 * del rol suele usar los id del catálogo (español o legacy), igual que en
 * RolesPermissions.tsx (translationMap). Mantener ambos lados alineados aquí.
 */
export const ROUTE_TO_PERM_KEYS: Record<string, readonly string[]> = {
  monitoring: ["monitoring", "monitoreo"],
  traffic: ["traffic", "trackingop"],
  fleet: ["fleet", "flota"],
  fuel: ["fuel", "combustible"],
  clients: ["clients", "clientes"],
  settlements: ["settlements", "liquidaciones", "liquidacion"],
  receivables: ["receivables", "cxc"],
  payables: ["payables", "cxp"],
  rates: ["rates", "tarifas"],
  dispatch: ["dispatch", "despacho", "dispatch"],
  treasury: ["treasury", "tesoreria", "tesorería", "finanzas"],
  admin: ["admin", "configuracion", "usuarios", "users"],
  cfdi_vault: ["cfdi_vault", "historico_cfdi", "cfdi"],
};

export function pickPermisosInsensitive(
  permisos: Record<string, unknown>,
  key: string,
): unknown {
  const t = key.toLowerCase();
  for (const [k, v] of Object.entries(permisos || {})) {
    if (String(k).toLowerCase() === t) return v;
  }
  return undefined;
}
