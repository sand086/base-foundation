import { GenericCatalogManager } from "./GenericCatalogManager";
import { useSettlementConcepts } from "@/hooks/useSettlementConcepts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const PaymentConceptsConfig = () => {
  const { concepts, loading, saveConcepts } = useSettlementConcepts();
  return (
    <GenericCatalogManager
      title="Concepto de Pago"
      items={concepts}
      loading={loading}
      onSave={saveConcepts}
      columns={[{ header: "Tipo", key: "tipo" }]}
      extraFields={(data, setData) => (
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500">
            Clasificación
          </label>
          <Select
            value={data.tipo}
            onValueChange={(val) => setData({ ...data, tipo: val })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecciona tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ingreso">Ingreso (Percepción)</SelectItem>
              <SelectItem value="deduccion">Deducción (Retención)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    />
  );
};
