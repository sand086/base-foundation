from sqlalchemy.orm import Session, joinedload
from app.models import models
from app.schemas import clients as schemas


def get_clients(db: Session, skip: int = 0, limit: int = 100):
    return (
        db.query(models.Client)
        .options(
            joinedload(models.Client.sub_clients).joinedload(models.SubClient.tariffs)
        )
        .offset(skip)
        .limit(limit)
        .all()
    )


def get_client(db: Session, client_id: int): # ID es int
    return (
        db.query(models.Client)
        .options(
            joinedload(models.Client.sub_clients).joinedload(models.SubClient.tariffs)
        )
        .filter(models.Client.id == client_id)
        .first()
    )

def create_client(db: Session, client: schemas.ClientCreate):
    # 1. Crear Client (Sin pasar ID manual)
    db_client = models.Client(
        public_id=client.public_id, # Si el front lo manda, lo guardamos
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
    )
    db.add(db_client)
    db.flush() # Importante: Genera el db_client.id sin hacer commit final

    # 2. Crear Subclientes
    for sub in client.sub_clients:
        db_sub = models.SubClient(
            client_id=db_client.id, # Usamos el ID generado
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
        )
        db.add(db_sub)
        db.flush() # Generar ID del subcliente

        # 3. Crear Tarifas
        for tariff in sub.tariffs:
            db_tariff = models.Tariff(
                sub_client_id=db_sub.id, # Usamos ID del subcliente
                nombre_ruta=tariff.nombre_ruta,
                tipo_unidad=tariff.tipo_unidad,
                tarifa_base=tariff.tarifa_base,
                costo_casetas=tariff.costo_casetas,
                moneda=tariff.moneda,
                vigencia=tariff.vigencia,
                estatus=tariff.estatus,
            )
            db.add(db_tariff)

    db.commit()
    db.refresh(db_client)
    return db_client

def update_client(db: Session, client_id: str, client_data: schemas.ClientUpdate):
    db_client = get_client(db, client_id)
    if not db_client:
        return None

    # 1. Actualizar datos básicos
    data_dict = client_data.model_dump(exclude={"sub_clients"})
    for key, value in data_dict.items():
        setattr(db_client, key, value)

    # 2. Reemplazar subclientes (Borrar viejos, crear nuevos)
    # Esto es seguro porque el frontend envía el objeto completo siempre
    db.query(models.SubClient).filter(models.SubClient.client_id == client_id).delete()

    # 3. Recrear estructura
    for sub in client_data.sub_clients:
        db_sub = models.SubClient(
            id=sub.id,
            client_id=client_id,
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
        )
        db.add(db_sub)

        for tariff in sub.tariffs:
            db_tariff = models.Tariff(
                id=tariff.id,
                sub_client_id=sub.id,
                nombre_ruta=tariff.nombre_ruta,
                tipo_unidad=tariff.tipo_unidad,
                tarifa_base=tariff.tarifa_base,
                costo_casetas=tariff.costo_casetas,
                moneda=tariff.moneda,
                vigencia=tariff.vigencia,
                estatus=tariff.estatus,
            )
            db.add(db_tariff)

    db.commit()
    db.refresh(db_client)
    return db_client


def delete_client(db: Session, client_id: str):
    client = db.query(models.Client).filter(models.Client.id == client_id).first()
    if client:
        db.delete(client)
        db.commit()
        return True
    return False
