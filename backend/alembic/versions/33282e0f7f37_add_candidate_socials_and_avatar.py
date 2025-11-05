"""Add candidate socials and avatar

Revision ID: 33282e0f7f37
Revises: 7f2180804bd8
Create Date: 2025-11-02 17:03:08.948226

"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "33282e0f7f37"
down_revision = "7f2180804bd8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("github_url", sa.Text(), nullable=True))
    op.add_column("users", sa.Column("profile_picture_url", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "profile_picture_url")
    op.drop_column("users", "github_url")
