"""fix_is_active_default

Revision ID: 246be7628385
Revises: 4ca457af97da
Create Date: 2026-06-06 11:11:50.026301

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "246be7628385"
down_revision: Union[str, Sequence[str], None] = "4ca457af97da"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        "topic",
        "is_active",
        server_default="true",
        existing_type=sa.Boolean(),
        existing_nullable=False,
    )


def downgrade() -> None:
    op.alter_column(
        "topic",
        "is_active",
        server_default=None,
        existing_type=sa.Boolean(),
        existing_nullable=False,
    )
