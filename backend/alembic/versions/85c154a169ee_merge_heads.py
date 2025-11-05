"""merge heads

Revision ID: 85c154a169ee
Revises: 70bdac6cbef1, add_company_website, add_unique_constraint_user_job_application, add_user_location_city_country
Create Date: 2025-11-04 13:43:31.144020

"""

from typing import Sequence, Union

# revision identifiers, used by Alembic.
revision: str = "85c154a169ee"
down_revision: Union[str, Sequence[str], None] = (
    "70bdac6cbef1",
    "add_company_website",
    "123456789abc",
    "add_user_location_city_country",
)
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
