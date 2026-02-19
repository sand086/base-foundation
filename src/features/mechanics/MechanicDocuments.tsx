import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Loader2, Upload, FileText, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";
import { Mechanic } from "@/types/api.types";
import { mechanicService } from "@/services/mechanicService";

//  Dialog shadcn/ui
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface MechanicDocument {
  id: number;
  tipo_documento: string;
  nombre_archivo: string;
  url_archivo: string;
  subido_en: string;
}

interface Props {
  mechanic: Mechanic;
}

const DOC_TYPES = [
  { value: "ine", label: "INE / Identificación" },
  { value: "licencia", label: "Licencia de Conducir" },
  { value: "comprobante_domicilio", label: "Comp. Domicilio" },
  { value: "nss", label: "Comprobante NSS" },
  { value: "contrato", label: "Contrato Firmado" },
  { value: "certificacion", label: "Certificación Técnica" },
  { value: "otro", label: "Otro Documento" },
];

export function MechanicDocuments({ mechanic }: Props) {
  const [documents, setDocuments] = useState<MechanicDocument[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Formulario
  const [selectedDocType, setSelectedDocType] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  //  Estado modal de eliminar
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState<MechanicDocument | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mechanic.id]);

  const loadDocuments = async () => {
    setIsLoadingDocs(true);
    try {
      const docs = await mechanicService.getDocuments(mechanic.id);
      setDocuments(docs);
    } catch (error) {
      console.error("Error cargando documentos", error);
      toast.error("Error al cargar la lista de documentos");
    } finally {
      setIsLoadingDocs(false);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !selectedDocType) {
      toast.error("Selecciona un tipo de documento y un archivo");
      return;
    }
    setUploading(true);
    try {
      await mechanicService.uploadDocument(
        mechanic.id,
        selectedDocType,
        selectedFile,
      );
      toast.success("Documento subido correctamente");

      // Limpiar formulario
      setSelectedFile(null);
      setSelectedDocType("");
      const fileInput = document.getElementById(
        "file-upload",
      ) as HTMLInputElement;
      if (fileInput) fileInput.value = "";

      loadDocuments();
    } catch (error) {
      console.error(error);
      toast.error("Error al subir el documento");
    } finally {
      setUploading(false);
    }
  };

  //  Abrir modal y guardar doc a eliminar
  const requestDelete = (doc: MechanicDocument) => {
    setDocToDelete(doc);
    setIsDeleteOpen(true);
  };

  //  Confirmar eliminación
  const confirmDelete = async () => {
    if (!docToDelete) return;

    setIsDeleting(true);
    try {
      await mechanicService.deleteDocument(docToDelete.id);
      toast.success("Documento eliminado");

      // Actualización optimista
      setDocuments((prev) => prev.filter((d) => d.id !== docToDelete.id));

      // Cerrar modal
      setIsDeleteOpen(false);
      setDocToDelete(null);
    } catch (error) {
      console.error(error);
      toast.error("Error al eliminar");
    } finally {
      setIsDeleting(false);
    }
  };

  const BACKEND_URL =
    (import.meta.env.VITE_BACKEND_URL as string) || window.location.origin;

  const handleView = (url: string) => {
    const fullUrl = new URL(url, BACKEND_URL).toString();
    window.open(fullUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
      {/*  MODAL ELIMINAR */}
      <Dialog
        open={isDeleteOpen}
        onOpenChange={(open) => {
          setIsDeleteOpen(open);
          if (!open) setDocToDelete(null);
        }}
      >
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Eliminar documento</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. Se eliminará el archivo del
              expediente del mecánico.
            </DialogDescription>
          </DialogHeader>

          {docToDelete && (
            <div className="rounded-lg border bg-slate-50 p-3 text-sm">
              <div className="font-medium truncate">
                {docToDelete.tipo_documento.replace("_", " ")}
              </div>
              <div className="text-muted-foreground truncate">
                {docToDelete.nombre_archivo}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsDeleteOpen(false)}
              disabled={isDeleting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Eliminando...
                </>
              ) : (
                "Eliminar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AREA DE SUBIDA */}
      <div className="bg-white p-4 rounded-lg border shadow-sm mb-6">
        <h3 className="font-medium text-sm mb-3">Subir Nuevo Documento</h3>
        <div className="flex flex-col md:flex-row gap-3 items-end">
          <div className="w-full md:w-1/3 space-y-1">
            <Label className="text-xs">Tipo de Documento</Label>
            <Select value={selectedDocType} onValueChange={setSelectedDocType}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar..." />
              </SelectTrigger>
              <SelectContent>
                {DOC_TYPES.map((dt) => (
                  <SelectItem key={dt.value} value={dt.value}>
                    {dt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-full md:w-1/2 space-y-1">
            <Label className="text-xs">Archivo (PDF, Imagen)</Label>
            <Input
              id="file-upload"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
            />
          </div>

          <Button
            onClick={handleUpload}
            disabled={uploading || !selectedFile}
            className="w-full md:w-auto"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            Subir
          </Button>
        </div>
      </div>

      <Separator className="my-4" />

      {/* LISTA DE DOCUMENTOS */}
      <div className="space-y-4">
        <h3 className="font-medium text-sm flex items-center justify-between">
          Expediente Digital
          <span className="text-xs font-normal text-muted-foreground">
            {documents.length} archivos
          </span>
        </h3>

        {isLoadingDocs ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-10 border-2 border-dashed rounded-xl bg-slate-50">
            <FileText className="h-10 w-10 text-slate-300 mx-auto mb-2" />
            <p className="text-muted-foreground text-sm">
              No hay documentos subidos.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-3 bg-white border rounded-lg hover:shadow-md transition-shadow group"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="h-10 w-10 rounded bg-blue-50 flex items-center justify-center shrink-0">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate capitalize">
                      {doc.tipo_documento.replace("_", " ")}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {doc.nombre_archivo}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {new Date(doc.subido_en).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleView(doc.url_archivo)}
                    className="h-8 w-8 p-0 text-slate-500 hover:text-blue-600"
                    title="Ver / Descargar"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => requestDelete(doc)} //  ya no confirm()
                    className="h-8 w-8 p-0 text-slate-500 hover:text-red-600"
                    title="Eliminar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
