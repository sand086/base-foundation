import { useState, useEffect } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Phone, Mail, FileText, Wrench } from "lucide-react";

import { MechanicFormModal } from "@/features/mechanics/MechanicFormModal";
import { MechanicExpedienteModal } from "@/features/mechanics/MechanicExpedienteModal";
import { mechanicService } from "@/services/mechanicService";
import { Mechanic } from "@/types/api.types";

import { EnhancedDataTable } from "@/components/ui/enhanced-data-table";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function Mecanicos() {
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Estados para los Modales
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isExpedienteOpen, setIsExpedienteOpen] = useState(false);
  const [selectedMechanic, setSelectedMechanic] = useState<Mechanic | null>(
    null,
  );

  const fetchMechanics = async () => {
    setIsLoading(true);
    try {
      const data = await mechanicService.getAll();
      setMechanics(data);
    } catch (error) {
      console.error(error);
      toast.error("Error al cargar la lista de mecánicos");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMechanics();
  }, []);

  const handleCreate = () => {
    setSelectedMechanic(null);
    setIsFormOpen(true);
  };

  const handleEdit = (mechanic: Mechanic) => {
    setSelectedMechanic(mechanic);
    setIsFormOpen(true);
  };

  const handleOpenExpediente = (mechanic: Mechanic) => {
    setSelectedMechanic(mechanic);
    setIsExpedienteOpen(true);
  };

  const handleSave = async (data: any) => {
    try {
      if (selectedMechanic && isFormOpen) {
        // Modo Edición
        await mechanicService.update(selectedMechanic.id, data);
        toast.success("Mecánico actualizado");
      } else {
        // Modo Creación
        await mechanicService.create(data);
        toast.success("Mecánico creado exitosamente");
      }
      fetchMechanics(); // Recargar tabla
      return true;
    } catch (error) {
      console.error(error);
      toast.error("Error al guardar");
      return false;
    }
  };

  const columns = [
    {
      key: "nombre_completo",
      header: "Mecánico",
      render: (_: any, row: Mechanic) => (
        <div className="flex items-center gap-3">
          {/* Avatar simple */}
          <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center border shrink-0">
            <Wrench className="h-5 w-5 text-slate-500" />
          </div>
          <div className="flex flex-col">
            <span className="font-medium">
              {row.nombre} {row.apellido}
            </span>
            <span className="text-xs text-muted-foreground">
              {row.especialidad || "General"}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "contacto",
      header: "Contacto",
      render: (_: any, row: Mechanic) => (
        <div className="flex flex-col text-sm space-y-1">
          {row.telefono && (
            <div className="flex items-center gap-1.5">
              <Phone className="h-3 w-3 text-slate-400" /> {row.telefono}
            </div>
          )}
          {row.email && (
            <div className="flex items-center gap-1.5">
              <Mail className="h-3 w-3 text-slate-400" /> {row.email}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "laboral",
      header: "Datos",
      render: (_: any, row: Mechanic) => (
        <div className="flex flex-col text-xs text-muted-foreground">
          {row.nss && <span>NSS: {row.nss}</span>}
          {row.rfc && <span>RFC: {row.rfc}</span>}
        </div>
      ),
    },
    {
      key: "activo",
      header: "Estado",
      render: (val: boolean) => (
        <Badge
          variant={val ? "default" : "secondary"}
          className={
            val
              ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-emerald-200"
              : ""
          }
        >
          {val ? "Activo" : "Inactivo"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Acciones",
      render: (_: any, row: Mechanic) => (
        <div className="flex gap-2">
          {/* BOTÓN EXPEDIENTE */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenExpediente(row)}
                  className="h-8 w-8 p-0 text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100"
                >
                  <FileText className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Ver Expediente / Documentos</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* BOTÓN EDITAR */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEdit(row)}
            className="h-8 w-8 p-0"
          >
            <Edit className="h-4 w-4 text-slate-500" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Administración de Mecánicos"
        description="Gestión de personal técnico y expedientes"
        actions={
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" /> Nuevo Mecánico
          </Button>
        }
      />

      <EnhancedDataTable
        columns={columns}
        data={mechanics}
        isLoading={isLoading}
        searchPlaceholder="Buscar mecánico..."
      />

      {/* Modal de Formulario (Crear/Editar) */}
      <MechanicFormModal
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        mechanicToEdit={selectedMechanic}
        onSave={handleSave}
      />

      {/* Modal de Documentos (Expediente) */}
      <MechanicExpedienteModal
        open={isExpedienteOpen}
        onOpenChange={setIsExpedienteOpen}
        mechanic={selectedMechanic}
      />
    </div>
  );
}
