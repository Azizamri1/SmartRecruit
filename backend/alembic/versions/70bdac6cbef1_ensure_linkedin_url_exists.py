"""Ensure linkedin_url exists

Revision ID: 70bdac6cbef1
Revises: 33282e0f7f37
Create Date: 2025-11-02 17:11:00.781490

"""

from alembic import op

# revision identifiers, used by Alembic.
revision = "70bdac6cbef1"
down_revision = "33282e0f7f37"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Postgres-safe + idempotent - ensure all social columns exist
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS linkedin_url TEXT;")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS github_url TEXT;")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;")


def downgrade() -> None:
    # Reversible - remove the columns if they exist
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS linkedin_url;")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS github_url;")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS profile_picture_url;")

