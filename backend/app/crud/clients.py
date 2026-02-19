from sqlalchemy.orm import Session, joinedload
from app.models import models
from app.models.models import RecordStatus
from app.schemas import clients as schemas


def get_clients(db: Session, skip: int = 0, limit: int = 100):
    """
    Lista clientes visibles (A e I). Oculta eliminados (E).
    """
    return (
        db.query(models.Client)
        .options(
            joinedload(models.Client.sub_clients).joinedload(models.SubClient.tariffs)
        )
        .filter(models.Client.record_status != RecordStatus.ELIMINADO)
        .order_by(models.Client.id.asc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def get_client(db: Session, client_id: int):
    """
    Obtiene un cliente visible (A e I). Oculta eliminados (E).
    """
    return (
        db.query(models.Client)
        .options(
            joinedload(models.Client.sub_clients).joinedload(models.SubClient.tariffs)
        )
        .filter(
            models.Client.id == client_id,
            models.Client.record_status != RecordStatus.ELIMINADO,
        )
        .first()
    )


def create_client(db: Session, client: schemas.ClientCreate):
    """
    Crea cliente + subclientes + tarifas.
    record_status default A por AuditMixin.
    """
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
        # record_status se queda por default en A
    )
    db.add(db_client)
    db.flush()  # Generar ID

    for sub in client.sub_clients:
        db_sub = models.SubClient(
            client_id=db_client.id,
            nombre=sub.nombre,
            alias=sub.alias,
            direccion=sub.direccion,
            ciudad=sub.ciudad,
            estado=sub.estado,
            codigo_postal=sub.codigo_postal,
            tipo_operacion=sub.tipo_operacion,
            contacto=sub.contacto,
            telefono=sub.telefono,
            horario_recepcion=sub.horario_recepcion,
            dias_credito=sub.dias_credito,
            requiere_contrato=sub.requiere_contrato,
            convenio_especial=sub.convenio_especial,
            # record_status default A
        )
        db.add(db_sub)
        db.flush()

        for tariff in sub.tariffs:
            db_tariff = models.Tariff(
                sub_client_id=db_sub.id,
                nombre_ruta=tariff.nombre_ruta,
                tipo_unidad=tariff.tipo_unidad,
                tarifa_base=tariff.tarifa_base,
                costo_casetas=tariff.costo_casetas,
                moneda=tariff.moneda,
                vigencia=tariff.vigencia,
                estatus=tariff.estatus,
                # record_status default A
            )
            db.add(db_tariff)

    db.commit()
    db.refresh(db_client)
    return db_client


def update_client(db: Session, client_id: int, client_data: schemas.ClientUpdate):
    """
    Update inteligente:
    - Actualiza campos del cliente (incluyendo record_status si viene)
    - Upsert subclients + tarifas
    - Lo que ya no venga en payload => soft delete (record_status = E)
    NOTA: No borramos físicamente nunca.
    """
    db_client = get_client(db, client_id)
    if not db_client:
        return None

    # 1) Update campos básicos del cliente (permitimos record_status si viene)
    client_vars = client_data.model_dump(
        exclude={
            "sub_clients",
            "id",
            "created_at",
            "updated_at",
            "created_by_id",
            "updated_by_id",
        }
    )
    for key, value in client_vars.items():
        if value is not None:
            setattr(db_client, key, value)

    # 2) Update/Subclients (ignorar eliminados en el "existing map")
    existing_subs = {
        sub.id: sub
        for sub in db_client.sub_clients
        if sub.record_status != RecordStatus.ELIMINADO
    }

    incoming_sub_ids: list[int] = []

    for sub_in in client_data.sub_clients or []:
        # UPDATE sub existente
        if sub_in.id and sub_in.id in existing_subs:
            db_sub = existing_subs[sub_in.id]
            incoming_sub_ids.append(sub_in.id)

            sub_vars = sub_in.model_dump(
                exclude={
                    "tariffs",
                    "id",
                    "client_id",
                    "created_at",
                    "updated_at",
                    "created_by_id",
                    "updated_by_id",
                }
            )
            for k, v in sub_vars.items():
                if v is not None:
                    setattr(db_sub, k, v)

            # --- Tarifas (anidado) ---
            existing_tariffs = {
                t.id: t
                for t in db_sub.tariffs
                if t.record_status != RecordStatus.ELIMINADO
            }
            incoming_tariff_ids: list[int] = []

            for tariff_in in sub_in.tariffs or []:
                # UPDATE tarifa existente
                if tariff_in.id and tariff_in.id in existing_tariffs:
                    db_tariff = existing_tariffs[tariff_in.id]
                    incoming_tariff_ids.append(tariff_in.id)

                    t_vars = tariff_in.model_dump(
                        exclude={
                            "id",
                            "sub_client_id",
                            "created_at",
                            "updated_at",
                            "created_by_id",
                            "updated_by_id",
                        }
                    )
                    for tk, tv in t_vars.items():
                        if tv is not None:
                            setattr(db_tariff, tk, tv)

                # CREATE nueva tarifa
                else:
                    new_t_data = tariff_in.model_dump(
                        exclude={
                            "id",
                            "sub_client_id",
                            "created_at",
                            "updated_at",
                            "created_by_id",
                            "updated_by_id",
                        }
                    )
                    new_tariff = models.Tariff(**new_t_data)
                    # record_status default A, pero lo dejamos explícito por claridad
                    new_tariff.record_status = RecordStatus.ACTIVO
                    db_sub.tariffs.append(new_tariff)

            # Soft-delete tarifas que ya no vienen
            for t_id, t_obj in existing_tariffs.items():
                if t_id not in incoming_tariff_ids:
                    t_obj.record_status = RecordStatus.ELIMINADO

        # CREATE nuevo subclient
        else:
            new_sub_data = sub_in.model_dump(
                exclude={
                    "tariffs",
                    "id",
                    "client_id",
                    "created_at",
                    "updated_at",
                    "created_by_id",
                    "updated_by_id",
                }
            )
            new_sub = models.SubClient(**new_sub_data)
            new_sub.record_status = RecordStatus.ACTIVO

            for tariff_in in sub_in.tariffs or []:
                t_data = tariff_in.model_dump(
                    exclude={
                        "id",
                        "sub_client_id",
                        "created_at",
                        "updated_at",
                        "created_by_id",
                        "updated_by_id",
                    }
                )
                new_tariff = models.Tariff(**t_data)
                new_tariff.record_status = RecordStatus.ACTIVO
                new_sub.tariffs.append(new_tariff)

            db_client.sub_clients.append(new_sub)

    # 3) Soft-delete subclients que ya no vienen (y también sus tarifas)
    for s_id, s_obj in existing_subs.items():
        if s_id not in incoming_sub_ids:
            s_obj.record_status = RecordStatus.ELIMINADO
            # Soft-cascade: eliminar también sus tarifas (para que no queden visibles si consultas directo)
            for t in s_obj.tariffs or []:
                if t.record_status != RecordStatus.ELIMINADO:
                    t.record_status = RecordStatus.ELIMINADO

    db.commit()
    db.refresh(db_client)
    return db_client


def delete_client(db: Session, client_id: int):
    """
    Soft delete:
    - Cambia record_status a E
    - (Opcional) soft-cascade a subclientes y tarifas
    """
    client = (
        db.query(models.Client)
        .options(
            joinedload(models.Client.sub_clients).joinedload(models.SubClient.tariffs)
        )
        .filter(
            models.Client.id == client_id,
            models.Client.record_status != RecordStatus.ELIMINADO,
        )
        .first()
    )
    if not client:
        return False

    client.record_status = RecordStatus.ELIMINADO

    # Soft-cascade (recomendado)
    for sub in client.sub_clients or []:
        if sub.record_status != RecordStatus.ELIMINADO:
            sub.record_status = RecordStatus.ELIMINADO
        for t in sub.tariffs or []:
            if t.record_status != RecordStatus.ELIMINADO:
                t.record_status = RecordStatus.ELIMINADO

    db.commit()
    return True
