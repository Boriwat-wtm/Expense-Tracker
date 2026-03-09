"""Initial schema — users and transactions tables

Revision ID: 0001
Revises:
Create Date: 2026-03-09 00:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("username", sa.String(50), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column(
            "ocr_quota_used", sa.Integer(), nullable=False, server_default="0"
        ),
        sa.Column("ocr_quota_reset_date", sa.Date(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_users_username", "users", ["username"], unique=True)
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "transactions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("amount", sa.Numeric(15, 2), nullable=False),
        sa.Column("description", sa.String(500), nullable=True),
        sa.Column(
            "type",
            sa.Enum("income", "expense", name="transactiontype"),
            nullable=False,
        ),
        sa.Column(
            "source",
            sa.Enum("slip", "pdf", "manual", name="transactionsource"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_transactions_user_id", "transactions", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_transactions_user_id", table_name="transactions")
    op.drop_table("transactions")
    op.execute("DROP TYPE IF EXISTS transactiontype")
    op.execute("DROP TYPE IF EXISTS transactionsource")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_index("ix_users_username", table_name="users")
    op.drop_table("users")
