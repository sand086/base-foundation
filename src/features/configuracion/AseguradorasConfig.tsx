import { GenericCatalogManager } from "./GenericCatalogManager";
import { useInsurers } from "@/hooks/useInsurers";
import { Input } from "@/components/ui/input";

export const AseguradorasConfig = () => {
  const { insurers, loading, saveInsurers } = useInsurers();
  return (
    <GenericCatalogManager
      title="Aseguradora"
      items={insurers}
      loading={loading}
      onSave={saveInsurers}
      columns={[{ header: "Tel. Siniestros", key: "telefono_siniestros" }]}
      extraFields={(data, setData) => (
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500">
            Teléfono de Siniestros
          </label>
          <Input
            value={data.telefono_siniestros || ""}
            onChange={(e) =>
              setData({ ...data, telefono_siniestros: e.target.value })
            }
            placeholder="800-XXX-XXXX"
          />
        </div>
      )}
    />
  );
};
