"""merge heads REV_A and REV_B

Revision ID: 7f2180804bd8
Revises: 03eb0c5a16bf, add_cover_letter_and_cv_id_to_applications
Create Date: 2025-10-15 12:57:42.565789

"""

from typing import Sequence, Union

# revision identifiers, used by Alembic.
revision: str = "7f2180804bd8"
down_revision: Union[str, Sequence[str], None] = (
    "03eb0c5a16bf",
    "add_cover_letter_and_cv_id_to_applications",
)
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
