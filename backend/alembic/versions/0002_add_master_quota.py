"""Add master_quota table

Revision ID: 0002
Revises: 0001
Create Date: 2026-03-10 00:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "master_quota",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("quota_limit", sa.Integer(), nullable=False, server_default="800"),
        sa.Column("quota_used", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("reset_date", sa.Date(), nullable=True),
    )
    # Pre-insert the singleton row so it exists from day 1
    op.execute(
        "INSERT INTO master_quota (id, quota_limit, quota_used) VALUES (1, 800, 0)"
    )


def downgrade() -> None:
    op.drop_table("master_quota")
