import argparse
import csv
import logging
import os
import re
import sys
from collections import defaultdict
from datetime import datetime
from pathlib import Path

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.database import SessionLocal
from app.models.models import ReceivableInvoicePayment


logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("rep_duplicate_audit")

UUID_RE = re.compile(
    r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-"
    r"[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
)


def _norm_key(value: str) -> str:
    return re.sub(r"[^a-z0-9]", "", str(value or "").strip().lower())


def _row_value(row: dict, *names: str) -> str:
    lookup = {_norm_key(k): v for k, v in row.items()}
    for name in names:
        value = lookup.get(_norm_key(name))
        if value is not None:
            return str(value).strip()
    return ""


def _sniff_dialect(path: Path):
    with path.open("r", encoding="utf-8-sig", newline="") as fh:
        sample = fh.read(4096)
        fh.seek(0)
        try:
            return csv.Sniffer().sniff(sample, delimiters=",;\t|")
        except csv.Error:
            return csv.excel


def audit_pac_export(path: Path) -> list[dict]:
    logger.info("Leyendo export PAC/Solucion Factible: %s", path)
    dialect = _sniff_dialect(path)
    groups: dict[tuple[str, str, str, str], list[dict]] = defaultdict(list)

    with path.open("r", encoding="utf-8-sig", newline="") as fh:
        reader = csv.DictReader(fh, dialect=dialect)
        for row in reader:
            tipo = _row_value(row, "Tipo")
            serie = _row_value(row, "Serie").upper()
            folio = _row_value(row, "Folio")
            uuid = _row_value(row, "UUID").upper()
            cancelado = _row_value(row, "Cancelado").lower()
            if tipo and "cfdi" not in tipo.lower():
                continue
            if cancelado in {"si", "true", "1", "cancelado"}:
                continue
            if serie != "COM" or not folio or not UUID_RE.match(uuid):
                continue

            key = (
                _row_value(row, "RFC Emisor").upper(),
                _row_value(row, "RFC Receptor").upper(),
                serie,
                folio,
            )
            groups[key].append(
                {
                    "source": "pac_export",
                    "duplicate_key": "|".join(key),
                    "folio": folio,
                    "serie": serie,
                    "rfc_emisor": key[0],
                    "rfc_receptor": key[1],
                    "uuid": uuid,
                    "emitted_at": _row_value(row, "Emitido"),
                    "stamped_at": _row_value(row, "Timbrado"),
                    "importe": _row_value(row, "Importe"),
                    "local_payment_ids": "",
                    "local_invoice_ids": "",
                    "status": "CANDIDATO_DUPLICADO",
                    "action": "Revisar fiscalmente y cancelar UUID duplicados en PAC/SAT.",
                }
            )

    report_rows = []
    for rows in groups.values():
        if len({row["uuid"] for row in rows}) > 1:
            report_rows.extend(rows)
    return report_rows


def audit_local_db() -> list[dict]:
    logger.info("Auditando pagos REP locales en BD...")
    db = SessionLocal()
    try:
        payments = (
            db.query(ReceivableInvoicePayment)
            .filter(ReceivableInvoicePayment.folio_complemento.like("COM-%"))
            .all()
        )
        by_folio: dict[str, dict[str, dict]] = defaultdict(dict)

        for payment in payments:
            folio = str(payment.folio_complemento or "").strip()
            uuid = str(payment.complemento_uuid or "").strip().upper()
            if not folio or not UUID_RE.match(uuid):
                continue
            if str(payment.estatus or "").upper() in {"CANCELADO", "ELIMINADO"}:
                continue

            entry = by_folio[folio].setdefault(
                uuid,
                {
                    "source": "local_db",
                    "duplicate_key": folio,
                    "folio": folio,
                    "serie": "COM",
                    "rfc_emisor": "",
                    "rfc_receptor": "",
                    "uuid": uuid,
                    "emitted_at": "",
                    "stamped_at": "",
                    "importe": 0.0,
                    "local_payment_ids": [],
                    "local_invoice_ids": [],
                    "status": "CANDIDATO_DUPLICADO",
                    "action": "Revisar fiscalmente antes de cancelar; no se cancela automaticamente.",
                },
            )
            entry["importe"] += float(payment.monto or 0)
            entry["local_payment_ids"].append(str(payment.id))
            entry["local_invoice_ids"].append(str(payment.invoice_id))

        report_rows = []
        for folio, uuid_map in by_folio.items():
            if len(uuid_map) <= 1:
                continue
            for entry in uuid_map.values():
                entry["importe"] = f"{entry['importe']:.2f}"
                entry["local_payment_ids"] = ",".join(entry["local_payment_ids"])
                entry["local_invoice_ids"] = ",".join(entry["local_invoice_ids"])
                report_rows.append(entry)
        return report_rows
    finally:
        db.close()


def write_report(rows: list[dict], output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = [
        "source",
        "duplicate_key",
        "serie",
        "folio",
        "rfc_emisor",
        "rfc_receptor",
        "uuid",
        "emitted_at",
        "stamped_at",
        "importe",
        "local_payment_ids",
        "local_invoice_ids",
        "status",
        "action",
    ]
    with output_path.open("w", encoding="utf-8-sig", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Genera reporte CSV de REPs duplicados candidatos a revision fiscal."
    )
    parser.add_argument(
        "--pac-export",
        type=Path,
        help="CSV exportado desde Solucion Factible/SAT para cruzar duplicados externos.",
    )
    parser.add_argument(
        "--skip-local",
        action="store_true",
        help="No consulta la BD local; util cuando solo se quiere revisar el CSV PAC.",
    )
    parser.add_argument("--output", type=Path, help="Ruta CSV de salida.")
    args = parser.parse_args()

    rows: list[dict] = []
    if not args.skip_local:
        rows.extend(audit_local_db())
    if args.pac_export:
        rows.extend(audit_pac_export(args.pac_export))

    output_path = args.output
    if not output_path:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_path = (
            Path(__file__).resolve().parent
            / "reportes"
            / f"reps_duplicados_{timestamp}.csv"
        )

    write_report(rows, output_path)
    logger.info("Reporte generado: %s (%s filas)", output_path, len(rows))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
