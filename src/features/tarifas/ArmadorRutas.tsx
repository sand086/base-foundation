import { useState, useMemo } from "react";
import {
  Plus,
  Trash2,
  GripVertical,
  Route,
  Calculator,
  ArrowRight,
  MoreHorizontal,
  Edit,
  History,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ActionButton } from "@/components/ui/action-button";
import { Button } from "@/components/ui/button";
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
import {
  mockTollBooths,
  mockClientes,
  TollBooth,
  RouteTemplate,
  mockRouteTemplates,
} from "@/data/tarifasData";
import { useTiposUnidad } from "@/hooks/useTiposUnidad";
import { useRutasAutorizadas } from "@/hooks/useRutasAutorizadas";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  EnhancedDataTable,
  ColumnDef,
} from "@/components/ui/enhanced-data-table";

export const ArmadorRutas = () => {
  const { tiposActivos } = useTiposUnidad();
  const { rutasActivas } = useRutasAutorizadas();

  const [selectedCliente, setSelectedCliente] = useState("");
  const [rutaSeleccionada, setRutaSeleccionada] = useState("");
  const [origen, setOrigen] = useState("");
  const [destino, setDestino] = useState("");
  const [tipoUnidad, setTipoUnidad] = useState("");
  const [selectedTolls, setSelectedTolls] = useState<TollBooth[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [savedRoutes, setSavedRoutes] =
    useState<RouteTemplate[]>(mockRouteTemplates);
  const [editingRoute, setEditingRoute] = useState<RouteTemplate | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [routeToDelete, setRouteToDelete] = useState<RouteTemplate | null>(
    null,
  );

  // Handle route selection from catalog
  const handleRutaChange = (rutaId: string) => {
    setRutaSeleccionada(rutaId);
    const ruta = rutasActivas.find((r) => r.id === rutaId);
    if (ruta) {
      setOrigen(ruta.origen);
      setDestino(ruta.destino);
    }
  };

  // Calculate total cost based on selected tolls and unit type
  const costoTotal = useMemo(() => {
    const tipo = tiposActivos.find((t) => t.id === tipoUnidad);
    const esFull =
      tipo?.nombre.toLowerCase().includes("full") ||
      tipo?.nombre.toLowerCase().includes("9 ejes");

    return selectedTolls.reduce((total, toll) => {
      const costo = esFull ? toll.costo9EjesSencillo : toll.costo5EjesSencillo;
      return total + costo;
    }, 0);
  }, [selectedTolls, tipoUnidad, tiposActivos]);

  const costoTotalFull = useMemo(() => {
    const tipo = tiposActivos.find((t) => t.id === tipoUnidad);
    const esFull =
      tipo?.nombre.toLowerCase().includes("full") ||
      tipo?.nombre.toLowerCase().includes("9 ejes");

    return selectedTolls.reduce((total, toll) => {
      const costo = esFull ? toll.costo9EjesFull : toll.costo5EjesFull;
      return total + costo;
    }, 0);
  }, [selectedTolls, tipoUnidad, tiposActivos]);

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

  const handleSaveRoute = () => {
    if (!selectedCliente || !origen || !destino || !tipoUnidad) {
      toast.error("Completa todos los campos obligatorios");
      return;
    }

    const cliente = mockClientes.find((c) => c.id === selectedCliente);
    const tipo = tiposActivos.find((t) => t.id === tipoUnidad);

    const newRoute: RouteTemplate = {
      id: editingRoute?.id || `ruta-${Date.now()}`,
      clienteId: selectedCliente,
      clienteNombre: cliente?.nombre || "",
      origen: origen,
      destino: destino,
      tipoUnidad: tipo?.nombre.toLowerCase().includes("9") ? "9ejes" : "5ejes",
      casetas: selectedTolls.map((t) => t.id),
      costoTotal: costoTotalFull,
    };

    if (editingRoute) {
      setSavedRoutes(
        savedRoutes.map((r) => (r.id === editingRoute.id ? newRoute : r)),
      );
      toast.success("Tarifa actualizada correctamente");
    } else {
      setSavedRoutes([...savedRoutes, newRoute]);
      toast.success("Nueva tarifa guardada");
    }

    handleClearForm();
  };

  const handleClearForm = () => {
    setSelectedCliente("");
    setRutaSeleccionada("");
    setOrigen("");
    setDestino("");
    setTipoUnidad("");
    setSelectedTolls([]);
    setEditingRoute(null);
  };

  const handleEditRoute = (route: RouteTemplate) => {
    setEditingRoute(route);
    setSelectedCliente(route.clienteId);
    setOrigen(route.origen);
    setDestino(route.destino);

    // Find matching unit type
    const tipo = tiposActivos.find(
      (t) =>
        (route.tipoUnidad === "9ejes" &&
          (t.nombre.toLowerCase().includes("full") ||
            t.nombre.toLowerCase().includes("9"))) ||
        (route.tipoUnidad === "5ejes" &&
          !t.nombre.toLowerCase().includes("full") &&
          !t.nombre.toLowerCase().includes("9")),
    );
    setTipoUnidad(tipo?.id || "");

    // Load casetas
    const tolls = mockTollBooths.filter((t) => route.casetas.includes(t.id));
    setSelectedTolls(tolls);

    // Scroll to form
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteClick = (route: RouteTemplate) => {
    setRouteToDelete(route);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (routeToDelete) {
      setSavedRoutes(savedRoutes.filter((r) => r.id !== routeToDelete.id));
      toast.success("Tarifa eliminada");
      setRouteToDelete(null);
    }
    setDeleteDialogOpen(false);
  };

  const availableTolls = mockTollBooths.filter(
    (toll) => !selectedTolls.find((t) => t.id === toll.id),
  );

  // Table columns for saved routes with actions
  const columns: ColumnDef<RouteTemplate>[] = useMemo(
    () => [
      {
        key: "clienteNombre",
        header: "Client",
        sortable: true,
      },
      {
        key: "origen",
        header: "Ruta",
        sortable: true,
        render: (_, row) => (
          <div className="flex items-center gap-2">
            <span className="font-medium">{row.origen}</span>
            <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="font-medium">{row.destino}</span>
          </div>
        ),
      },
      {
        key: "tipoUnidad",
        header: "Tipo Unidad",
        type: "status",
        statusOptions: ["5ejes", "9ejes"],
        sortable: true,
        render: (value) => (
          <span
            className={cn(
              "px-2 py-1 rounded text-xs font-medium",
              value === "9ejes"
                ? "bg-amber-100 text-amber-800"
                : "bg-blue-100 text-blue-800",
            )}
          >
            {value === "9ejes" ? "9 Ejes (Full)" : "5 Ejes"}
          </span>
        ),
      },
      {
        key: "casetas",
        header: "Casetas",
        render: (value) => (
          <span className="text-sm">{(value as string[]).length} casetas</span>
        ),
      },
      {
        key: "costoTotal",
        header: "Costo Total",
        type: "number",
        sortable: true,
        render: (value) => (
          <span className="font-mono font-semibold text-emerald-700">
            {formatCurrency(value as number)}
          </span>
        ),
      },
      {
        key: "id",
        header: "Acciones",
        sortable: false,
        render: (_, row) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleEditRoute(row)}>
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => handleDeleteClick(row)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [savedRoutes],
  );

  return (
    <div className="space-y-6">
      {/* Form Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Side: Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-800">
              <Route className="h-5 w-5" />
              {editingRoute ? "Editar Tarifa" : "Nueva Tarifa de Ruta"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Client Selection */}
            <div className="space-y-2">
              <Label htmlFor="cliente">Client *</Label>
              <Select
                value={selectedCliente}
                onValueChange={setSelectedCliente}
              >
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

            {/* Route from Catalog or Manual */}
            <div className="space-y-2">
              <Label>Ruta del Catálogo (opcional)</Label>
              <Select value={rutaSeleccionada} onValueChange={handleRutaChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar ruta autorizada..." />
                </SelectTrigger>
                <SelectContent>
                  {rutasActivas.map((ruta) => (
                    <SelectItem key={ruta.id} value={ruta.id}>
                      <div className="flex items-center gap-2">
                        <span>{ruta.origen}</span>
                        <ArrowRight className="h-3 w-3" />
                        <span>{ruta.destino}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Origin / Destination Inputs */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="origen">Origen *</Label>
                <Input
                  id="origen"
                  placeholder="Ej: CDMX"
                  value={origen}
                  onChange={(e) => setOrigen(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="destino">Destino *</Label>
                <Input
                  id="destino"
                  placeholder="Ej: Veracruz Puerto"
                  value={destino}
                  onChange={(e) => setDestino(e.target.value)}
                />
              </div>
            </div>

            {/* Preview of Route Display */}
            {origen && destino && (
              <div className="p-3 bg-muted rounded-lg border">
                <p className="text-xs text-muted-foreground mb-1">
                  Vista previa de ruta:
                </p>
                <div className="flex items-center gap-2 font-semibold">
                  <span>{origen}</span>
                  <span className="text-primary">➝</span>
                  <span>{destino}</span>
                </div>
              </div>
            )}

            {/* Truck Type Selection */}
            <div className="space-y-2">
              <Label>Tipo de Unidad *</Label>
              <Select value={tipoUnidad} onValueChange={setTipoUnidad}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo..." />
                </SelectTrigger>
                <SelectContent>
                  {tiposActivos.map((tipo) => (
                    <SelectItem key={tipo.id} value={tipo.id}>
                      {tipo.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                            <p className="text-sm text-slate-500">
                              {toll.tramo}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-mono text-slate-700">
                              {formatCurrency(toll.costo5EjesSencillo)}
                            </p>
                            <p className="text-xs text-slate-400">
                              5 Ejes Sencillo
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Action Buttons */}
            <div className="flex gap-2">
              {editingRoute && (
                <Button
                  variant="outline"
                  onClick={handleClearForm}
                  className="flex-1"
                >
                  Cancelar
                </Button>
              )}
              <ActionButton
                className="flex-1"
                disabled={
                  !selectedCliente || !origen || !destino || !tipoUnidad
                }
                onClick={handleSaveRoute}
              >
                {editingRoute ? "Actualizar Tarifa" : "Guardar Tarifa"}
              </ActionButton>
            </div>
          </CardContent>
        </Card>

        {/* Right Side: Toll List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-slate-800">
              <span className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Lista de Casetas
              </span>
              <span className="text-sm font-normal text-slate-500">
                {selectedTolls.length} caseta
                {selectedTolls.length !== 1 ? "s" : ""}
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
                      <span className="text-xs font-medium w-5">
                        {index + 1}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">
                        {toll.nombre}
                      </p>
                      <p className="text-xs text-slate-500">{toll.tramo}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-mono font-semibold text-slate-800">
                        {formatCurrency(toll.costo5EjesSencillo)}
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
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Saved Routes Table */}
      <Card>
        <CardHeader>
          <CardTitle>Tarifas Guardadas</CardTitle>
        </CardHeader>
        <CardContent>
          <EnhancedDataTable
            data={savedRoutes}
            columns={columns}
            exportFileName="tarifas"
          />
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta tarifa?</AlertDialogTitle>
            <AlertDialogDescription>
              {routeToDelete && (
                <>
                  Estás a punto de eliminar la tarifa de la ruta{" "}
                  <strong>
                    {routeToDelete.origen} ➝ {routeToDelete.destino}
                  </strong>{" "}
                  para el cliente <strong>{routeToDelete.clienteNombre}</strong>
                  .
                  <br />
                  <br />
                  Esta acción no se puede deshacer.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
