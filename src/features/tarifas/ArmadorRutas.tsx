import { useState, useMemo, useEffect } from "react";
import {
  Plus,
  Trash2,
  GripVertical,
  Route,
  Calculator,
  ArrowRight,
  MoreHorizontal,
  Edit,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ActionButton } from "@/components/ui/action-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TollBooth, RateTemplate } from "@/types/api.types";
import { useTiposUnidad } from "@/hooks/useTiposUnidad";
import { useRutasAutorizadas } from "@/hooks/useRutasAutorizadas";
import { useClients } from "@/hooks/useClients";
import { tollService, RateTemplateCreate } from "@/services/tollService";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  EnhancedDataTable,
  ColumnDef,
} from "@/components/ui/enhanced-data-table";

export const ArmadorRutas = () => {
  const { tiposActivos } = useTiposUnidad();
  const { rutasActivas } = useRutasAutorizadas();
  const { clients } = useClients();

  const [selectedCliente, setSelectedCliente] = useState("");
  const [rutaSeleccionada, setRutaSeleccionada] = useState("");
  const [origen, setOrigen] = useState("");
  const [destino, setDestino] = useState("");
  const [tipoUnidad, setTipoUnidad] = useState("");
  const [selectedTolls, setSelectedTolls] = useState<TollBooth[]>([]);
  const [allTolls, setAllTolls] = useState<TollBooth[]>([]);
  const [savedRoutes, setSavedRoutes] = useState<RateTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [routeToDelete, setRouteToDelete] = useState<RateTemplate | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const [tollsData, templatesData] = await Promise.all([
          tollService.getTolls(),
          tollService.getTemplates(),
        ]);
        setAllTolls(tollsData);
        setSavedRoutes(templatesData);
      } catch (e) {
        toast.error("Error al sincronizar con el servidor");
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  const handleRutaChange = (rutaId: string) => {
    setRutaSeleccionada(rutaId);
    const ruta = rutasActivas.find((r) => r.id === rutaId);
    if (ruta) {
      setOrigen(ruta.origen);
      setDestino(ruta.destino);
    }
  };

  const isFullUnit = useMemo(() => {
    const tipo = tiposActivos.find((t) => t.id === tipoUnidad);
    return (
      tipo?.nombre.toLowerCase().includes("full") ||
      tipo?.nombre.toLowerCase().includes("9 ejes")
    );
  }, [tipoUnidad, tiposActivos]);

  const costs = useMemo(() => {
    return selectedTolls.reduce(
      (acc, toll) => {
        if (isFullUnit) {
          acc.sencillo += toll.costo_9_ejes_sencillo;
          acc.full += toll.costo_9_ejes_full;
        } else {
          acc.sencillo += toll.costo_5_ejes_sencillo;
          acc.full += toll.costo_5_ejes_full;
        }
        return acc;
      },
      { sencillo: 0, full: 0 },
    );
  }, [selectedTolls, isFullUnit]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(amount);
  };

  const handleSaveRoute = async () => {
    if (!selectedCliente || !origen || !destino || !tipoUnidad) {
      toast.error("Completa los campos obligatorios");
      return;
    }

    const payload: RateTemplateCreate = {
      client_id: parseInt(selectedCliente),
      origen,
      destino,
      toll_unit_type: isFullUnit ? "9ejes" : "5ejes",
      toll_ids: selectedTolls.map((t) => t.id),
    };

    try {
      const result = await tollService.saveTemplate(payload);
      setSavedRoutes([result, ...savedRoutes]);
      toast.success("Tarifa guardada exitosamente");
      handleClearForm();
    } catch (e) {
      toast.error("Error al guardar la tarifa");
    }
  };

  const handleClearForm = () => {
    setSelectedCliente("");
    setRutaSeleccionada("");
    setOrigen("");
    setDestino("");
    setTipoUnidad("");
    setSelectedTolls([]);
  };

  const availableTolls = allTolls.filter(
    (t) => !selectedTolls.find((st) => st.id === t.id),
  );

  const columns: ColumnDef<RateTemplate>[] = useMemo(
    () => [
      { key: "cliente_nombre", header: "Cliente", sortable: true },
      {
        key: "origen",
        header: "Ruta",
        render: (_, row) => (
          <div className="flex items-center gap-2 font-medium">
            {row.origen} <ArrowRight className="h-3 w-3 opacity-50" />{" "}
            {row.destino}
          </div>
        ),
      },
      {
        key: "toll_unit_type",
        header: "Configuración",
        render: (val) => (
          <Badge
            variant="outline"
            className={val === "9ejes" ? "bg-amber-50" : "bg-blue-50"}
          >
            {val === "9ejes" ? "9 Ejes (Full)" : "5 Ejes"}
          </Badge>
        ),
      },
      {
        key: "costo_total_full",
        header: "Costo Total (Full)",
        render: (val) => (
          <span className="font-mono font-bold text-emerald-700">
            {formatCurrency(val as number)}
          </span>
        ),
      },
      {
        key: "id",
        header: "Acciones",
        render: (_, row) => (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setRouteToDelete(row);
              setDeleteDialogOpen(true);
            }}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        ),
      },
    ],
    [savedRoutes],
  );

  if (isLoading)
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin" />
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Route className="h-5 w-5" /> Armador de Ruta
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Cliente *</Label>
              <Select
                value={selectedCliente}
                onValueChange={setSelectedCliente}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id.toString()}>
                      {c.razon_social}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Origen *</Label>
                <Input
                  value={origen}
                  onChange={(e) => setOrigen(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Destino *</Label>
                <Input
                  value={destino}
                  onChange={(e) => setDestino(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tipo de Unidad *</Label>
              <Select value={tipoUnidad} onValueChange={setTipoUnidad}>
                <SelectTrigger>
                  <SelectValue placeholder="Configuración de ejes..." />
                </SelectTrigger>
                <SelectContent>
                  {tiposActivos.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full border-dashed">
                  <Plus className="h-4 w-4 mr-2" /> Agregar Caseta
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Casetas Disponibles</DialogTitle>
                </DialogHeader>
                <ScrollArea className="h-72 pr-4">
                  {availableTolls.map((t) => (
                    <div
                      key={t.id}
                      className="flex justify-between items-center p-3 border-b hover:bg-slate-50 cursor-pointer"
                      onClick={() => {
                        setSelectedTolls([...selectedTolls, t]);
                        setDialogOpen(false);
                      }}
                    >
                      <div>
                        <p className="text-sm font-bold">{t.nombre}</p>
                        <p className="text-xs text-muted-foreground">
                          {t.tramo}
                        </p>
                      </div>
                      <div className="text-right font-mono text-xs text-primary">
                        {formatCurrency(t.costo_5_ejes_sencillo)}
                      </div>
                    </div>
                  ))}
                </ScrollArea>
              </DialogContent>
            </Dialog>
            <div className="flex gap-2 pt-4">
              <Button
                variant="ghost"
                onClick={handleClearForm}
                className="flex-1"
              >
                Limpiar
              </Button>
              <ActionButton onClick={handleSaveRoute} className="flex-1">
                Guardar Tarifa
              </ActionButton>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>
                <Calculator className="h-5 w-5 inline mr-2" /> Casetas en Ruta
              </span>
              <Badge>{selectedTolls.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 min-h-[200px]">
              {selectedTolls.map((t, idx) => (
                <div
                  key={t.id}
                  className="flex items-center gap-3 p-2 bg-slate-50 border rounded-md group"
                >
                  <GripVertical className="h-4 w-4 text-slate-300" />
                  <div className="flex-1">
                    <p className="text-xs font-bold">{t.nombre}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {t.tramo}
                    </p>
                  </div>
                  <div className="font-mono text-xs">
                    {formatCurrency(
                      isFullUnit ? t.costo_9_ejes_full : t.costo_5_ejes_full,
                    )}
                  </div>
                  <button
                    onClick={() =>
                      setSelectedTolls(
                        selectedTolls.filter((st) => st.id !== t.id),
                      )
                    }
                  >
                    <Trash2 className="h-3 w-3 text-destructive opacity-0 group-hover:opacity-100" />
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-6 p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex justify-between items-center">
              <span className="text-xs font-bold text-emerald-800 uppercase">
                Costo Total Estimado
              </span>
              <span className="text-xl font-mono font-bold text-emerald-700">
                {formatCurrency(costs.full)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tarifas Vigentes</CardTitle>
        </CardHeader>
        <CardContent>
          <EnhancedDataTable data={savedRoutes} columns={columns} />
        </CardContent>
      </Card>
    </div>
  );
};
