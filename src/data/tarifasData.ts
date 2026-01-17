// Catálogo Maestro de Casetas (Toll Booth Catalog)
export interface TollBooth {
  id: string;
  nombre: string;
  tramo: string;
  costo5EjesSencillo: number;
  costo5EjesFull: number;
  costo9EjesSencillo: number;
  costo9EjesFull: number;
  formaPago: 'TAG' | 'Efectivo' | 'Ambos';
}

export interface RouteTemplate {
  id: string;
  clienteId: string;
  clienteNombre: string;
  origen: string;
  destino: string;
  tipoUnidad: '5ejes' | '9ejes';
  casetas: string[]; // toll booth IDs
  costoTotal: number;
}

export const mockTollBooths: TollBooth[] = [
  {
    id: 'caseta-1',
    nombre: 'Caseta Tlalpan',
    tramo: 'CDMX - Cuernavaca',
    costo5EjesSencillo: 185,
    costo5EjesFull: 370,
    costo9EjesSencillo: 285,
    costo9EjesFull: 570,
    formaPago: 'TAG',
  },
  {
    id: 'caseta-2',
    nombre: 'Caseta Palmillas',
    tramo: 'Querétaro - San Luis Potosí',
    costo5EjesSencillo: 220,
    costo5EjesFull: 440,
    costo9EjesSencillo: 340,
    costo9EjesFull: 680,
    formaPago: 'Ambos',
  },
  {
    id: 'caseta-3',
    nombre: 'Caseta Tepotzotlán',
    tramo: 'CDMX - Querétaro',
    costo5EjesSencillo: 145,
    costo5EjesFull: 290,
    costo9EjesSencillo: 225,
    costo9EjesFull: 450,
    formaPago: 'TAG',
  },
  {
    id: 'caseta-4',
    nombre: 'Caseta Lechería',
    tramo: 'CDMX - Pachuca',
    costo5EjesSencillo: 98,
    costo5EjesFull: 196,
    costo9EjesSencillo: 152,
    costo9EjesFull: 304,
    formaPago: 'Efectivo',
  },
  {
    id: 'caseta-5',
    nombre: 'Caseta Pirámides',
    tramo: 'CDMX - Tulancingo',
    costo5EjesSencillo: 125,
    costo5EjesFull: 250,
    costo9EjesSencillo: 195,
    costo9EjesFull: 390,
    formaPago: 'TAG',
  },
  {
    id: 'caseta-6',
    nombre: 'Caseta Peñón Texcoco',
    tramo: 'CDMX - Puebla',
    costo5EjesSencillo: 165,
    costo5EjesFull: 330,
    costo9EjesSencillo: 255,
    costo9EjesFull: 510,
    formaPago: 'Ambos',
  },
  {
    id: 'caseta-7',
    nombre: 'Caseta Amozoc',
    tramo: 'Puebla - Veracruz',
    costo5EjesSencillo: 210,
    costo5EjesFull: 420,
    costo9EjesSencillo: 325,
    costo9EjesFull: 650,
    formaPago: 'TAG',
  },
  {
    id: 'caseta-8',
    nombre: 'Caseta Perote',
    tramo: 'Puebla - Xalapa',
    costo5EjesSencillo: 178,
    costo5EjesFull: 356,
    costo9EjesSencillo: 275,
    costo9EjesFull: 550,
    formaPago: 'Efectivo',
  },
  {
    id: 'caseta-9',
    nombre: 'Caseta La Venta',
    tramo: 'Veracruz - Villahermosa',
    costo5EjesSencillo: 245,
    costo5EjesFull: 490,
    costo9EjesSencillo: 380,
    costo9EjesFull: 760,
    formaPago: 'TAG',
  },
  {
    id: 'caseta-10',
    nombre: 'Caseta Cosoleacaque',
    tramo: 'Coatzacoalcos - Villahermosa',
    costo5EjesSencillo: 195,
    costo5EjesFull: 390,
    costo9EjesSencillo: 302,
    costo9EjesFull: 604,
    formaPago: 'Ambos',
  },
];

export const mockRouteTemplates: RouteTemplate[] = [
  {
    id: 'ruta-1',
    clienteId: 'cliente-1',
    clienteNombre: 'Sabino del Bene',
    origen: 'CDMX',
    destino: 'Veracruz Puerto',
    tipoUnidad: '5ejes',
    casetas: ['caseta-6', 'caseta-7'],
    costoTotal: 375,
  },
  {
    id: 'ruta-2',
    clienteId: 'cliente-2',
    clienteNombre: 'DHL Supply Chain',
    origen: 'Querétaro',
    destino: 'CDMX',
    tipoUnidad: '9ejes',
    casetas: ['caseta-3'],
    costoTotal: 225,
  },
];

export const mockClientes = [
  { id: 'cliente-1', nombre: 'Sabino del Bene' },
  { id: 'cliente-2', nombre: 'DHL Supply Chain' },
  { id: 'cliente-3', nombre: 'Maersk Logistics' },
  { id: 'cliente-4', nombre: 'FedEx Freight' },
  { id: 'cliente-5', nombre: 'Coppel Logística' },
];
