from sqlalchemy.orm import Session, joinedload
from app.models import models
from app.schemas import clients as schemas

def get_clients(db: Session, skip: int = 0, limit: int = 100):
    return (
        db.query(models.Client)
        .options(
            joinedload(models.Client.sub_clients).joinedload(models.SubClient.tariffs)
        )
        .order_by(models.Client.id.asc()) # Ordenar por ID
        .offset(skip)
        .limit(limit)
        .all()
    )

def get_client(db: Session, client_id: int): 
    return (
        db.query(models.Client)
        .options(
            joinedload(models.Client.sub_clients).joinedload(models.SubClient.tariffs)
        )
        .filter(models.Client.id == client_id)
        .first()
    )

def create_client(db: Session, client: schemas.ClientCreate):
    # 1. Crear Cliente
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
    )
    db.add(db_client)
    db.flush() # Generar ID

    # 2. Crear Subclientes
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
        )
        db.add(db_sub)
        db.flush() 

        # 3. Crear Tarifas
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
            )
            db.add(db_tariff)

    db.commit()
    db.refresh(db_client)
    return db_client

def update_client(db: Session, client_id: int, client_data: schemas.ClientUpdate):
    # Obtener el cliente existente
    db_client = get_client(db, client_id)
    if not db_client:
        return None

    # 1. Actualizar campos básicos del Cliente
    # Excluimos listas y campos que no deben cambiar
    client_vars = client_data.model_dump(exclude={"sub_clients", "id", "created_at"})
    for key, value in client_vars.items():
        setattr(db_client, key, value)

    # 2. Actualización Inteligente de Subclientes (Update vs Insert vs Delete)
    
    # Mapa de subclientes existentes en BD: {id: objeto}
    existing_subs = {sub.id: sub for sub in db_client.sub_clients}
    
    # IDs que vienen en el payload (para saber cuáles borrar después)
    incoming_sub_ids = []

    for sub_in in client_data.sub_clients:
        # Si tiene ID y existe en la BD -> ACTUALIZAR
        if sub_in.id and sub_in.id in existing_subs:
            db_sub = existing_subs[sub_in.id]
            incoming_sub_ids.append(sub_in.id)
            
            # Actualizar campos simples del subcliente
            sub_vars = sub_in.model_dump(exclude={"tariffs", "id", "client_id"})
            for k, v in sub_vars.items():
                setattr(db_sub, k, v)
            
            # --- Manejo de Tarifas (Anidado) ---
            existing_tariffs = {t.id: t for t in db_sub.tariffs}
            incoming_tariff_ids = []
            
            for tariff_in in sub_in.tariffs:
                if tariff_in.id and tariff_in.id in existing_tariffs:
                    # Actualizar tarifa existente
                    db_tariff = existing_tariffs[tariff_in.id]
                    incoming_tariff_ids.append(tariff_in.id)
                    t_vars = tariff_in.model_dump(exclude={"id", "sub_client_id"})
                    for tk, tv in t_vars.items():
                        setattr(db_tariff, tk, tv)
                else:
                    # Crear nueva tarifa en subcliente existente
                    new_t_data = tariff_in.model_dump(exclude={"id", "sub_client_id"})
                    new_tariff = models.Tariff(**new_t_data)
                    db_sub.tariffs.append(new_tariff)
            
            # Borrar tarifas que ya no vienen
            for t_id, t_obj in existing_tariffs.items():
                if t_id not in incoming_tariff_ids:
                    db.delete(t_obj)

        # Si NO tiene ID o ID=0 -> CREAR NUEVO SUBCLIENTE
        else:
            new_sub_data = sub_in.model_dump(exclude={"tariffs", "id", "client_id"})
            new_sub = models.SubClient(**new_sub_data)
            
            # Agregar sus tarifas
            for tariff_in in sub_in.tariffs:
                t_data = tariff_in.model_dump(exclude={"id", "sub_client_id"})
                new_sub.tariffs.append(models.Tariff(**t_data))
            
            # Agregarlo a la lista del cliente (SQLAlchemy maneja el FK)
            db_client.sub_clients.append(new_sub)

    # 3. Borrar Subclientes que fueron eliminados en el Front
    for s_id, s_obj in existing_subs.items():
        if s_id not in incoming_sub_ids:
            db.delete(s_obj)

    db.commit()
    db.refresh(db_client)
    return db_client

def delete_client(db: Session, client_id: int):
    client = db.query(models.Client).filter(models.Client.id == client_id).first()
    if client:
        db.delete(client)
        db.commit()
        return True
    return False