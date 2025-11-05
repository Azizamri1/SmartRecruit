"""Add company_website to users table

Revision ID: add_company_website
Revises: ceacb6415b96
Create Date: 2025-11-02 15:56:00.000000

"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "add_company_website"
down_revision = "ceacb6415b96"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("company_website", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "company_website")

