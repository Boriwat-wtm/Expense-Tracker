"""Add role column to users table

Revision ID: 0003
Revises: 0002
Create Date: 2026-03-10 00:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create the enum type first (PostgreSQL requires explicit type creation)
    userrole = sa.Enum("admin", "user", name="userrole")
    userrole.create(op.get_bind(), checkfirst=True)

    op.add_column(
        "users",
        sa.Column(
            "role",
            sa.Enum("admin", "user", name="userrole"),
            nullable=False,
            server_default="user",
        ),
    )


def downgrade() -> None:
    op.drop_column("users", "role")
    sa.Enum(name="userrole").drop(op.get_bind(), checkfirst=True)
