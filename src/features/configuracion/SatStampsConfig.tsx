import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ShieldCheck,
  Upload,
  Key,
  FileCode,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import axiosClient from "@/api/axiosClient";

export function SatStampsConfig() {
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<{ cer: File | null; key: File | null }>({
    cer: null,
    key: null,
  });
  const [password, setPassword] = useState("");

  const handleUpload = async () => {
    if (!files.cer || !files.key || !password) {
      return toast.error(
        "Todos los campos son obligatorios (.cer, .key y contraseña)",
      );
    }

    const formData = new FormData();
    formData.append("cer_file", files.cer);
    formData.append("key_file", files.key);
    formData.append("password", password);

    setLoading(true);
    try {
      await axiosClient.post("/sat-config/csd", formData);
      toast.success("Certificados actualizados físicamente en el servidor");
    } catch (error) {
      toast.error("Error al subir certificados");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="border-b bg-slate-50/50">
        <CardTitle className="text-sm font-black uppercase text-brand-navy flex items-center gap-2">
          <Key className="h-4 w-4" /> Certificados de Sello Digital (CSD)
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="p-4 border-2 border-dashed rounded-xl space-y-2">
              <Label className="text-xs font-bold uppercase text-slate-500">
                Archivo Certificado (.cer)
              </Label>
              <Input
                type="file"
                accept=".cer"
                onChange={(e) =>
                  setFiles({ ...files, cer: e.target.files?.[0] || null })
                }
              />
              {files.cer && (
                <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> {files.cer.name}
                </p>
              )}
            </div>
            <div className="p-4 border-2 border-dashed rounded-xl space-y-2">
              <Label className="text-xs font-bold uppercase text-slate-500">
                Llave Privada (.key)
              </Label>
              <Input
                type="file"
                accept=".key"
                onChange={(e) =>
                  setFiles({ ...files, key: e.target.files?.[0] || null })
                }
              />
              {files.key && (
                <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> {files.key.name}
                </p>
              )}
            </div>
          </div>
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-xl border space-y-2">
              <Label className="text-xs font-bold uppercase text-slate-500">
                Contraseña de los Sellos
              </Label>
              <Input
                type="password"
                placeholder="Contraseña de clave privada"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-white"
              />
            </div>
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 italic text-[11px] text-blue-700">
              Al subir nuevos archivos, el sistema reemplazará los anteriores
              físicamente en la carpeta /certs del servidor y actualizará las
              rutas en la base de datos automáticamente.
            </div>
          </div>
        </div>
        <Button
          onClick={handleUpload}
          disabled={loading}
          className="w-full bg-brand-navy h-12 font-black uppercase tracking-widest rounded-xl shadow-lg"
        >
          {loading ? (
            <Loader2 className="animate-spin mr-2" />
          ) : (
            <Upload className="h-4 w-4 mr-2" />
          )}
          Actualizar Sellos en Servidor
        </Button>
      </CardContent>
    </Card>
  );
}
