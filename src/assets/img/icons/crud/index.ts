import iconDetalle from "./detalles.svg";
import iconEditar from "./editar.svg";
import iconEliminar from "./eliminar.svg";
import iconAgregar from "./agregar.svg";

export const crudIcons = {
  iconAgregar,
  iconDetalle,
  iconEditar,
  iconEliminar,
} as const;

export type CrudIconKey = keyof typeof crudIcons;
