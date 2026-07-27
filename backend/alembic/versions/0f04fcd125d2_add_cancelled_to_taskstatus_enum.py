"""add cancelled to taskstatus enum

Revision ID: 0f04fcd125d2
Revises: a1b2c3d4e5f6
Create Date: 2026-07-27 21:55:17.753575

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0f04fcd125d2'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade():
    op.execute("ALTER TYPE taskstatus ADD VALUE 'CANCELLED'")


def downgrade() -> None:
    """Downgrade schema."""
    pass
