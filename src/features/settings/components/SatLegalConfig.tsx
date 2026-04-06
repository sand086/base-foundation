import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FileText, Save, RotateCcw, AlertCircle } from "lucide-react";
import { useSystemConfig } from "@/features/settings/hooks/useSystemConfig";
import { toast } from "sonner";
import axiosClient from "@/api/axiosClient";

// El texto que extrajimos de tu factura real (OCR)
const LEYENDA_DEFAULT = `PRIMERA.- Para los efectos del presente contrato de transporte se denomina "Transportista" al que realiza el servicio de transportación... (Insertar las 15 cláusulas aquí)`;

export function SatLegalConfig() {
  const { value: currentLeyenda, isLoading } =
    useSystemConfig("sat_leyenda_legal");
  const [leyenda, setLeyenda] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (currentLeyenda !== undefined && currentLeyenda !== null) {
      setLeyenda(currentLeyenda);
    }
  }, [currentLeyenda]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await axiosClient.post("/sat-config/update-params", {
        sat_leyenda_legal: leyenda,
      });
      toast.success("Leyenda legal actualizada");
    } catch {
      toast.error("Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="border-b bg-slate-50/50">
        <CardTitle className="text-sm font-black uppercase text-brand-navy flex items-center gap-2">
          <FileText className="h-4 w-4" /> Contrato de Transporte (Addenda /
          Leyendas)
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-100 rounded-lg text-amber-800 text-[11px] font-medium">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Este texto aparecerá en el nodo de Addenda del XML y en la última
          página de la representación impresa (PDF).
        </div>

        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase text-slate-500">
            Contenido de Cláusulas Legales
          </Label>
          <Textarea
            value={leyenda}
            onChange={(e) => setLeyenda(e.target.value)}
            className="min-h-[400px] font-mono text-[11px] leading-relaxed bg-slate-50 focus:bg-white transition-colors p-4"
            placeholder="Pega aquí las cláusulas del contrato..."
          />
        </div>

        <div className="flex justify-between gap-4">
          <Button
            variant="outline"
            onClick={() => setLeyenda(LEYENDA_DEFAULT)}
            className="text-slate-500 font-bold text-xs uppercase"
          >
            <RotateCcw className="h-3 w-3 mr-2" /> Cargar Rapid-3T Default
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-xs px-10 rounded-xl shadow-lg"
          >
            <Save className="h-4 w-4 mr-2" /> Guardar Leyenda Legal
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
