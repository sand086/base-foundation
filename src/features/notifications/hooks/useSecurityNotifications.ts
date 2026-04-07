import React from "react";
import { toast } from "sonner";
import {
  Mail,
  AlertTriangle,
  ShieldAlert,
  Truck,
  CheckCircle2,
  Info,
  Lock,
} from "lucide-react";
import { MonitoringNotificationsService } from "@/api/generated";
import { useAuth } from "@/hooks/useAuth";

// 1. Definición de eventos de seguridad y tracking
export type SecurityEvent =
  | "password_reset"
  | "two_factor_disabled"
  | "two_factor_reset"
  | "trip_stopped"
  | "trip_incident"
  | "forced_assignment"
  | "auth_failure"
  | "trip_tracking_update";

// 2. Interfaz de detalles para el payload
export interface SecurityNotificationDetails {
  tripId?: string;
  userName?: string;
  userEmail?: string;
  clientName?: string;
  reason?: string;
  adminName?: string;
  statusLabel?: string;
  location?: string;
  comments?: string;
  isExternal?: boolean;
}

interface SecurityNotificationParams {
  event: SecurityEvent;
  details: SecurityNotificationDetails;
}

export const useSecurityNotifications = () => {
  const { user } = useAuth();

  const sendSecurityNotification = async ({
    event,
    details,
  }: SecurityNotificationParams) => {
    const timestamp = new Date().toLocaleString("es-MX", {
      dateStyle: "short",
      timeStyle: "short",
    });

    let title = "Notificación de Sistema";
    let message = "";

    // 🚀 LÓGICA DE INTERFAZ (Toasts) Y MENSAJERÍA
    switch (event) {
      case "trip_tracking_update":
        title = "Actualización de Tracking";
        message = `Viaje ${details.tripId}: ${details.statusLabel} en ${details.location}.`;
        toast.success("📧 Tracking enviado al cliente", {
          description: message,
          icon: React.createElement(Mail, {
            className: "h-4 w-4 text-emerald-500",
          }),
          duration: 4000,
        });
        break;

      case "trip_stopped":
        title = "Unidad Detenida";
        message = `El viaje ${details.tripId} de ${details.clientName || "Cliente"} se ha detenido por: ${details.reason || "No especificado"}.`;
        toast.error("🚨 Alerta: Unidad Detenida", {
          description: message,
          icon: React.createElement(Truck, { className: "h-4 w-4" }),
          duration: 6000,
        });
        break;

      case "trip_incident":
        title = "Incidencia en Ruta";
        message = `Incidencia reportada en viaje ${details.tripId}. Detalles: ${details.comments || details.reason}`;
        toast.error("⚠️ Incidencia Crítica", {
          description: message,
          icon: React.createElement(AlertTriangle, { className: "h-4 w-4" }),
          duration: 7000,
        });
        break;

      case "password_reset":
        title = "Cambio de Contraseña";
        message = `Solicitud de reset para: ${details.userEmail}`;
        toast.info("Seguridad: Email enviado", {
          description: message,
          icon: React.createElement(Lock, { className: "h-4 w-4" }),
        });
        break;

      case "two_factor_disabled":
        title = "2FA Desactivado";
        message = `Se eliminó la protección 2FA para el usuario ${details.userName}.`;
        toast.warning("🔐 Seguridad Vulnerada", {
          description: message,
          icon: React.createElement(ShieldAlert, { className: "h-4 w-4" }),
        });
        break;

      case "two_factor_reset":
        title = "2FA Reconfigurado";
        message = `El usuario ${details.userName} ha restablecido sus llaves 2FA.`;
        toast.success("Seguridad: 2FA Actualizado", {
          description: message,
          icon: React.createElement(CheckCircle2, { className: "h-4 w-4" }),
        });
        break;

      case "forced_assignment":
        title = "Asignación Forzada";
        message = `${details.adminName} forzó la asignación del viaje ${details.tripId}.`;
        toast.warning("⚡ Overrider de Sistema", {
          description: message,
          icon: React.createElement(Info, { className: "h-4 w-4" }),
        });
        break;

      case "auth_failure":
        title = "Fallo de Autenticación";
        message = `Intento de acceso fallido para ${details.userEmail}.`;
        toast.error("Acceso denegado", { description: message });
        break;

      default:
        console.warn("Evento no reconocido:", event);
        return;
    }

    // 1. Log para auditoría en consola
    console.log(
      `[NOTIF-LOG] ${timestamp} | Evento: ${event} | Msg: ${message}`,
    );

    // 2. PERSISTENCIA EN BACKEND
    try {
      if (user?.id) {
        await MonitoringNotificationsService.createNotificationApiMonitoringPost({
          user_id: user.id,
          title: title,
          message: message,
          event_type: event,
          reference_id: details.tripId ? String(details.tripId) : null,
          metadata_info: {
            is_external: details.isExternal || false,
            location: details.location,
            statusLabel: details.statusLabel,
            client_name: details.clientName,
            comments: details.comments,
          },
        } as any);
      }
    } catch (error) {
      console.error("Error al guardar notificación en base de datos:", error);
    }
  };

  return { sendSecurityNotification };
};
