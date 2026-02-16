import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Upload, Loader2, Eye, Trash2, Calendar } from "lucide-react";
import { Mechanic, MechanicDocument } from "@/types/api.types";
import { mechanicService } from "@/services/mechanicService";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  mechanic: Mechanic | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DOC_TYPES = [
  { value: "ine", label: "INE / Identificación" },
  { value: "contrato", label: "Contrato Laboral" },
  { value: "licencia", label: "Licencia de Conducir" },
  { value: "certificacion", label: "Certificación Técnica" },
  { value: "domicilio", label: "Comprobante de Domicilio" },
  { value: "otro", label: "Otro Documento" },
];

export function MechanicExpedienteModal({
  mechanic,
  open,
  onOpenChange,
}: Props) {
  const [documents, setDocuments] = useState<MechanicDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Estados para subir
  const [selectedType, setSelectedType] = useState("ine");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [vencimiento, setVencimiento] = useState("");

  useEffect(() => {
    if (mechanic && open) {
      loadDocuments();
    }
  }, [mechanic, open]);

  const loadDocuments = async () => {
    if (!mechanic) return;
    setLoading(true);
    try {
      const docs = await mechanicService.getDocuments(mechanic.id);
      setDocuments(docs);
    } catch (error) {
      console.error(error);
      // toast.error("Error al cargar documentos");
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!mechanic || !selectedFile) return;
    setUploading(true);
    try {
      await mechanicService.uploadDocument(
        mechanic.id,
        selectedType,
        selectedFile,
        vencimiento,
      );
      toast.success("Documento subido correctamente");
      setSelectedFile(null);
      setVencimiento("");
      loadDocuments(); // Recargar lista
    } catch (error) {
      toast.error("Error al subir el archivo");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Expediente Digital:{" "}
            <span className="text-emerald-600">
              {mechanic?.nombre} {mechanic?.apellido}
            </span>
          </DialogTitle>
          <DialogDescription>
            Gestión de documentos, contratos y certificaciones.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          {/* COLUMNA IZQUIERDA: FORMULARIO DE SUBIDA */}
          <div className="space-y-4 border p-4 rounded-lg bg-slate-50">
            <h3 className="font-semibold text-sm">Subir Nuevo Documento</h3>

            <div className="space-y-2">
              <Label>Tipo de Documento</Label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOC_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Archivo (PDF, JPG, PNG)</Label>
              <Input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              />
            </div>

            <div className="space-y-2">
              <Label>Fecha Vencimiento (Opcional)</Label>
              <div className="relative">
                <Calendar className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  className="pl-8"
                  value={vencimiento}
                  onChange={(e) => setVencimiento(e.target.value)}
                />
              </div>
            </div>

            <Button
              className="w-full mt-2"
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
            >
              {uploading ? (
                <Loader2 className="animate-spin mr-2 h-4 w-4" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              Subir al Expediente
            </Button>
          </div>

          {/* COLUMNA DERECHA: LISTA DE ARCHIVOS */}
          <div className="border rounded-lg flex flex-col h-[400px]">
            <div className="p-3 border-b bg-muted/30">
              <h3 className="font-semibold text-sm">
                Documentos Guardados ({documents.length})
              </h3>
            </div>

            <ScrollArea className="flex-1 p-3">
              {loading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="animate-spin" />
                </div>
              ) : documents.length === 0 ? (
                <div className="text-center text-muted-foreground py-10 text-sm">
                  No hay documentos en el expediente.
                </div>
              ) : (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-2 border rounded-md hover:bg-slate-50"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="h-8 w-8 bg-blue-100 text-blue-600 rounded flex items-center justify-center shrink-0">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate capitalize">
                            {doc.tipo_documento.replace("_", " ")}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {doc.nombre_archivo}
                          </p>
                          {doc.fecha_vencimiento && (
                            <p className="text-[10px] text-amber-600 font-medium">
                              Vence: {doc.fecha_vencimiento}
                            </p>
                          )}
                        </div>
                      </div>

                      <Button variant="ghost" size="sm" asChild>
                        <a
                          href={doc.url_archivo}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Eye className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
