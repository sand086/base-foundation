# --- Archivo: app/modules/clients/crud.py ---

from sqlalchemy.orm import Session, joinedload, selectinload
from app.models import models
from app.models.models import RecordStatus
from . import schemas
from fastapi import HTTPException, status


def get_clients(db: Session, skip: int = 0, limit: int = 100):
    """Lista clientes activos con sus subclientes y tarifas."""
    return (
        db.query(models.Client)
        .filter(models.Client.record_status != RecordStatus.ELIMINADO)
        .options(
            # 🚀 FIX: Cambiado a selectinload para evitar Explosión Cartesiana
            selectinload(
                models.Client.sub_clients.and_(
                    models.SubClient.record_status != RecordStatus.ELIMINADO
                )
            ).selectinload(
                models.SubClient.tariffs.and_(
                    models.Tariff.record_status != RecordStatus.ELIMINADO
                )
            )
        )
        .order_by(models.Client.razon_social.asc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def get_client(db: Session, client_id: int):
    """Obtiene un único cliente cargando hijos activos."""
    return (
        db.query(models.Client)
        .filter(
            models.Client.id == client_id,
            models.Client.record_status != RecordStatus.ELIMINADO,
        )
        .options(
            # 🚀 FIX: Mismo blindaje para la carga individual
            selectinload(
                models.Client.sub_clients.and_(
                    models.SubClient.record_status != RecordStatus.ELIMINADO
                )
            ).selectinload(
                models.SubClient.tariffs.and_(
                    models.Tariff.record_status != RecordStatus.ELIMINADO
                )
            )
        )
        .first()
    )


def create_client(
    db: Session, client: schemas.ClientCreate, user_id: int
):  # <--- AUDITORÍA PARAM
    """Crea cliente + subclientes + tarifas con mapeo completo."""
    try:
        # 1. Crear el objeto principal Client
        db_client = models.Client(
            public_id=client.public_id,
            razon_social=client.razon_social,
            rfc=client.rfc,
            regimen_fiscal=client.regimen_fiscal,
            uso_cfdi=client.uso_cfdi,
            contacto_principal=client.contacto_principal,
            telefono=client.telefono,
            email=client.email,
            direccion_fiscal=client.direccion_fiscal,
            codigo_postal_fiscal=client.codigo_postal_fiscal,
            estatus=client.estatus,
            dias_credito=client.dias_credito,
            contrato_url=client.contrato_url,
            constancia_fiscal_url=getattr(client, "constancia_fiscal_url", None),
            acta_constitutiva_url=getattr(client, "acta_constitutiva_url", None),
            comprobante_domicilio_url=getattr(
                client, "comprobante_domicilio_url", None
            ),
            forma_pago=getattr(client, "forma_pago", "99"),
            metodo_pago=getattr(client, "metodo_pago", "PPD"),
            moneda=getattr(client, "moneda", "MXN"),
            created_by_id=user_id,  # <--- AUDITORÍA
        )
        db.add(db_client)
        db.flush()  # Para obtener el db_client.id

        # 2. Procesar Subclientes
        for sub in client.sub_clients:
            db_sub = models.SubClient(
                client_id=db_client.id,
                nombre=sub.nombre,
                alias=sub.alias,
                direccion=sub.direccion,
                ciudad=sub.ciudad,
                estado=sub.estado,
                codigo_postal=sub.codigo_postal,
                tipo_operacion=sub.tipo_operacion,  # Sin acento
                contacto=sub.contacto,
                telefono=sub.telefono,
                horario_recepcion=sub.horario_recepcion,
                horario_cita=getattr(sub, "horario_cita", None),
                dias_credito=sub.dias_credito,
                requiere_contrato=sub.requiere_contrato,
                convenio_especial=sub.convenio_especial,
                contrato_url=sub.contrato_url if hasattr(sub, "contrato_url") else None,
                created_by_id=user_id,  # <--- AUDITORÍA
            )
            db.add(db_sub)
            db.flush()

            # 3. Procesar Tarifas del Subcliente
            for tariff in sub.tariffs:
                db_tariff = models.Tariff(
                    sub_client_id=db_sub.id,
                    rate_template_id=tariff.rate_template_id,
                    nombre_ruta=tariff.nombre_ruta,
                    tipo_unidad=tariff.tipo_unidad,
                    tarifa_base=tariff.tarifa_base,
                    sueldo_operador=tariff.sueldo_operador,
                    costo_casetas=tariff.costo_casetas,
                    iva_porcentaje=tariff.iva_porcentaje,
                    retencion_porcentaje=tariff.retencion_porcentaje,
                    distancia_km=tariff.distancia_km,
                    moneda=tariff.moneda,
                    vigencia=tariff.vigencia,
                    estatus=tariff.estatus,
                    created_by_id=user_id,  # <--- AUDITORÍA
                )
                db.add(db_tariff)

        db.commit()
        db.refresh(db_client)
        return db_client

    except Exception as e:
        db.rollback()
        print(
            f"ERROR REAL EN CREATE_CLIENT: {str(e)}"
        )  # Esto saldrá en tu terminal negra
        raise HTTPException(status_code=400, detail=f"Error de base de datos: {str(e)}")


def update_client(
    db: Session, client_id: int, client_data: schemas.ClientUpdate, user_id: int
):  # <--- AUDITORÍA PARAM
    """Update con Upsert para subclientes y tarifas."""
    db_client = get_client(db, client_id)
    if not db_client:
        return None

    # 1) Update Cliente
    update_data = client_data.model_dump(exclude={"sub_clients"}, exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_client, key, value)

    db_client.updated_by_id = user_id  # <--- AUDITORÍA

    # 2) Manejo de Subclientes
    if client_data.sub_clients is not None:
        existing_subs = {
            s.id: s
            for s in db_client.sub_clients
            if s.record_status != RecordStatus.ELIMINADO
        }
        incoming_sub_ids = []

        for sub_in in client_data.sub_clients:
            if sub_in.id and sub_in.id in existing_subs:
                # UPDATE Subcliente
                db_sub = existing_subs[sub_in.id]
                incoming_sub_ids.append(sub_in.id)
                sub_update_data = sub_in.model_dump(
                    exclude={"tariffs"}, exclude_unset=True
                )
                for k, v in sub_update_data.items():
                    setattr(db_sub, k, v)

                db_sub.updated_by_id = user_id  # <--- AUDITORÍA

                # --- Manejo de Tarifas (Nested) ---
                if sub_in.tariffs is not None:
                    existing_tariffs = {
                        t.id: t
                        for t in db_sub.tariffs
                        if t.record_status != RecordStatus.ELIMINADO
                    }
                    incoming_tariff_ids = []
                    for t_in in sub_in.tariffs:
                        if t_in.id and t_in.id in existing_tariffs:
                            # UPDATE Tarifa
                            db_t = existing_tariffs[t_in.id]
                            incoming_tariff_ids.append(t_in.id)
                            t_up_data = t_in.model_dump(exclude_unset=True)
                            for tk, tv in t_up_data.items():
                                setattr(db_t, tk, tv)

                            db_t.updated_by_id = user_id  # <--- AUDITORÍA
                        else:
                            # CREATE Tarifa nueva
                            new_t = models.Tariff(
                                **t_in.model_dump(exclude={"id"}), created_by_id=user_id
                            )  # <--- AUDITORÍA
                            new_t.sub_client_id = db_sub.id
                            db.add(new_t)

                    # Soft delete tarifas que no vienen
                    for t_id, t_obj in existing_tariffs.items():
                        if t_id not in incoming_tariff_ids:
                            t_obj.record_status = RecordStatus.ELIMINADO
                            t_obj.updated_by_id = user_id  # <--- AUDITORÍA
            else:
                # CREATE Subcliente nuevo
                new_sub_dict = sub_in.model_dump(exclude={"tariffs", "id"})
                new_sub = models.SubClient(
                    **new_sub_dict, client_id=db_client.id, created_by_id=user_id
                )  # <--- AUDITORÍA
                db.add(new_sub)
                db.flush()
                for t_in in sub_in.tariffs or []:
                    new_t = models.Tariff(
                        **t_in.model_dump(exclude={"id"}),
                        sub_client_id=new_sub.id,
                        created_by_id=user_id,  # <--- AUDITORÍA
                    )
                    db.add(new_t)

        # Soft delete subclientes que no vienen
        for s_id, s_obj in existing_subs.items():
            if s_id not in incoming_sub_ids:
                s_obj.record_status = RecordStatus.ELIMINADO
                s_obj.updated_by_id = user_id  # <--- AUDITORÍA

    db.commit()
    db.refresh(db_client)
    return db_client


def delete_client(db: Session, client_id: int, user_id: int):  # <--- AUDITORÍA PARAM
    """Soft delete en cascada."""
    client = get_client(db, client_id)
    if not client:
        return False

    client.record_status = RecordStatus.ELIMINADO
    client.updated_by_id = user_id  # <--- AUDITORÍA

    # El get_client ya filtró y trajo solo subclientes y tarifas activos
    for sub in client.sub_clients:
        sub.record_status = RecordStatus.ELIMINADO
        sub.updated_by_id = user_id  # <--- AUDITORÍA
        for t in sub.tariffs:
            t.record_status = RecordStatus.ELIMINADO
            t.updated_by_id = user_id  # <--- AUDITORÍA

    db.commit()
    return True