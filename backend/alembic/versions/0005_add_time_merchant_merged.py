"""Add transaction_time, merchant_name columns and merged enum value

Revision ID: 0005
Revises: 0004
Create Date: 2026-03-10 00:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0005"
down_revision: Union[str, None] = "0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "transactions",
        sa.Column("transaction_time", sa.Time(), nullable=True),
    )
    op.add_column(
        "transactions",
        sa.Column("merchant_name", sa.String(255), nullable=True),
    )
    # Add 'merged' value to the PostgreSQL enum (safe to run multiple times)
    op.execute("ALTER TYPE transactionsource ADD VALUE IF NOT EXISTS 'merged'")


def downgrade() -> None:
    op.drop_column("transactions", "transaction_time")
    op.drop_column("transactions", "merchant_name")
    # Note: removing a value from a PostgreSQL enum requires recreating the type.
    # For simplicity, the enum value is left in place on downgrade.
