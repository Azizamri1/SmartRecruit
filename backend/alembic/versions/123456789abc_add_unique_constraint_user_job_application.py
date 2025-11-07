"""add_unique_constraint_user_job_application

Revision ID: 123456789abc
Revises: ceacb6415b96
Create Date: 2025-11-03 12:26:00.000000

"""

from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = "123456789abc"
down_revision = "ceacb6415b96"
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()

    # OPTIONAL: back up dup rows before deleting
    conn.execute(
        text(
            """
    CREATE TABLE IF NOT EXISTS applications_dups_backup AS
    SELECT *
    FROM applications a
    WHERE EXISTS (
      SELECT 1
      FROM applications x
      WHERE x.user_id = a.user_id
        AND x.job_id  = a.job_id
        AND x.id     <> a.id
    );
    """
        )
    )

    # remove duplicates: keep the smallest id per (user_id, job_id)
    conn.execute(
        text(
            """
    WITH dups AS (
      SELECT user_id, job_id, MIN(id) AS keep_id
      FROM applications
      GROUP BY user_id, job_id
      HAVING COUNT(*) > 1
    )
    DELETE FROM applications a
    USING dups
    WHERE a.user_id = dups.user_id
      AND a.job_id  = dups.job_id
      AND a.id     <> dups.keep_id;
    """
        )
    )

    # now add the unique constraint
    op.create_unique_constraint(
        "unique_user_job_application",
        "applications",
        ["user_id", "job_id"],
    )


def downgrade() -> None:
    # Drop the unique constraint
    op.drop_constraint("unique_user_job_application", "applications", type_="unique")

