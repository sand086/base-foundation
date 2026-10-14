"""indices en llaves foraneas y record_status

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-10-14
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "b2c3d4e5f6a7"
down_revision: Union[str, None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

PREFIX = "ix_perf_"
STATUS_TABLES = ["trips", "trip_legs", "receivable_invoices", "payable_invoices"]


def upgrade() -> None:
    insp = sa.inspect(op.get_bind())
    for table in insp.get_table_names():
        indexed = {tuple(i["column_names"][:1]) for i in insp.get_indexes(table)}
        pk = tuple(insp.get_pk_constraint(table).get("constrained_columns", [])[:1])
        indexed.add(pk)
        wanted = {fk["constrained_columns"][0] for fk in insp.get_foreign_keys(table)}
        if table in STATUS_TABLES and "record_status" in {
            c["name"] for c in insp.get_columns(table)
        }:
            wanted.add("record_status")
        for col in sorted(wanted):
            if (col,) in indexed:
                continue
            op.create_index(f"{PREFIX}{table}_{col}"[:63], table, [col])


def downgrade() -> None:
    insp = sa.inspect(op.get_bind())
    for table in insp.get_table_names():
        for idx in insp.get_indexes(table):
            if idx["name"].startswith(PREFIX):
                op.drop_index(idx["name"], table_name=table)
