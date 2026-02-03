"""add 2fa columns to users

Revision ID: 66fb0508c013
Revises: 0fce0a63f1ac
Create Date: 2026-02-03 19:52:06.255924

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '66fb0508c013'
down_revision = '0fce0a63f1ac'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("two_factor_secret", sa.Text(), nullable=True))
    op.add_column(
        "users",
        sa.Column("is_2fa_enabled", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )

def downgrade() -> None:
    op.drop_column("users", "is_2fa_enabled")
    op.drop_column("users", "two_factor_secret")
