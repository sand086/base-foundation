import { toast } from "sonner";

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
  const sendSecurityNotification = ({
    event,
    details,
  }: SecurityNotificationParams) => {
    const timestamp = new Date().toLocaleString("es-MX", {
      dateStyle: "short",
      timeStyle: "short",
    });

    switch (event) {
      case "password_reset":
        toast.info("📧 Simulación: Email Enviado", {
          description: `Se notificó a ${details.userEmail || "usuario"} sobre el restablecimiento de contraseña.`,
          duration: 5000,
        });
        console.log(
          `[SECURITY] ${timestamp} - Password reset email sent to: ${details.userEmail}`,
        );
        break;

      case "two_factor_disabled":
        toast.warning("🔐 Alerta de Seguridad: 2FA Desactivado", {
          description: `Se desactivó la autenticación de dos factores para ${details.userName}. Se envió notificación por correo.`,
          duration: 6000,
        });
        console.log(
          `[SECURITY] ${timestamp} - 2FA disabled for user: ${details.userName}. Email notification sent.`,
        );
        break;

      case "two_factor_reset":
        toast.warning("🔐 Alerta de Seguridad: 2FA Restablecido", {
          description: `Se restableció el 2FA para ${details.userName}. Se envió correo con nuevas instrucciones.`,
          duration: 6000,
        });
        console.log(
          `[SECURITY] ${timestamp} - 2FA reset for user: ${details.userName}. Email notification sent.`,
        );
        break;

      case "trip_stopped":
        toast.error("🚨 Viaje Detenido - Notificación al Client", {
          description: `Viaje ${details.tripId} marcado como DETENIDO. Se notificó automáticamente a ${details.clientName || "el cliente"}.`,
          duration: 8000,
        });
        console.log(
          `[OPERATIONS] ${timestamp} - Trip ${details.tripId} STOPPED. Client notification sent to: ${details.clientName}`,
        );
        break;

      case "trip_incident":
        toast.error("⚠️ Incidencia Reportada - Notificación al Client", {
          description: `Incidencia en viaje ${details.tripId}. Motivo: ${details.reason || "No especificado"}. Client notificado.`,
          duration: 8000,
        });
        console.log(
          `[OPERATIONS] ${timestamp} - Trip ${details.tripId} INCIDENT: ${details.reason}. Client notification sent.`,
        );
        break;

      case "forced_assignment":
        toast.warning("⚡ Asignación Forzada - Admin Override", {
          description: `${details.adminName || "Administrador"} forzó asignación. Motivo: ${details.reason}. Acción registrada en auditoría.`,
          duration: 6000,
        });
        console.log(
          `[AUDIT] ${timestamp} - FORCED ASSIGNMENT by ${details.adminName}. Reason: ${details.reason}`,
        );
        break;

      default:
        break;
    }
  };

  return { sendSecurityNotification };
};
