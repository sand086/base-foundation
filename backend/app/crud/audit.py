from sqlalchemy.orm import Session
from app.models import models


def log_audit(
    db: Session,
    user_id: int,
    accion: str,
    tipo_accion: str,
    modulo: str,
    detalles: str = None,
    ip: str = None,
    dispositivo: str = None,
):
    """
    Guarda un registro en la tabla de auditoría.
    tipos_accion recomendados: "crear", "editar", "eliminar", "ver", "exportar", "login", "logout", "seguridad"
    """
    nuevo_log = models.AuditLog(
        user_id=user_id,
        accion=accion,
        tipo_accion=tipo_accion,
        modulo=modulo,
        detalles=detalles,
        ip=ip,
        dispositivo=dispositivo,
    )
    db.add(nuevo_log)
    db.commit()
    # No es necesario hacer db.refresh() para auditoría porque no devolveremos este objeto
