import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface ServiceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  // Pasamos los servicios reales (recentServices) para filtrar
  data: any[];
}

export function ServiceDetailModal({
  isOpen,
  onClose,
  title,
  data,
}: ServiceDetailModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold uppercase tracking-tight">
            Desglose: {title}
          </DialogTitle>
        </DialogHeader>

        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="font-bold">ID</TableHead>
              <TableHead className="font-bold">Cliente</TableHead>
              <TableHead className="font-bold">Estatus</TableHead>
              <TableHead className="font-bold text-right">Monto</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item, i) => (
              <TableRow key={i}>
                <TableCell className="font-mono text-xs">
                  {item.id || `S-${i}`}
                </TableCell>
                <TableCell className="font-medium uppercase text-xs">
                  {item.client || item.name}
                </TableCell>
                <TableCell>
                  <Badge variant={item.value > 0 ? "outline" : "destructive"}>
                    {item.name}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-bold">
                  {new Intl.NumberFormat("es-MX", {
                    style: "currency",
                    currency: "MXN",
                  }).format(item.value || 0)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DialogContent>
    </Dialog>
  );
}
