export interface Notificacion {
  id: string;
  fechaHora: string;
  tipo: "estatus_viaje" | "factura" | "alerta" | "recordatorio";
  tipoLabel: string;
  destinatario: string;
  canal: "email" | "sms";
  estado: "enviado" | "error" | "pendiente";
  asunto: string;
}

export const mockNotificaciones: Notificacion[] = [
  {
    id: "NOT-001",
    fechaHora: "2024-01-09 14:32",
    tipo: "estatus_viaje",
    tipoLabel: "Estatus Viaje",
    destinatario: "logistica@sabinodelbene.com",
    canal: "email",
    estado: "enviado",
    asunto: "Actualización de viaje SRV-2024-001",
  },
  {
    id: "NOT-002",
    fechaHora: "2024-01-09 12:15",
    tipo: "factura",
    tipoLabel: "Factura",
    destinatario: "cuentas@maersk.com",
    canal: "email",
    estado: "enviado",
    asunto: "Nueva factura FAC-2024-0892",
  },
  {
    id: "NOT-003",
    fechaHora: "2024-01-09 10:45",
    tipo: "alerta",
    tipoLabel: "Alerta",
    destinatario: "operaciones@rapidostres.com",
    canal: "email",
    estado: "error",
    asunto: "Desviación de combustible detectada",
  },
  {
    id: "NOT-004",
    fechaHora: "2024-01-08 18:20",
    tipo: "recordatorio",
    tipoLabel: "Recordatorio",
    destinatario: "+52 55 1234 5678",
    canal: "sms",
    estado: "enviado",
    asunto: "Verificación vehicular próxima a vencer",
  },
  {
    id: "NOT-005",
    fechaHora: "2024-01-08 16:00",
    tipo: "estatus_viaje",
    tipoLabel: "Estatus Viaje",
    destinatario: "tracking@dhl.com",
    canal: "email",
    estado: "enviado",
    asunto: "Viaje SRV-2024-002 completado",
  },
  {
    id: "NOT-006",
    fechaHora: "2024-01-08 14:30",
    tipo: "alerta",
    tipoLabel: "Alerta",
    destinatario: "mantenimiento@rapidostres.com",
    canal: "email",
    estado: "pendiente",
    asunto: "Documento de seguro por vencer",
  },
  {
    id: "NOT-007",
    fechaHora: "2024-01-08 09:15",
    tipo: "factura",
    tipoLabel: "Factura",
    destinatario: "pagos@kuehne-nagel.com",
    canal: "email",
    estado: "enviado",
    asunto: "Recordatorio de pago FAC-2024-0856",
  },
  {
    id: "NOT-008",
    fechaHora: "2024-01-07 17:45",
    tipo: "estatus_viaje",
    tipoLabel: "Estatus Viaje",
    destinatario: "+52 55 9876 5432",
    canal: "sms",
    estado: "error",
    asunto: "Retraso en entrega SRV-2024-003",
  },
];

export interface ConfiguracionAlertas {
  alertaCombustible: boolean;
  umbralCombustible: number;
  alertaDocumentoVencido: boolean;
  diasAnticipacionDocumento: number;
  alertaRetrasoViaje: boolean;
  minutosRetraso: number;
}

export interface PlantillaCorreo {
  id: string;
  nombre: string;
  asunto: string;
  cuerpo: string;
}

export const defaultConfigAlertas: ConfiguracionAlertas = {
  alertaCombustible: true,
  umbralCombustible: 5,
  alertaDocumentoVencido: true,
  diasAnticipacionDocumento: 15,
  alertaRetrasoViaje: true,
  minutosRetraso: 30,
};

export const defaultPlantillasCorreo: PlantillaCorreo[] = [
  {
    id: "TPL-001",
    nombre: "Notificación de Client - Estatus",
    asunto: "Actualización de su envío [SERVICIO_ID]",
    cuerpo: `Estimado cliente,

Le informamos que su envío con número de servicio [SERVICIO_ID] ha sido actualizado.

Estado actual: [ESTATUS]
Ubicación: [UBICACION]
Hora de actualización: [FECHA_HORA]

Para cualquier duda, no dude en contactarnos.

Atentamente,
Rápidos 3T`,
  },
  {
    id: "TPL-002",
    nombre: "Notificación de Factura",
    asunto: "Nueva factura [FACTURA_ID] - Rápidos 3T",
    cuerpo: `Estimado cliente,

Adjunto encontrará la factura [FACTURA_ID] correspondiente a los servicios prestados.

Monto total: [MONTO]
Fecha de vencimiento: [FECHA_VENCIMIENTO]

Agradecemos su preferencia.

Atentamente,
Rápidos 3T`,
  },
  {
    id: "TPL-003",
    nombre: "Alerta de Documento Vencido",
    asunto: "URGENTE: Documento próximo a vencer - [UNIDAD]",
    cuerpo: `Atención,

El documento [TIPO_DOCUMENTO] de la unidad [UNIDAD] vencerá el [FECHA_VENCIMIENTO].

Por favor, tome las acciones necesarias para renovarlo a la brevedad.

Sistema de Alertas
Rápidos 3T`,
  },
];
