"""add roles, languages, teaching subjects

Revision ID: c6e7abfcc0c9
Revises: db775bf8f855
Create Date: 2026-06-23 00:00:00.000000

"""
from datetime import datetime, timezone
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c6e7abfcc0c9'
down_revision: Union[str, Sequence[str], None] = 'db775bf8f855'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # language
    language_table = op.create_table(
        'language',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('code', sa.String(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_language_name'), 'language', ['name'], unique=True)

    # userrole
    op.create_table(
        'userrole',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column(
            'role',
            sa.Enum('TEACHER', 'TRANSLATOR', name='roletype'),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'role', name='uq_user_role'),
    )
    op.create_index(op.f('ix_userrole_user_id'), 'userrole', ['user_id'], unique=False)
    op.create_index(op.f('ix_userrole_role'), 'userrole', ['role'], unique=False)

    # userteachingsubject
    op.create_table(
        'userteachingsubject',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('topic_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ),
        sa.ForeignKeyConstraint(['topic_id'], ['topic.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'topic_id', name='uq_user_teaching_subject'),
    )
    op.create_index(
        op.f('ix_userteachingsubject_user_id'), 'userteachingsubject', ['user_id'], unique=False
    )
    op.create_index(
        op.f('ix_userteachingsubject_topic_id'), 'userteachingsubject', ['topic_id'], unique=False
    )

    # userlanguage
    op.create_table(
        'userlanguage',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('language_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ),
        sa.ForeignKeyConstraint(['language_id'], ['language.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'language_id', name='uq_user_language'),
    )
    op.create_index(
        op.f('ix_userlanguage_user_id'), 'userlanguage', ['user_id'], unique=False
    )
    op.create_index(
        op.f('ix_userlanguage_language_id'), 'userlanguage', ['language_id'], unique=False
    )

    # seed starter languages
    now = datetime.now(timezone.utc)
    op.bulk_insert(
        language_table,
        [
            {'name': 'French', 'code': 'fr', 'is_active': True, 'created_at': now, 'updated_at': now},
            {'name': 'Urdu', 'code': 'ur', 'is_active': True, 'created_at': now, 'updated_at': now},
            {'name': 'Bengali', 'code': 'bn', 'is_active': True, 'created_at': now, 'updated_at': now},
        ],
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_userlanguage_language_id'), table_name='userlanguage')
    op.drop_index(op.f('ix_userlanguage_user_id'), table_name='userlanguage')
    op.drop_table('userlanguage')

    op.drop_index(op.f('ix_userteachingsubject_topic_id'), table_name='userteachingsubject')
    op.drop_index(op.f('ix_userteachingsubject_user_id'), table_name='userteachingsubject')
    op.drop_table('userteachingsubject')

    op.drop_index(op.f('ix_userrole_role'), table_name='userrole')
    op.drop_index(op.f('ix_userrole_user_id'), table_name='userrole')
    op.drop_table('userrole')

    op.drop_index(op.f('ix_language_name'), table_name='language')
    op.drop_table('language')

    sa.Enum(name='roletype').drop(op.get_bind(), checkfirst=True)
