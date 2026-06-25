"""add video.uploaded_by

Revision ID: b8e4d2f6a1c7
Revises: a7f3c1d9e2b4
Create Date: 2026-06-25 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b8e4d2f6a1c7'
down_revision: Union[str, Sequence[str], None] = 'a7f3c1d9e2b4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('video', sa.Column('uploaded_by', sa.String(), nullable=True))
    op.create_index(op.f('ix_video_uploaded_by'), 'video', ['uploaded_by'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_video_uploaded_by'), table_name='video')
    op.drop_column('video', 'uploaded_by')
