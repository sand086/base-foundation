import * as XLSX from "xlsx";

export const exportToExcel = (data: any[], fileName: string) => {
  // Convertimos los datos a una hoja de cálculo
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte");

  // Generamos el archivo y lo descargamos
  XLSX.writeFile(
    workbook,
    `${fileName}_${new Date().toLocaleDateString()}.xlsx`,
  );
};
