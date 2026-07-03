/**
 * Las rutas y ProtectedRoute usan códigos en inglés; en BD el JSON de permisos
 * del rol suele usar los id del catálogo (español o legacy), igual que en
 * RolesPermissions.tsx (translationMap). Mantener ambos lados alineados aquí.
 */
export const MODULE_PERMISSIONS: Record<string, string[]> = {
  dashboard: ["view"],
  clients: ["view", "create", "edit", "delete"],
  rates: ["view", "create", "edit", "delete"],
  fleet: ["view", "create", "edit", "delete"],
  monitoring: ["view", "create", "edit", "delete"],
  traffic: ["view", "create", "edit", "delete"],
  dispatch: ["view", "create", "edit", "delete"],
  fuel: ["view", "create", "edit", "delete"],
  settlements: ["view", "create", "edit", "delete"],
  suppliers: ["view", "create", "edit", "delete"],
  payables: ["view", "create", "edit", "delete"],

  receivables: [
    "view",
    "create",
    "cancel",
    "refactor",
    "register_payment",
    "export",
  ],
  historico: ["view", "refactor", "export"],
  treasury: ["view", "create", "edit", "delete", "export"],

  reports: ["view", "export"],
  users: ["view", "create", "edit", "delete"],
  roles: ["view", "create", "edit", "delete"],
  settings: ["view", "edit"],
  sat: ["stamp_cfdi", "cancel_cfdi"],
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
