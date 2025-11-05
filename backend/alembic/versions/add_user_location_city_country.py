"""add user location city country

Revision ID: add_user_location_city_country
Revises: ceacb6415b96
Create Date: 2025-11-04 12:45:00.000000

"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "add_user_location_city_country"
down_revision = "ceacb6415b96"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users", sa.Column("location_city", sa.String(length=120), nullable=True)
    )
    op.add_column(
        "users", sa.Column("location_country", sa.String(length=120), nullable=True)
    )


def downgrade() -> None:
    op.drop_column("users", "location_country")
    op.drop_column("users", "location_city")

