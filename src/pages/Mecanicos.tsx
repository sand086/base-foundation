import { useState, useEffect } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { toast } from "sonner";

// Importamos nuestros componentes modulares
import { MechanicsTable } from "@/features/mechanics/MechanicsTable";
import { MechanicFormModal } from "@/features/mechanics/MechanicFormModal";
import { MechanicExpedienteModal } from "@/features/mechanics/MechanicExpedienteModal";

// Servicios y Tipos
import { mechanicService } from "@/services/mechanicService";
import { Mechanic } from "@/types/api.types";

export default function MechanicsPage() {
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
      toast.error("Error al cargar mecánicos");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMechanics();
  }, []);

  // Handlers
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
      if (selectedMechanic) {
        await mechanicService.update(selectedMechanic.id, data);
        toast.success("Mecánico actualizado");
      } else {
        await mechanicService.create(data);
        toast.success("Mecánico creado");
      }
      fetchMechanics();
      return true;
    } catch (error) {
      toast.error("Error al guardar");
      return false;
    }
  };

  return (
    <div className="space-y-6">
      {/* CORRECCIÓN AQUÍ: Quitamos el "/>" y dejamos solo ">" */}
      <PageHeader
        title="Administración de Mecánicos"
        description="Gestión de personal técnico y expedientes"
      >
        {/* Ahora el botón es un hijo directo */}
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" /> Nuevo Mecánico
        </Button>
      </PageHeader>

      <MechanicsTable
        data={mechanics}
        isLoading={isLoading}
        onEdit={handleEdit}
        onOpenExpediente={handleOpenExpediente}
      />

      <MechanicFormModal
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        mechanicToEdit={selectedMechanic}
        onSave={handleSave}
      />

      <MechanicExpedienteModal
        open={isExpedienteOpen}
        onOpenChange={setIsExpedienteOpen}
        mechanic={selectedMechanic}
      />
    </div>
  );
}
