"""add phone number to user

Revision ID: 2936cf538070
Revises: c1e8b4a7d2f9
Create Date: 2026-08-03 19:29:22.107277

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2936cf538070'
down_revision: Union[str, Sequence[str], None] = 'c1e8b4a7d2f9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('user', sa.Column('phone_number', sa.String(), nullable=True))
    # Stale tables left over from a removed DegreeGroup model — no longer
    # referenced by any code on either branch this was merged from. Guarded
    # with IF EXISTS since not every database has this drift (dropping the
    # table also drops its indexes, so no separate DROP INDEX is needed).
    op.execute("DROP TABLE IF EXISTS userdegreegroup CASCADE")
    op.execute("DROP TABLE IF EXISTS degreegroup CASCADE")


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('user', 'phone_number')
    op.create_table('degreegroup',
    sa.Column('id', sa.INTEGER(), autoincrement=True, nullable=False),
    sa.Column('name', sa.VARCHAR(), autoincrement=False, nullable=False),
    sa.Column('is_active', sa.BOOLEAN(), autoincrement=False, nullable=False),
    sa.PrimaryKeyConstraint('id', name=op.f('degreegroup_pkey'))
    )
    op.create_index(op.f('ix_degreegroup_name'), 'degreegroup', ['name'], unique=True)
    op.create_table('userdegreegroup',
    sa.Column('id', sa.INTEGER(), autoincrement=True, nullable=False),
    sa.Column('user_id', sa.INTEGER(), autoincrement=False, nullable=False),
    sa.Column('degree_group_id', sa.INTEGER(), autoincrement=False, nullable=False),
    sa.ForeignKeyConstraint(['degree_group_id'], ['degreegroup.id'], name=op.f('userdegreegroup_degree_group_id_fkey')),
    sa.ForeignKeyConstraint(['user_id'], ['user.id'], name=op.f('userdegreegroup_user_id_fkey')),
    sa.PrimaryKeyConstraint('id', name=op.f('userdegreegroup_pkey'))
    )
    op.create_index(op.f('ix_userdegreegroup_user_id'), 'userdegreegroup', ['user_id'], unique=False)
    op.create_index(op.f('ix_userdegreegroup_degree_group_id'), 'userdegreegroup', ['degree_group_id'], unique=False)
