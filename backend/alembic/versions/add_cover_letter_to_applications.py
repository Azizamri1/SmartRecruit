"""add_cover_letter_and_cv_id_to_applications

Revision ID: add_cover_letter_and_cv_id_to_applications
Revises: add_company_logo_and_desc
Create Date: 2025-10-15 13:08:40.000000

"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "add_cover_letter_and_cv_id_to_applications"
down_revision = "add_company_logo_and_desc"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("applications", sa.Column("cover_letter", sa.Text(), nullable=True))
    op.add_column("applications", sa.Column("cv_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_applications_cv_id_cvs",
        "applications",
        "cvs",
        ["cv_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("fk_applications_cv_id_cvs", "applications", type_="foreignkey")
    op.drop_column("applications", "cv_id")
    op.drop_column("applications", "cover_letter")

