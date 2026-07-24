"""add rep idempotency batches

Revision ID: b7c8d9e0f1a2
Revises: a1b2c3d4e5f6
Create Date: 2026-07-22
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "b7c8d9e0f1a2"
down_revision: Union[str, None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _audit_columns() -> list[sa.Column]:
    return [
        sa.Column(
            "record_status",
            sa.Enum(
                "A",
                "I",
                "E",
                name="recordstatus",
                native_enum=True,
                create_type=False,
            ),
            server_default="A",
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("created_by_id", sa.Integer(), nullable=True),
        sa.Column("updated_by_id", sa.Integer(), nullable=True),
    ]


def upgrade() -> None:
    op.create_table(
        "sat_folio_counters",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("series", sa.String(length=20), nullable=False),
        sa.Column("next_value", sa.Integer(), server_default="1", nullable=False),
        sa.Column("descripcion", sa.String(length=120), nullable=True),
        *_audit_columns(),
        sa.ForeignKeyConstraint(["created_by_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["updated_by_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("series"),
    )
    op.create_index("ix_sat_folio_counters_id", "sat_folio_counters", ["id"])
    op.create_index(
        "ix_sat_folio_counters_series",
        "sat_folio_counters",
        ["series"],
        unique=True,
    )

    op.create_table(
        "receivable_payment_batches",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("idempotency_key", sa.String(length=160), nullable=False),
        sa.Column("operation_fingerprint", sa.String(length=64), nullable=False),
        sa.Column("folio_complemento", sa.String(length=50), nullable=False),
        sa.Column("complemento_uuid", sa.String(length=36), nullable=True),
        sa.Column(
            "status",
            sa.String(length=40),
            server_default="TIMBRANDO",
            nullable=False,
        ),
        sa.Column(
            "request_payload",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default="{}",
            nullable=True,
        ),
        sa.Column("sat_error_log", sa.Text(), nullable=True),
        sa.Column("pac_status_code", sa.Integer(), nullable=True),
        sa.Column("locked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("bank_movements_created_at", sa.DateTime(timezone=True), nullable=True),
        *_audit_columns(),
        sa.ForeignKeyConstraint(["created_by_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["updated_by_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("complemento_uuid", name="uq_rep_batch_complemento_uuid"),
        sa.UniqueConstraint("folio_complemento", name="uq_rep_batch_folio_complemento"),
        sa.UniqueConstraint("idempotency_key", name="uq_rep_batch_idempotency_key"),
        sa.UniqueConstraint(
            "operation_fingerprint", name="uq_rep_batch_operation_fingerprint"
        ),
    )
    op.create_index("ix_receivable_payment_batches_id", "receivable_payment_batches", ["id"])
    op.create_index(
        "ix_rep_batch_status",
        "receivable_payment_batches",
        ["status"],
    )

    op.add_column(
        "receivable_invoice_payments",
        sa.Column("payment_batch_id", sa.Integer(), nullable=True),
    )
    op.create_index(
        "ix_receivable_invoice_payments_payment_batch_id",
        "receivable_invoice_payments",
        ["payment_batch_id"],
    )
    op.create_foreign_key(
        "fk_receivable_invoice_payments_payment_batch_id",
        "receivable_invoice_payments",
        "receivable_payment_batches",
        ["payment_batch_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_receivable_invoice_payments_payment_batch_id",
        "receivable_invoice_payments",
        type_="foreignkey",
    )
    op.drop_index(
        "ix_receivable_invoice_payments_payment_batch_id",
        table_name="receivable_invoice_payments",
    )
    op.drop_column("receivable_invoice_payments", "payment_batch_id")

    op.drop_index("ix_rep_batch_status", table_name="receivable_payment_batches")
    op.drop_index("ix_receivable_payment_batches_id", table_name="receivable_payment_batches")
    op.drop_table("receivable_payment_batches")

    op.drop_index("ix_sat_folio_counters_series", table_name="sat_folio_counters")
    op.drop_index("ix_sat_folio_counters_id", table_name="sat_folio_counters")
    op.drop_table("sat_folio_counters")
