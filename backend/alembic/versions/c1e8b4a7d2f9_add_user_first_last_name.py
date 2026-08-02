"""add user.first_name and user.last_name

Revision ID: c1e8b4a7d2f9
Revises: 0f04fcd125d2
Create Date: 2026-08-02 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c1e8b4a7d2f9'
down_revision: Union[str, Sequence[str], None] = '0f04fcd125d2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('user', sa.Column('first_name', sa.String(), nullable=True))
    op.add_column('user', sa.Column('last_name', sa.String(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('user', 'last_name')
    op.drop_column('user', 'first_name')
