"""unify_experience_to_single_string_field

Revision ID: ceacb6415b96
Revises: e6d743d8a2a6
Create Date: 2025-10-13 15:09:59.166277

"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "ceacb6415b96"
down_revision = "e6d743d8a2a6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Skip company_name, deadline, status if already exist
    op.add_column("jobs", sa.Column("company_logo_url", sa.Text(), nullable=True))
    op.add_column("jobs", sa.Column("location_city", sa.Text(), nullable=True))
    op.add_column("jobs", sa.Column("location_country", sa.Text(), nullable=True))
    op.add_column("jobs", sa.Column("experience_min", sa.Text(), nullable=True))
    op.add_column("jobs", sa.Column("employment_type", sa.Text(), nullable=True))
    op.add_column("jobs", sa.Column("work_mode", sa.Text(), nullable=True))
    op.add_column("jobs", sa.Column("salary_min", sa.Integer(), nullable=True))
    op.add_column("jobs", sa.Column("salary_max", sa.Integer(), nullable=True))
    op.add_column("jobs", sa.Column("salary_currency", sa.Text(), nullable=True))
    op.add_column(
        "jobs",
        sa.Column(
            "salary_is_confidential",
            sa.Boolean(),
            server_default=sa.text("false"),
            nullable=False,
        ),
    )
    op.add_column("jobs", sa.Column("education_level", sa.Text(), nullable=True))
    op.add_column("jobs", sa.Column("company_overview", sa.Text(), nullable=True))
    op.add_column("jobs", sa.Column("offer_description", sa.Text(), nullable=True))
    op.add_column("jobs", sa.Column("missions", sa.Text(), nullable=True))
    op.add_column("jobs", sa.Column("profile_requirements", sa.Text(), nullable=True))
    op.add_column("jobs", sa.Column("skills", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("jobs", "skills")
    op.drop_column("jobs", "profile_requirements")
    op.drop_column("jobs", "missions")
    op.drop_column("jobs", "offer_description")
    op.drop_column("jobs", "company_overview")
    op.drop_column("jobs", "education_level")
    op.drop_column("jobs", "salary_is_confidential")
    op.drop_column("jobs", "salary_currency")
    op.drop_column("jobs", "salary_max")
    op.drop_column("jobs", "salary_min")
    op.drop_column("jobs", "work_mode")
    op.drop_column("jobs", "employment_type")
    op.drop_column("jobs", "experience_min")
    op.drop_column("jobs", "location_country")
    op.drop_column("jobs", "location_city")
    op.drop_column("jobs", "company_logo_url")
