"""add video table

Revision ID: a7f3c1d9e2b4
Revises: f1a2b3c4d5e6
Create Date: 2026-06-25 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a7f3c1d9e2b4'
down_revision: Union[str, Sequence[str], None] = 'f1a2b3c4d5e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'video',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('description', sa.String(), nullable=False),
        sa.Column('privacy_status', sa.String(), nullable=False),
        sa.Column('s3_key', sa.String(), nullable=True),
        sa.Column('s3_url', sa.String(), nullable=True),
        sa.Column('youtube_video_id', sa.String(), nullable=True),
        sa.Column('youtube_url', sa.String(), nullable=True),
        sa.Column(
            'status',
            sa.Enum('PENDING', 'S3_UPLOADED', 'COMPLETED', 'FAILED', name='videostatus'),
            nullable=False,
        ),
        sa.Column('error', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_video_title'), 'video', ['title'], unique=False)
    op.create_index(op.f('ix_video_status'), 'video', ['status'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_video_status'), table_name='video')
    op.drop_index(op.f('ix_video_title'), table_name='video')
    op.drop_table('video')
    sa.Enum(name='videostatus').drop(op.get_bind(), checkfirst=True)
