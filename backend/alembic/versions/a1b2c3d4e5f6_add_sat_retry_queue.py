"""add sat retry queue

Revision ID: a1b2c3d4e5f6
Revises: 66fb0508c013
Create Date: 2026-07-08
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "66fb0508c013"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "sat_retry_queue",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("invoice_id", sa.Integer(), nullable=False),
        sa.Column("viaje_id", sa.Integer(), nullable=True),
        sa.Column("operation_type", sa.String(length=30), nullable=False),
        sa.Column("document_type", sa.String(length=30), nullable=False),
        sa.Column("source_service", sa.String(length=80), nullable=True),
        sa.Column("status", sa.String(length=30), nullable=False),
        sa.Column("idempotency_key", sa.String(length=160), nullable=False),
        sa.Column("folio_interno", sa.String(length=50), nullable=True),
        sa.Column("uuid", sa.String(length=36), nullable=True),
        sa.Column(
            "request_payload",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default="{}",
            nullable=True,
        ),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column("last_http_status", sa.Integer(), nullable=True),
        sa.Column("attempts", sa.Integer(), server_default="0", nullable=False),
        sa.Column("max_attempts", sa.Integer(), server_default="5", nullable=False),
        sa.Column("next_attempt_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_attempt_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("locked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "record_status",
            sa.Enum(
                "A",
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
        sa.ForeignKeyConstraint(
            ["created_by_id"], ["users.id"], ondelete="SET NULL"
        ),
        sa.ForeignKeyConstraint(
            ["invoice_id"], ["receivable_invoices.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["updated_by_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["viaje_id"], ["trips.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("idempotency_key"),
    )
    op.create_index("ix_sat_retry_queue_id", "sat_retry_queue", ["id"])
    op.create_index(
        "ix_sat_retry_queue_idempotency_key",
        "sat_retry_queue",
        ["idempotency_key"],
        unique=True,
    )
    op.create_index("ix_sat_retry_queue_invoice_id", "sat_retry_queue", ["invoice_id"])
    op.create_index(
        "ix_sat_retry_queue_status_next_attempt",
        "sat_retry_queue",
        ["status", "next_attempt_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_sat_retry_queue_status_next_attempt", table_name="sat_retry_queue")
    op.drop_index("ix_sat_retry_queue_invoice_id", table_name="sat_retry_queue")
    op.drop_index("ix_sat_retry_queue_idempotency_key", table_name="sat_retry_queue")
    op.drop_index("ix_sat_retry_queue_id", table_name="sat_retry_queue")
    op.drop_table("sat_retry_queue")
