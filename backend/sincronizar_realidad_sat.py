    import sys
    import os
    import logging
    from datetime import datetime, timezone, timedelta
    from sqlalchemy import or_

    # Aseguramos que los imports funcionen en tu entorno
    sys.path.append(os.path.dirname(os.path.abspath(__file__)))

    # --- PARCHE PARA EVITAR ERRORES DE BASE DE DATOS LOCAL ---
    try:
        import app.integrations.sat.billing_service as bs

        bs.register_sat_retry = lambda *args, **kwargs: None
    except:
        pass

    try:
        from app.models.models import ReceivableInvoice, ReceivableInvoicePayment
        from app.db.database import SessionLocal
        from app.integrations.sat.billing_service import BillingService
        from app.integrations.sat.soap_client import create_pac_client
        from app.integrations.sat.payment_service import PaymentComplementService
    except ImportError as e:
        print(f"Error de importación: {e}")
        sys.exit(1)

    # ─── MODO SIMULACIÓN (DRY-RUN) ───────────────────────────────────────────
    # True  = Solo analiza, rastrea hijos e imprime el reporte. NO CANCELA NADA.
    # False = FUEGO REAL. Ejecuta las cancelaciones ante el PAC/SAT.
    MODO_SIMULACION = True
    # ─────────────────────────────────────────────────────────────────────────

    # ─── CONFIGURACIÓN DE LOGS ───────────────────────────────────────────────
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    logger = logging.getLogger(__name__)

    PATH_ERR_LOG = (
        "/home/desarrolloas/base-foundation/backend/scripts/errores_cancelacion.log"
    )
    os.makedirs(os.path.dirname(PATH_ERR_LOG), exist_ok=True)

    error_logger = logging.getLogger("ErrorLogger")
    error_logger.setLevel(logging.ERROR)
    file_handler = logging.FileHandler(PATH_ERR_LOG, encoding="utf-8")
    file_handler.setFormatter(logging.Formatter("[%(asctime)s] %(message)s"))
    error_logger.addHandler(file_handler)
    # ─────────────────────────────────────────────────────────────────────────


    def obtener_datos_pac(client_zeep, usuario, password, uuid):
        """
        Consume el WebService obtenerDatos de Solución Factible para
        saber exactamente qué factura es antes de cancelarla.
        """
        try:
            resultado = client_zeep.service.obtenerDatos(
                usuario=usuario, password=password, uuid=uuid, folio=None, serie=None
            )
            if int(getattr(resultado, "status", 0)) == 200 and resultado.comprobantes:
                comp = resultado.comprobantes[0]
                return {
                    "tipo": getattr(comp, "etiquetaComprobante", "CFDI"),
                    "serie": getattr(comp, "nombreSerie", ""),
                    "folio": getattr(comp, "folio", ""),
                    "cliente": getattr(comp, "nombreCliente", "Desconocido"),
                    "total": getattr(comp, "importeTotal", 0.0),
                }
            return None
        except Exception as e:
            logger.error(f"Error al obtenerDatos del PAC para {uuid}: {e}")
            return None


    def verificar_y_forzar_cancelaciones():
        db = SessionLocal()
        fecha_limite = (datetime.now(timezone.utc) - timedelta(days=7)).strftime("%Y-%m-%d")

        if MODO_SIMULACION:
            logger.info("=========================================================")
            logger.info("🟡 INICIANDO EN MODO SIMULACIÓN (NO SE CANCELARÁ NADA) 🟡")
            logger.info("=========================================================\n")

        logger.info(
            f"🔎 Buscando facturas locales con estatus 'cancelado' desde el {fecha_limite}..."
        )

        try:
            facturas_canceladas_local = (
                db.query(ReceivableInvoice)
                .filter(
                    ReceivableInvoice.updated_at >= fecha_limite,
                    ReceivableInvoice.estatus == "cancelado",
                )
                .all()
            )

            if not facturas_canceladas_local:
                logger.info(
                    "Everything clean! No hay cancelaciones locales recientes que verificar."
                )
                return

            pac = BillingService(db)
            pay_svc = PaymentComplementService(db)
            client_zeep = create_pac_client(pac.wsdl_timbrado, pac.history)

            for factura in facturas_canceladas_local:
                if not factura.uuid:
                    continue

                try:
                    # 1. Consultar estatus real en el SAT
                    resultado_sat = pac.consultar_estatus_sat(factura.uuid)
                    estado_sat = str(resultado_sat.get("estado", "")).lower()
                    es_cancelable = str(resultado_sat.get("es_cancelable", "")).lower()

                    if "vigente" in estado_sat:
                        logger.info(
                            f"\n⚠️ DISCREPANCIA DETECTADA: {factura.folio_interno} está VIGENTE en el SAT pero CANCELADA localmente."
                        )

                        # 2. MATCH REALIDAD: Obtener los datos reales del PAC
                        datos_pac = obtener_datos_pac(
                            client_zeep, pac.pac_user, pac.pac_pass, factura.uuid
                        )
                        if datos_pac:
                            logger.info(
                                f"   📄 Datos PAC -> Tipo: {datos_pac['tipo']}, Cliente: {datos_pac['cliente']}, Total: ${datos_pac['total']}"
                            )

                        # 3. VERIFICAR BLOQUEO DEL SAT (No Cancelable)
                        if "no cancelable" in es_cancelable:
                            logger.warning(
                                f"   🚫 Estado SAT: NO CANCELABLE. Buscando 'hijos' que la mantienen bloqueada..."
                            )

                            # A) Buscar Facturas/Cartas Porte Relacionadas
                            hijos_cfdi = (
                                db.query(ReceivableInvoice)
                                .filter(
                                    or_(
                                        ReceivableInvoice.uuid_relacionado == factura.uuid,
                                        ReceivableInvoice.factura_padre_id == factura.id,
                                    ),
                                    ReceivableInvoice.status_sat == "TIMBRADA",
                                    ReceivableInvoice.record_status != "E",
                                )
                                .all()
                            )

                            # B) Buscar Complementos de Pago (REPs)
                            hijos_rep = (
                                db.query(ReceivableInvoicePayment)
                                .filter(
                                    ReceivableInvoicePayment.invoice_id == factura.id,
                                    ReceivableInvoicePayment.estatus == "ACTIVO",
                                    ReceivableInvoicePayment.complemento_uuid.isnot(None),
                                )
                                .all()
                            )

                            if not hijos_cfdi and not hijos_rep:
                                logger.error(
                                    f"   ❌ No se encontraron hijos locales para {factura.folio_interno}. Debe haber un documento externo en el portal del SAT que la bloquea."
                                )
                                continue

                            # C) Procesar a los hijos
                            for hijo in hijos_cfdi:
                                if MODO_SIMULACION:
                                    logger.info(
                                        f"   [SIMULACIÓN] 🔪 Se enviaría cancelación para Factura Hija: {hijo.folio_interno} (UUID: {hijo.uuid})"
                                    )
                                else:
                                    logger.info(
                                        f"   🔪 Cortando raíz: Cancelando Factura Hija {hijo.folio_interno} (UUID: {hijo.uuid})"
                                    )
                                    pac.cancelar_factura_sat(hijo.id, motivo="02")

                            for rep in hijos_rep:
                                if MODO_SIMULACION:
                                    logger.info(
                                        f"   [SIMULACIÓN] 🔪 Se enviaría cancelación para Complemento de Pago ID: {rep.id} (UUID: {rep.complemento_uuid})"
                                    )
                                else:
                                    logger.info(
                                        f"   🔪 Cortando raíz: Cancelando Complemento de Pago ID {rep.id} (UUID: {rep.complemento_uuid})"
                                    )
                                    pay_svc.cancelar_pago_sat(rep.id, motivo="02")

                            if not MODO_SIMULACION:
                                logger.info(
                                    f"   ⏳ Hijos de {factura.folio_interno} mandados a cancelar. El SAT liberará el candado pronto. Se reintentará al padre en la siguiente corrida."
                                )
                            continue  # Evitamos intentar cancelar al padre en esta misma corrida

                        # 4. CANCELACIÓN FORZADA (El CFDI sí es cancelable)
                        if MODO_SIMULACION:
                            logger.info(
                                f"   [SIMULACIÓN] 🚀 Se enviaría la cancelación forzada al SAT para el padre: {factura.folio_interno} (UUID: {factura.uuid})"
                            )
                        else:
                            logger.info(
                                f"🚀 Forzando petición de cancelación real ante el SAT para {factura.folio_interno}..."
                            )
                            uuid_formateado = f"{factura.uuid.strip()}|02"

                            with open(pac.path_cer, "rb") as f_cer:
                                cer_bytes = f_cer.read()
                            with open(pac.path_key, "rb") as f_key:
                                key_bytes = f_key.read()

                            resultado_cancelacion = client_zeep.service.cancelar(
                                usuario=pac.pac_user,
                                password=pac.pac_pass,
                                uuids=[uuid_formateado],
                                derCertCSD=cer_bytes,
                                derKeyCSD=key_bytes,
                                contrasenaCSD=pac.key_password,
                            )

                            res_sat = resultado_cancelacion.resultados[0]
                            codigo_sat = int(getattr(res_sat, "status", 0))
                            mensaje_sat = str(getattr(res_sat, "mensaje", ""))

                            if (
                                codigo_sat in [201, 202, 211]
                                or "proceso" in mensaje_sat.lower()
                                or "previamente" in mensaje_sat.lower()
                            ):
                                factura.status_sat = (
                                    "CANCELADO"
                                    if codigo_sat == 202
                                    else "PROCESO_CANCELACION"
                                )
                                factura.detalle_sat = (
                                    f"Cancelación forzada exitosa: {mensaje_sat}"
                                )
                                db.commit()
                                logger.info(
                                    f"✅ ¡Éxito! El SAT aceptó la cancelación forzada para {factura.folio_interno}."
                                )
                            else:
                                error_logger.error(
                                    f"ERROR DE CANCELACIÓN FORZADA en {factura.folio_interno}: {mensaje_sat} (Código: {codigo_sat})"
                                )

                except Exception as e:
                    error_logger.error(
                        f"FALLA DE CONEXIÓN/EJECUCIÓN en {factura.folio_interno}: {str(e)}"
                    )

        except Exception as e:
            error_logger.error(f"Error general: {str(e)}")
        finally:
            if MODO_SIMULACION:
                logger.info("\n=========================================================")
                logger.info("🟡 FIN DE SIMULACIÓN. CAMBIA 'MODO_SIMULACION = False' 🟡")
                logger.info("=========================================================")
            db.close()


    if __name__ == "__main__":
        verificar_y_forzar_cancelaciones()
