// src/hooks/useSecurityNotifications.ts
import { toast } from "sonner";
import axiosClient from "@/api/axiosClient";
import { useAuth } from "./useAuth";

// Types of security events
export type SecurityEvent =
  | "password_reset"
  | "two_factor_disabled"
  | "two_factor_reset"
  | "trip_stopped"
  | "trip_incident"
  | "forced_assignment";

interface SecurityNotificationParams {
  event: SecurityEvent;
  details: {
    userName?: string;
    userEmail?: string;
    tripId?: string;
    clientName?: string;
    reason?: string;
    adminName?: string;
  };
}

export const useSecurityNotifications = () => {
  const { user } = useAuth(); // Extraemos el usuario actual

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

    switch (event) {
      case "password_reset":
        title = "Restablecimiento de Contraseña";
        message = `Se notificó a ${details.userEmail || "usuario"} sobre el restablecimiento de contraseña.`;
        toast.info("📧 Simulación: Email Enviado", {
          description: message,
          duration: 5000,
        });
        break;

      case "two_factor_disabled":
        title = "2FA Desactivado";
        message = `Se desactivó la autenticación de dos factores para ${details.userName}. Se envió notificación por correo.`;
        toast.warning("🔐 Alerta de Seguridad: 2FA Desactivado", {
          description: message,
          duration: 6000,
        });
        break;

      case "two_factor_reset":
        title = "2FA Restablecido";
        message = `Se restableció el 2FA para ${details.userName}. Se envió correo con nuevas instrucciones.`;
        toast.warning("🔐 Alerta de Seguridad: 2FA Restablecido", {
          description: message,
          duration: 6000,
        });
        break;

      case "trip_stopped":
        title = "Viaje Detenido";
        message = `Viaje ${details.tripId} marcado como DETENIDO. Se notificó automáticamente a ${details.clientName || "el cliente"}.`;
        toast.error("  Viaje Detenido - Notificación al Cliente", {
          description: message,
          duration: 8000,
        });
        break;

      case "trip_incident":
        title = "Incidencia Reportada";
        message = `Incidencia en viaje ${details.tripId}. Motivo: ${details.reason || "No especificado"}. Cliente notificado.`;
        toast.error("⚠️ Incidencia Reportada - Notificación al Cliente", {
          description: message,
          duration: 8000,
        });
        break;

      case "forced_assignment":
        title = "Asignación Forzada";
        message = `${details.adminName || "Administrador"} forzó asignación. Motivo: ${details.reason}. Acción registrada en auditoría.`;
        toast.warning("⚡ Asignación Forzada - Admin Override", {
          description: message,
          duration: 6000,
        });
        break;

      default:
        return; // Salir si el evento no existe
    }

    // 1. Log en consola para historial de la sesión local
    console.log(`[${event.toUpperCase()}] ${timestamp} - ${message}`);

    // 2.  GUARDAR EN LA BASE DE DATOS (Backend)
    try {
      if (user?.id) {
        await axiosClient.post("/notifications/", {
          user_id: user.id,
          title: title,
          message: message,
          event_type: event,
          reference_id: details.tripId || null,
        });
      }
    } catch (error) {
      console.error(
        "No se pudo guardar la notificación en la base de datos",
        error,
      );
    }
  };

  return { sendSecurityNotification };
};
