// src/features/monitoreo/UpdateStatusModal.tsx
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MapPin, Navigation, MessageSquare, Mail, Clock } from "lucide-react";
import { toast } from "sonner";

interface UpdateStatusModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceId: string;
  onSubmit: (data: StatusUpdateData) => void;
}

export interface StatusUpdateData {
  status: string;
  location: string;
  lat?: string;
  lng?: string;
  comments: string;
  notifyClient: boolean;
  timestamp: string;
}

// ✅ CORRECCIÓN: Los 'value' ahora coinciden EXACTAMENTE con tu backend (TripStatus)
const statusOptions = [
  { value: "en_transito", label: "En Tránsito", color: "bg-blue-500" },
  { value: "detenido", label: "Detenido", color: "bg-amber-500" },
  { value: "retraso", label: "Retraso", color: "bg-orange-500" },
  { value: "accidente", label: "Accidente", color: "bg-red-600" },
  { value: "entregado", label: "Entregado", color: "bg-emerald-500" },
];

export function UpdateStatusModal({
  open,
  onOpenChange,
  serviceId,
  onSubmit,
}: UpdateStatusModalProps) {
  const [formData, setFormData] = useState<StatusUpdateData>({
    status: "",
    location: "",
    lat: "",
    lng: "",
    comments: "",
    notifyClient: false, // Por defecto apagado para no simular spam
    timestamp: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Generar timestamp actual
    const now = new Date();
    const timestamp = now.toISOString(); // Enviamos formato ISO para la BD

    onSubmit({
      ...formData,
      timestamp,
    });

    if (formData.notifyClient) {
      toast.success("Correo enviado al cliente", {
        description: `Notificación de estatus enviada exitosamente.`,
      });
    }

    // Resetear formulario
    setFormData({
      status: "",
      location: "",
      lat: "",
      lng: "",
      comments: "",
      notifyClient: false,
      timestamp: "",
    });
  };

  const selectedStatus = statusOptions.find((s) => s.value === formData.status);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-brand-dark">
            <Clock className="h-5 w-5" />
            Actualizar Bitácora - {serviceId}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-4">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <Navigation className="h-3 w-3" />
              Nuevo Estatus
            </Label>
            <Select
              value={formData.status}
              onValueChange={(value) =>
                setFormData({ ...formData, status: value })
              }
              required
            >
              <SelectTrigger className="h-10 text-sm">
                <SelectValue placeholder="Seleccionar estatus">
                  {selectedStatus && (
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${selectedStatus.color}`}
                      />
                      {selectedStatus.label}
                    </div>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-white">
                {statusOptions.map((status) => (
                  <SelectItem
                    key={status.value}
                    value={status.value}
                    className="text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${status.color}`}
                      />
                      {status.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <MapPin className="h-3 w-3" />
              Ubicación / Referencia
            </Label>
            <Textarea
              placeholder="Ej: Caseta de Tepotzotlán, Km 45 Autopista México-Qro"
              value={formData.location}
              onChange={(e) =>
                setFormData({ ...formData, location: e.target.value })
              }
              rows={2}
              className="text-sm resize-none"
              required
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <MessageSquare className="h-3 w-3" />
              Comentarios Adicionales
            </Label>
            <Textarea
              placeholder="Notas internas o motivo del retraso..."
              value={formData.comments}
              onChange={(e) =>
                setFormData({ ...formData, comments: e.target.value })
              }
              rows={2}
              className="text-sm resize-none"
            />
          </div>

          <div className="flex items-center space-x-3 p-3 rounded-lg bg-slate-50 border">
            <Checkbox
              id="notifyClient"
              checked={formData.notifyClient}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, notifyClient: checked as boolean })
              }
            />
            <Label
              htmlFor="notifyClient"
              className="text-sm flex items-center gap-2 cursor-pointer"
            >
              <Mail className="h-4 w-4 text-muted-foreground" />
              Notificar al Cliente por Correo
            </Label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-9 text-sm"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="h-9 text-sm bg-brand-navy hover:bg-brand-navy/90 text-white"
              disabled={!formData.status || !formData.location}
            >
              Guardar en Bitácora
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
