"""self-service task queue: add task table, drop topictranslation

Replaces the admin-picks-assignee model with a single global task queue:
- adds the `task` table (recording/translation work items with queue/lifecycle
  state) plus the `taskstatus` and `tasktype` enums;
- drops the `topictranslation` table (folded into `task`) and its enum;
- drops the now-unused `topic.assignee_email` (assignment lives on `task`).

Revision ID: f7a8b9c0d1e2
Revises: e5f6a7b8c9d0
Create Date: 2026-06-29 01:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'f7a8b9c0d1e2'
down_revision: Union[str, Sequence[str], None] = 'e5f6a7b8c9d0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()

    # create_type=False so the type is only made by the explicit .create() below
    # (otherwise create_table would try to CREATE TYPE a second time).
    taskstatus = postgresql.ENUM(
        'QUEUED', 'IN_PROGRESS', 'RELEASED', 'COMPLETED',
        name='taskstatus', create_type=False,
    )
    tasktype = postgresql.ENUM(
        'RECORDING', 'TRANSLATION', name='tasktype', create_type=False,
    )
    taskstatus.create(bind, checkfirst=True)
    tasktype.create(bind, checkfirst=True)

    op.create_table(
        'task',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('topic_id', sa.Integer(), nullable=False),
        sa.Column('task_type', tasktype, nullable=False),
        sa.Column('language_id', sa.Integer(), nullable=True),
        sa.Column('status', taskstatus, nullable=False, server_default='QUEUED'),
        sa.Column('assignee_email', sa.String(), nullable=True),
        sa.Column('queue_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('caption_s3_key', sa.String(), nullable=True),
        sa.Column('caption_s3_url', sa.String(), nullable=True),
        sa.Column('requested_at', sa.DateTime(), nullable=False),
        sa.Column('claimed_at', sa.DateTime(), nullable=True),
        sa.Column('released_at', sa.DateTime(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['topic_id'], ['topic.id'], ),
        sa.ForeignKeyConstraint(['language_id'], ['language.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_task_topic_id'), 'task', ['topic_id'], unique=False)
    op.create_index(op.f('ix_task_task_type'), 'task', ['task_type'], unique=False)
    op.create_index(op.f('ix_task_status'), 'task', ['status'], unique=False)
    op.create_index(
        op.f('ix_task_assignee_email'), 'task', ['assignee_email'], unique=False
    )
    op.create_index(
        op.f('ix_task_queue_order'), 'task', ['queue_order'], unique=False
    )

    # ── Drop the old per-language translation table (folded into task) ───────
    op.drop_index(op.f('ix_topictranslation_status'), table_name='topictranslation')
    op.drop_index(
        op.f('ix_topictranslation_assignee_email'), table_name='topictranslation'
    )
    op.drop_index(
        op.f('ix_topictranslation_language_id'), table_name='topictranslation'
    )
    op.drop_index(op.f('ix_topictranslation_topic_id'), table_name='topictranslation')
    op.drop_table('topictranslation')
    sa.Enum(name='translationstatus').drop(bind, checkfirst=True)

    # ── Assignment now lives on task, not topic ─────────────────────────────
    op.drop_index(op.f('ix_topic_assignee_email'), table_name='topic')
    op.drop_column('topic', 'assignee_email')


def downgrade() -> None:
    bind = op.get_bind()

    op.add_column('topic', sa.Column('assignee_email', sa.String(), nullable=True))
    op.create_index(
        op.f('ix_topic_assignee_email'), 'topic', ['assignee_email'], unique=False
    )

    translationstatus = postgresql.ENUM(
        'ASSIGNED', 'COMPLETED', name='translationstatus', create_type=False,
    )
    translationstatus.create(bind, checkfirst=True)
    op.create_table(
        'topictranslation',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('topic_id', sa.Integer(), nullable=False),
        sa.Column('language_id', sa.Integer(), nullable=False),
        sa.Column('assignee_email', sa.String(), nullable=True),
        sa.Column('status', translationstatus, nullable=False, server_default='ASSIGNED'),
        sa.Column('caption_s3_key', sa.String(), nullable=True),
        sa.Column('caption_s3_url', sa.String(), nullable=True),
        sa.Column('uploaded_by', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['topic_id'], ['topic.id'], ),
        sa.ForeignKeyConstraint(['language_id'], ['language.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('topic_id', 'language_id', name='uq_topic_language'),
    )
    op.create_index(
        op.f('ix_topictranslation_topic_id'), 'topictranslation', ['topic_id'],
        unique=False,
    )
    op.create_index(
        op.f('ix_topictranslation_language_id'), 'topictranslation', ['language_id'],
        unique=False,
    )
    op.create_index(
        op.f('ix_topictranslation_assignee_email'), 'topictranslation',
        ['assignee_email'], unique=False,
    )
    op.create_index(
        op.f('ix_topictranslation_status'), 'topictranslation', ['status'],
        unique=False,
    )

    op.drop_index(op.f('ix_task_queue_order'), table_name='task')
    op.drop_index(op.f('ix_task_assignee_email'), table_name='task')
    op.drop_index(op.f('ix_task_status'), table_name='task')
    op.drop_index(op.f('ix_task_task_type'), table_name='task')
    op.drop_index(op.f('ix_task_topic_id'), table_name='task')
    op.drop_table('task')
    sa.Enum(name='taskstatus').drop(bind, checkfirst=True)
    sa.Enum(name='tasktype').drop(bind, checkfirst=True)
