import { useState, useMemo } from "react";
import { Plus, Trash2, GripVertical, Route, Calculator } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ActionButton } from "@/components/ui/action-button";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
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
import { mockTollBooths, mockClientes, TollBooth } from "@/data/tarifasData";
import { cn } from "@/lib/utils";

export const ArmadorRutas = () => {
  const [selectedCliente, setSelectedCliente] = useState("");
  const [nombreRuta, setNombreRuta] = useState("");
  const [tipoUnidad, setTipoUnidad] = useState<"5ejes" | "9ejes">("5ejes");
  const [selectedTolls, setSelectedTolls] = useState<TollBooth[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Calculate total cost based on selected tolls and unit type
  const costoTotal = useMemo(() => {
    return selectedTolls.reduce((total, toll) => {
      const costo =
        tipoUnidad === "5ejes"
          ? toll.costo5EjesSencillo
          : toll.costo9EjesSencillo;
      return total + costo;
    }, 0);
  }, [selectedTolls, tipoUnidad]);

  const costoTotalFull = useMemo(() => {
    return selectedTolls.reduce((total, toll) => {
      const costo =
        tipoUnidad === "5ejes" ? toll.costo5EjesFull : toll.costo9EjesFull;
      return total + costo;
    }, 0);
  }, [selectedTolls, tipoUnidad]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(amount);
  };

  const handleAddToll = (toll: TollBooth) => {
    if (!selectedTolls.find((t) => t.id === toll.id)) {
      setSelectedTolls([...selectedTolls, toll]);
    }
    setDialogOpen(false);
  };

  const handleRemoveToll = (tollId: string) => {
    setSelectedTolls(selectedTolls.filter((t) => t.id !== tollId));
  };

  const availableTolls = mockTollBooths.filter(
    (toll) => !selectedTolls.find((t) => t.id === toll.id)
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left Side: Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-800">
            <Route className="h-5 w-5" />
            Configuración de Ruta
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Cliente Selection */}
          <div className="space-y-2">
            <Label htmlFor="cliente">Cliente</Label>
            <Select value={selectedCliente} onValueChange={setSelectedCliente}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar cliente..." />
              </SelectTrigger>
              <SelectContent>
                {mockClientes.map((cliente) => (
                  <SelectItem key={cliente.id} value={cliente.id}>
                    {cliente.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Route Name */}
          <div className="space-y-2">
            <Label htmlFor="nombreRuta">Nombre de la Ruta</Label>
            <Input
              id="nombreRuta"
              placeholder="Ej: CDMX - Veracruz Puerto"
              value={nombreRuta}
              onChange={(e) => setNombreRuta(e.target.value)}
            />
          </div>

          {/* Truck Type Toggle */}
          <div className="space-y-3">
            <Label>Tipo de Unidad</Label>
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border">
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "text-sm font-medium transition-colors",
                    tipoUnidad === "5ejes"
                      ? "text-emerald-700"
                      : "text-slate-400"
                  )}
                >
                  5 Ejes
                </span>
                <Switch
                  checked={tipoUnidad === "9ejes"}
                  onCheckedChange={(checked) =>
                    setTipoUnidad(checked ? "9ejes" : "5ejes")
                  }
                />
                <span
                  className={cn(
                    "text-sm font-medium transition-colors",
                    tipoUnidad === "9ejes"
                      ? "text-emerald-700"
                      : "text-slate-400"
                  )}
                >
                  9 Ejes
                </span>
              </div>
              <span className="text-xs text-slate-500 bg-white px-2 py-1 rounded">
                {tipoUnidad === "5ejes" ? "Tractocamión" : "Full (Doble Remolque)"}
              </span>
            </div>
          </div>

          {/* Add Toll Button */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full border-dashed">
                <Plus className="h-4 w-4 mr-2" />
                Agregar Caseta
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Seleccionar Caseta del Catálogo</DialogTitle>
              </DialogHeader>
              <div className="max-h-96 overflow-y-auto">
                <div className="space-y-2">
                  {availableTolls.length === 0 ? (
                    <p className="text-center text-slate-500 py-8">
                      Todas las casetas ya han sido agregadas
                    </p>
                  ) : (
                    availableTolls.map((toll) => (
                      <div
                        key={toll.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                        onClick={() => handleAddToll(toll)}
                      >
                        <div>
                          <p className="font-medium text-slate-900">
                            {toll.nombre}
                          </p>
                          <p className="text-sm text-slate-500">{toll.tramo}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-mono text-slate-700">
                            {tipoUnidad === "5ejes"
                              ? formatCurrency(toll.costo5EjesSencillo)
                              : formatCurrency(toll.costo9EjesSencillo)}
                          </p>
                          <p className="text-xs text-slate-400">Sencillo</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Save Button */}
          <ActionButton className="w-full" disabled={selectedTolls.length === 0}>
            Guardar Ruta
          </ActionButton>
        </CardContent>
      </Card>

      {/* Right Side: Route List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-slate-800">
            <span className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Lista de Casetas
            </span>
            <span className="text-sm font-normal text-slate-500">
              {selectedTolls.length} caseta{selectedTolls.length !== 1 ? "s" : ""}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedTolls.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Route className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No hay casetas agregadas</p>
              <p className="text-sm">
                Usa el botón "Agregar Caseta" para comenzar
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedTolls.map((toll, index) => (
                <div
                  key={toll.id}
                  className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border group"
                >
                  <div className="flex items-center gap-2 text-slate-400">
                    <GripVertical className="h-4 w-4" />
                    <span className="text-xs font-medium w-5">{index + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 truncate">
                      {toll.nombre}
                    </p>
                    <p className="text-xs text-slate-500">{toll.tramo}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono font-semibold text-slate-800">
                      {tipoUnidad === "5ejes"
                        ? formatCurrency(toll.costo5EjesSencillo)
                        : formatCurrency(toll.costo9EjesSencillo)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRemoveToll(toll.id)}
                    className="p-1.5 hover:bg-red-100 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Cost Summary */}
          {selectedTolls.length > 0 && (
            <div className="mt-6 pt-4 border-t space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">
                  Costo Sencillo (Ida)
                </span>
                <span className="text-lg font-mono font-semibold text-slate-800">
                  {formatCurrency(costoTotal)}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                <span className="text-sm font-medium text-emerald-800">
                  Costo Total Estimado (Full)
                </span>
                <span className="text-xl font-mono font-bold text-emerald-700">
                  {formatCurrency(costoTotalFull)}
                </span>
              </div>
              <p className="text-xs text-slate-500 text-center">
                El costo se actualiza automáticamente al cambiar el tipo de unidad
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
