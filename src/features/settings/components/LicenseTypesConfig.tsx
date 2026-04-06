import { GenericCatalogManager } from "./GenericCatalogManager";
import { useLicenseTypes } from "@/features/settings/hooks/useLicenseTypes";
import { Input } from "@/components/ui/input";

export const LicenseTypesConfig = () => {
  const { licenseTypes, loading, saveLicenseTypes } = useLicenseTypes();
  return (
    <GenericCatalogManager
      title="Tipo de Licencia"
      items={licenseTypes}
      loading={loading}
      onSave={saveLicenseTypes}
      extraFields={(data, setData) => (
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500">
            Descripción
          </label>
          <Input
            value={data.descripcion || ""}
            onChange={(e) => setData({ ...data, descripcion: e.target.value })}
            placeholder="Ej: Autoriza carga pesada federal"
          />
        </div>
      )}
    />
  );
};
