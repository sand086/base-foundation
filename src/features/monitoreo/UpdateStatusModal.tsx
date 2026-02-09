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

const statusOptions = [
  { value: "en_ruta", label: "En Ruta", color: "bg-status-success" },
  { value: "detenido", label: "Detenido", color: "bg-status-warning" },
  { value: "retraso", label: "Retraso", color: "bg-status-danger" },
  { value: "accidente", label: "Accidente", color: "bg-status-danger" },
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
    notifyClient: true,
    timestamp: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const now = new Date();
    const timestamp = now.toLocaleString("es-MX", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const selectedStatusLabel =
      statusOptions.find((s) => s.value === formData.status)?.label ||
      formData.status;

    onSubmit({
      ...formData,
      timestamp,
    });

    // Simulate email notification if enabled
    if (formData.notifyClient) {
      // In real implementation, this would trigger an actual email
      toast.success("Correo enviado al cliente", {
        description: `Tu unidad [${serviceId}] está en [${formData.location}] - ${selectedStatusLabel}`,
        duration: 5000,
      });
    }

    // Reset form
    setFormData({
      status: "",
      location: "",
      lat: "",
      lng: "",
      comments: "",
      notifyClient: true,
      timestamp: "",
    });
    onOpenChange(false);
  };

  const selectedStatus = statusOptions.find((s) => s.value === formData.status);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-brand-dark">
            <Clock className="h-5 w-5" />
            Bitácora de Viaje - {serviceId}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-4">
          {/* Status Dropdown */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <Navigation className="h-3 w-3" />
              Estatus
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
              <SelectContent className="bg-card">
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

          {/* Location Text Area */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <MapPin className="h-3 w-3" />
              Ubicación Manual
            </Label>
            <Textarea
              placeholder="Paste GPS location text here (e.g., Km 45 Autopista México-Qro)"
              value={formData.location}
              onChange={(e) =>
                setFormData({ ...formData, location: e.target.value })
              }
              rows={3}
              className="text-sm resize-none"
              required
            />
          </div>

          {/* Coordinates (Optional) */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Coordenadas (Opcional)
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label
                  htmlFor="lat"
                  className="text-[10px] text-muted-foreground"
                >
                  Latitud
                </Label>
                <Input
                  id="lat"
                  type="text"
                  placeholder="19.4326"
                  value={formData.lat}
                  onChange={(e) =>
                    setFormData({ ...formData, lat: e.target.value })
                  }
                  className="h-9 text-sm font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label
                  htmlFor="lng"
                  className="text-[10px] text-muted-foreground"
                >
                  Longitud
                </Label>
                <Input
                  id="lng"
                  type="text"
                  placeholder="-99.1332"
                  value={formData.lng}
                  onChange={(e) =>
                    setFormData({ ...formData, lng: e.target.value })
                  }
                  className="h-9 text-sm font-mono"
                />
              </div>
            </div>
          </div>

          {/* Comments */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <MessageSquare className="h-3 w-3" />
              Comentarios
            </Label>
            <Textarea
              placeholder="Notas internas sobre la actualización..."
              value={formData.comments}
              onChange={(e) =>
                setFormData({ ...formData, comments: e.target.value })
              }
              rows={2}
              className="text-sm resize-none"
            />
          </div>

          {/* Notify Client Checkbox */}
          <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50 border">
            <Checkbox
              id="notifyClient"
              checked={formData.notifyClient}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, notifyClient: checked as boolean })
              }
              className="data-[state=checked]:bg-brand-green data-[state=checked]:border-brand-green"
            />
            <Label
              htmlFor="notifyClient"
              className="text-sm flex items-center gap-2 cursor-pointer"
            >
              <Mail className="h-4 w-4 text-muted-foreground" />
              Notificar al Client por Correo
            </Label>
          </div>

          {/* Action Buttons */}
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
              className="h-9 text-sm bg-brand-green hover:bg-brand-green/90 text-white"
              disabled={!formData.status || !formData.location}
            >
              Guardar Actualización
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
