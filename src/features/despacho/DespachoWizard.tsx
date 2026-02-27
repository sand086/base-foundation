import { useState, useMemo } from "react";
import {
  Check,
  ChevronRight,
  AlertTriangle,
  MapPin,
  Truck,
  FileText,
  ShieldAlert,
  Container,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ActionButton } from "@/components/ui/action-button";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/ui/status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

// Hooks Reales
import { useUnits } from "@/hooks/useUnits";
import { useOperators } from "@/hooks/useOperators";
import { useTrips } from "@/hooks/useTrips";

// Tipos
import { TripCreatePayload } from "@/types/api.types";

// Mocks Temporales (Hasta que tengas tu useClients)
import {
  mockDispatchClientes,
  mockSubClientes,
  mockDispatchRoutes,
} from "@/data/despachoData";

export const DespachoWizard = () => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Hooks de datos reales
  const { unidades } = useUnits();
  const { operadores } = useOperators();
  const { createTrip } = useTrips();

  // Solo traemos los que están "disponibles" / "activos"
  const availableUnits = useMemo(
    () => unidades.filter((u) => u.status === "disponible"),
    [unidades],
  );
  const availableOperators = useMemo(
    () => operadores.filter((o) => o.status === "activo"),
    [operadores],
  );

  const [data, setData] = useState({
    clienteId: "",
    clienteNombre: "",
    subClienteId: "",
    subClienteNombre: "",
    subClienteDireccion: "",
    routeId: "",
    routeNombre: "",
    origen: "",
    destino: "",
    unitId: "",
    unitNumero: "",
    unitTipo: "5ejes",
    driverId: "",
    driverNombre: "",
    precio: 0,
    anticipo_casetas: 0,
    anticipo_viaticos: 0,
    anticipo_combustible: 0,
    remolque1Id: "",
    remolque1Numero: "",
    dollyId: "",
    dollyNumero: "",
    remolque2Id: "",
    remolque2Numero: "",
  });

  const availableSubClientes = useMemo(
    () => mockSubClientes.filter((s) => s.clienteId === data.clienteId),
    [data.clienteId],
  );
  const availableRoutes = useMemo(
    () => mockDispatchRoutes.filter((r) => r.clienteId === data.clienteId),
    [data.clienteId],
  );

  const handleCreate = async () => {
    // Armamos el payload EXACTO como lo pide FastAPI (sin status)
    const payload: TripCreatePayload = {
      client_id: parseInt(data.clienteId),
      sub_client_id: parseInt(data.subClienteId),
      unit_id: parseInt(data.unitId),
      operator_id: parseInt(data.driverId),
      origin: data.origen,
      destination: data.destino,
      route_name: data.routeNombre,
      tarifa_base: data.precio,
      anticipo_casetas: data.anticipo_casetas,
      anticipo_viaticos: data.anticipo_viaticos,
      anticipo_combustible: data.anticipo_combustible,
      start_date: new Date().toISOString(),
      // QUITAR O BORRAR LA LÍNEA DE STATUS AQUÍ
    };

    const success = await createTrip(payload);
    if (success) {
      setTimeout(() => {
        window.location.reload(); // Recarga para vaciar el wizard y mostrar el planificador
      }, 1000);
    }
  };

  const isStep1Valid = data.clienteId && data.subClienteId && data.routeId;
  const isStep2Valid = data.unitId && data.driverId;

  return (
    <Card>
      <CardContent className="pt-6 space-y-6">
        {/* PROGRESS BAR SIMPLIFICADO */}
        <div className="flex gap-2 mb-6">
          <Badge variant={currentStep >= 1 ? "default" : "outline"}>
            1. Ruta
          </Badge>
          <Badge variant={currentStep >= 2 ? "default" : "outline"}>
            2. Recursos
          </Badge>
          <Badge variant={currentStep === 3 ? "default" : "outline"}>
            3. Finanzas y Confirmar
          </Badge>
        </div>

        {/* STEP 1 */}
        {currentStep === 1 && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select
                value={data.clienteId}
                onValueChange={(v) => setData({ ...data, clienteId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  {mockDispatchClientes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>SubCliente (Destino)</Label>
              <Select
                disabled={!data.clienteId}
                value={data.subClienteId}
                onValueChange={(v) => setData({ ...data, subClienteId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  {availableSubClientes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Ruta y Tarifa</Label>
              <Select
                disabled={!data.clienteId}
                value={data.routeId}
                onValueChange={(v) => {
                  const route = mockDispatchRoutes.find((r) => r.id === v);
                  setData({
                    ...data,
                    routeId: v,
                    origen: route?.origen || "",
                    destino: route?.destino || "",
                    routeNombre: route?.nombre || "",
                    tarifa_base: route?.precio5Ejes || 0,
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  {availableRoutes.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.nombre} - ${r.precio5Ejes}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* STEP 2 */}
        {currentStep === 2 && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Unidad (Tractocamión) de BD Real</Label>
              <Select
                value={data.unitId}
                onValueChange={(v) => setData({ ...data, unitId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  {availableUnits.map((u) => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {u.numero_economico} - {u.placas}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Operador de BD Real</Label>
              <Select
                value={data.driverId}
                onValueChange={(v) => setData({ ...data, driverId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  {availableOperators.map((o) => (
                    <SelectItem key={o.id} value={String(o.id)}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* STEP 3 */}
        {currentStep === 3 && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tarifa Base a Cobrar</Label>
              <Input
                type="number"
                disabled
                value={data.tarifa_base}
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label>Anticipo Casetas</Label>
              <Input
                type="number"
                value={data.anticipo_casetas}
                onChange={(e) =>
                  setData({
                    ...data,
                    anticipo_casetas: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Anticipo Diésel</Label>
              <Input
                type="number"
                value={data.anticipo_combustible}
                onChange={(e) =>
                  setData({
                    ...data,
                    anticipo_combustible: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Viáticos Operador</Label>
              <Input
                type="number"
                value={data.anticipo_viaticos}
                onChange={(e) =>
                  setData({
                    ...data,
                    anticipo_viaticos: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>
          </div>
        )}

        {/* NAVEGACIÓN */}
        <div className="flex justify-between pt-6 border-t mt-4">
          <Button
            variant="outline"
            onClick={() => setCurrentStep((p) => (p - 1) as 1 | 2 | 3)}
            disabled={currentStep === 1}
          >
            Atrás
          </Button>
          {currentStep < 3 ? (
            <ActionButton
              onClick={() => setCurrentStep((p) => (p + 1) as 1 | 2 | 3)}
              disabled={
                (currentStep === 1 && !isStep1Valid) ||
                (currentStep === 2 && !isStep2Valid)
              }
            >
              Siguiente <ChevronRight className="h-4 w-4 ml-1" />
            </ActionButton>
          ) : (
            <ActionButton
              onClick={handleCreate}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Check className="h-4 w-4 mr-2" /> Despachar Viaje
            </ActionButton>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
