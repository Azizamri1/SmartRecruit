"""merge heads REV_A and REV_B

Revision ID: 03eb0c5a16bf
Revises: 6e0bd79cd545, add_company_logo_and_desc
Create Date: 2025-10-15 12:30:06.710991

"""

from typing import Sequence, Union

# revision identifiers, used by Alembic.
revision: str = "03eb0c5a16bf"
down_revision: Union[str, Sequence[str], None] = (
    "6e0bd79cd545",
    "add_company_logo_and_desc",
)
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass

