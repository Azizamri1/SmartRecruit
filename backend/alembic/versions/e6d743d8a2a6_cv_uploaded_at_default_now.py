"""cv uploaded_at default now

Revision ID: e6d743d8a2a6
Revises: 86614ed6b155
Create Date: 2025-10-09 18:01:30.258788

"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "e6d743d8a2a6"
down_revision = "86614ed6b155"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        "cvs",
        "uploaded_at",
        existing_type=sa.DateTime(timezone=True),
        server_default=sa.text("NOW()"),
        existing_nullable=True,
    )


def downgrade() -> None:
    op.alter_column(
        "cvs",
        "uploaded_at",
        existing_type=sa.DateTime(timezone=True),
        server_default=None,
        existing_nullable=True,
    )
