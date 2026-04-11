import { useMemo, useState } from "react";
import {
  Search,
  Plus,
  Eye,
  Edit,
  MoreHorizontal,
  Trash2,
  AlertCircle,
} from "lucide-react";

import { PageHeader } from "@/components/ui/page-header";
import { ActionButton } from "@/components/ui/action-button";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  DataTable,
  DataTableHeader,
  DataTableBody,
  DataTableRow,
  DataTableHead,
  DataTableCell,
} from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

import { SupplierModal } from "@/features/suppliers/components/SupplierModal";
import { SupplierDetailSheet } from "@/features/suppliers/components/SupplierDetailSheet";
import { useSuppliers } from "@/features/suppliers/hooks/useSuppliers";
import { Supplier } from "@/features/suppliers/types";
import { useSystemConfig } from "@/features/settings/hooks/useSystemConfig";

const safeLower = (v: unknown) =>
  typeof v === "string" ? v.toLowerCase() : "";

export default function SuppliersCatalog() {
  const { valueAsNumber: defaultCredito } = useSystemConfig(
    "dias_credito_default",
  );

  const {
    suppliers,
    isLoadingSuppliers,
    createSupplier,
    updateSupplier,
    deleteSupplier,
  } = useSuppliers();

  const [searchCatalog, setSearchCatalog] = useState("");

  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [isSupplierDetailOpen, setIsSupplierDetailOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(
    null,
  );
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(
    null,
  );

  const filteredSuppliers = useMemo(() => {
    const q = safeLower(searchCatalog);
    return suppliers.filter(
      (s) =>
        safeLower(s.razon_social).includes(q) || safeLower(s.rfc).includes(q),
    );
  }, [suppliers, searchCatalog]);

  const handleConfirmDeleteSupplier = async () => {
    if (!supplierToDelete) return;
    const ok = await deleteSupplier(supplierToDelete.id);
    if (ok) {
      setIsDeleteDialogOpen(false);
      setSupplierToDelete(null);
    }
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      <PageHeader
        title="Catálogo de Proveedores"
        description="Directorio centralizado de proveedores de servicios y refacciones."
      />

      <Card className="shadow-sm border-slate-200">
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
              <Input
                placeholder="Buscar por razón social o RFC..."
                value={searchCatalog}
                onChange={(e) => setSearchCatalog(e.target.value)}
                className="pl-10 h-11"
              />
            </div>
            <ActionButton
              className="w-full sm:w-auto"
              onClick={() => {
                setEditingSupplier(null);
                setIsSupplierModalOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" /> Nuevo Proveedor
            </ActionButton>
          </div>

          {isLoadingSuppliers ? (
            <div className="text-sm text-muted-foreground p-8 text-center">
              Cargando proveedores...
            </div>
          ) : (
            <div className="rounded-xl border overflow-hidden">
              <DataTable>
                <DataTableHeader>
                  <DataTableRow className="bg-slate-50">
                    <DataTableHead>ID</DataTableHead>
                    <DataTableHead>Razón Social</DataTableHead>
                    <DataTableHead>RFC</DataTableHead>
                    <DataTableHead>Contacto</DataTableHead>
                    <DataTableHead>Teléfono</DataTableHead>
                    <DataTableHead>Estatus</DataTableHead>
                  </DataTableRow>
                </DataTableHeader>
                <DataTableBody>
                  {filteredSuppliers.map((supplier) => (
                    <DataTableRow key={supplier.id}>
                      <DataTableCell className="font-mono text-xs">
                        {supplier.id}
                      </DataTableCell>
                      <DataTableCell className="font-medium text-brand-navy">
                        {supplier.razon_social}
                      </DataTableCell>
                      <DataTableCell className="font-mono text-xs">
                        {supplier.rfc}
                      </DataTableCell>
                      <DataTableCell>
                        {supplier.contacto_principal || "—"}
                      </DataTableCell>
                      <DataTableCell>{supplier.telefono || "—"}</DataTableCell>
                      <DataTableCell>
                        <div className="flex items-center gap-2">
                          <StatusBadge
                            status={
                              supplier.estatus === "activo"
                                ? "success"
                                : "warning"
                            }
                          >
                            {supplier.estatus === "activo"
                              ? "Activo"
                              : "Inactivo"}
                          </StatusBadge>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 ml-auto"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="bg-card"
                            >
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedSupplier(supplier);
                                  setIsSupplierDetailOpen(true);
                                }}
                              >
                                <Eye className="h-4 w-4 mr-2 text-blue-600" />{" "}
                                Ver Detalle
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditingSupplier(supplier);
                                  setIsSupplierModalOpen(true);
                                }}
                              >
                                <Edit className="h-4 w-4 mr-2 text-emerald-600" />{" "}
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  setSupplierToDelete(supplier);
                                  setIsDeleteDialogOpen(true);
                                }}
                                className="text-status-danger focus:text-status-danger"
                              >
                                <Trash2 className="h-4 w-4 mr-2" /> Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </DataTableCell>
                    </DataTableRow>
                  ))}
                </DataTableBody>
              </DataTable>
            </div>
          )}
        </CardContent>
      </Card>

      {/* MODALES */}
      <SupplierModal
        open={isSupplierModalOpen}
        onOpenChange={setIsSupplierModalOpen}
        supplier={editingSupplier}
        defaultCredito={!editingSupplier ? defaultCredito : undefined}
        onSubmit={async (payload) => {
          if (editingSupplier) {
            await updateSupplier(editingSupplier.id, payload);
          } else {
            await createSupplier(payload);
          }
        }}
      />

      <SupplierDetailSheet
        open={isSupplierDetailOpen}
        onOpenChange={setIsSupplierDetailOpen}
        supplier={selectedSupplier}
      />

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-status-danger flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              ¿Eliminar Proveedor?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Estás a punto de eliminar al proveedor{" "}
              <strong>{supplierToDelete?.razon_social}</strong>. Esta acción no
              se puede deshacer. Los registros históricos asociados se
              mantendrán intactos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => setSupplierToDelete(null)}
              className="rounded-xl"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteSupplier}
              className="bg-status-danger hover:bg-status-danger/90 text-white rounded-xl"
            >
              Sí, eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
