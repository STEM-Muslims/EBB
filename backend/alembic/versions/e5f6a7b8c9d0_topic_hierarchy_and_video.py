"""4-level topic hierarchy, source tag, and video-as-topic-property

Reworks the curriculum model:
- extends the `leveltype` enum to SUBJECT / MODULE / CHAPTER / TOPIC (the old
  VIDEO value is left in place, unused — Postgres can't drop enum values);
- adds a `source` tag (SYSTEM / USER) and the embedded video columns to `topic`;
- adds the `topictranslation` child table (per-language caption tasks);
- clean reset: clears all topics and re-seeds the 6 SYSTEM subjects;
- drops the now-defunct standalone `video` table.

Revision ID: e5f6a7b8c9d0
Revises: d3a9f1b2c4e8
Create Date: 2026-06-29 00:00:00.000000

"""
from datetime import datetime, timezone
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'e5f6a7b8c9d0'
down_revision: Union[str, Sequence[str], None] = 'd3a9f1b2c4e8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# SUBJECT-level topics that come from the code (kept in sync with f1a2b3c4d5e6).
SUBJECTS = [
    'Maths',
    'Computer Science',
    'Chemistry',
    'Economics',
    'Biology',
    'Physics',
]


def upgrade() -> None:
    bind = op.get_bind()

    # ── Extend the leveltype enum ───────────────────────────────────────────
    # ADD VALUE can't run inside the migration's transaction, so use an
    # autocommit block. The new values aren't used elsewhere in this migration.
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE leveltype ADD VALUE IF NOT EXISTS 'MODULE'")
        op.execute("ALTER TYPE leveltype ADD VALUE IF NOT EXISTS 'CHAPTER'")

    # ── New enum types ──────────────────────────────────────────────────────
    # create_type=False so the type is only made by the explicit .create() below
    # (otherwise add_column / create_table would try to CREATE TYPE a second time).
    topicsource = postgresql.ENUM(
        'SYSTEM', 'USER', name='topicsource', create_type=False
    )
    videostate = postgresql.ENUM(
        'UNASSIGNED', 'ASSIGNED', 'COMPLETED', name='videostate', create_type=False
    )
    translationstatus = postgresql.ENUM(
        'ASSIGNED', 'COMPLETED', name='translationstatus', create_type=False
    )
    topicsource.create(bind, checkfirst=True)
    videostate.create(bind, checkfirst=True)
    translationstatus.create(bind, checkfirst=True)

    # ── New columns on topic ────────────────────────────────────────────────
    op.add_column(
        'topic',
        sa.Column(
            'source',
            topicsource,
            nullable=False,
            server_default='USER',
        ),
    )
    op.add_column(
        'topic',
        sa.Column(
            'video_state',
            videostate,
            nullable=False,
            server_default='UNASSIGNED',
        ),
    )
    op.add_column('topic', sa.Column('assignee_email', sa.String(), nullable=True))
    op.add_column('topic', sa.Column('s3_key', sa.String(), nullable=True))
    op.add_column('topic', sa.Column('s3_url', sa.String(), nullable=True))
    op.add_column('topic', sa.Column('youtube_video_id', sa.String(), nullable=True))
    op.add_column('topic', sa.Column('youtube_url', sa.String(), nullable=True))
    op.add_column('topic', sa.Column('uploaded_by', sa.String(), nullable=True))
    op.add_column('topic', sa.Column('video_error', sa.String(), nullable=True))
    op.add_column('topic', sa.Column('video_uploaded_at', sa.DateTime(), nullable=True))

    op.create_index(op.f('ix_topic_source'), 'topic', ['source'], unique=False)
    op.create_index(
        op.f('ix_topic_video_state'), 'topic', ['video_state'], unique=False
    )
    op.create_index(
        op.f('ix_topic_assignee_email'), 'topic', ['assignee_email'], unique=False
    )
    op.create_index(
        op.f('ix_topic_uploaded_by'), 'topic', ['uploaded_by'], unique=False
    )

    # ── topictranslation table ──────────────────────────────────────────────
    op.create_table(
        'topictranslation',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('topic_id', sa.Integer(), nullable=False),
        sa.Column('language_id', sa.Integer(), nullable=False),
        sa.Column('assignee_email', sa.String(), nullable=True),
        sa.Column(
            'status',
            translationstatus,
            nullable=False,
            server_default='ASSIGNED',
        ),
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
        op.f('ix_topictranslation_topic_id'),
        'topictranslation',
        ['topic_id'],
        unique=False,
    )
    op.create_index(
        op.f('ix_topictranslation_language_id'),
        'topictranslation',
        ['language_id'],
        unique=False,
    )
    op.create_index(
        op.f('ix_topictranslation_assignee_email'),
        'topictranslation',
        ['assignee_email'],
        unique=False,
    )
    op.create_index(
        op.f('ix_topictranslation_status'),
        'topictranslation',
        ['status'],
        unique=False,
    )

    # ── Clean reset: clear all topics, re-seed the 6 SYSTEM subjects ─────────
    # Teacher→subject links point at topic rows; clear them first so the topic
    # wipe doesn't trip the foreign key (re-seeded subjects get fresh ids anyway).
    now = datetime.now(timezone.utc)
    op.execute('DELETE FROM userteachingsubject')
    op.execute('DELETE FROM topic')
    insert_subject = sa.text(
        "INSERT INTO topic "
        "(name, level_type, source, parent_id, sort_order, notes, is_active, "
        " video_state, created_at, updated_at) "
        "VALUES (:name, 'SUBJECT'::leveltype, 'SYSTEM'::topicsource, NULL, "
        " :sort_order, NULL, true, 'UNASSIGNED'::videostate, :now, :now)"
    )
    for i, name in enumerate(SUBJECTS):
        bind.execute(insert_subject, {'name': name, 'sort_order': i, 'now': now})

    # ── Drop the defunct standalone video table ─────────────────────────────
    op.drop_index(op.f('ix_video_status'), table_name='video')
    op.drop_index(op.f('ix_video_title'), table_name='video')
    op.drop_index('ix_video_uploaded_by', table_name='video')
    op.drop_table('video')
    sa.Enum(name='videostatus').drop(bind, checkfirst=True)


def downgrade() -> None:
    bind = op.get_bind()

    # Recreate the standalone video table (best-effort; data is not restored).
    videostatus = sa.Enum(
        'PENDING', 'S3_UPLOADED', 'COMPLETED', 'FAILED', name='videostatus'
    )
    videostatus.create(bind, checkfirst=True)
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
        sa.Column('uploaded_by', sa.String(), nullable=True),
        sa.Column('status', videostatus, nullable=False),
        sa.Column('error', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_video_title'), 'video', ['title'], unique=False)
    op.create_index(op.f('ix_video_status'), 'video', ['status'], unique=False)
    op.create_index('ix_video_uploaded_by', 'video', ['uploaded_by'], unique=False)

    op.drop_index(op.f('ix_topictranslation_status'), table_name='topictranslation')
    op.drop_index(
        op.f('ix_topictranslation_assignee_email'), table_name='topictranslation'
    )
    op.drop_index(
        op.f('ix_topictranslation_language_id'), table_name='topictranslation'
    )
    op.drop_index(op.f('ix_topictranslation_topic_id'), table_name='topictranslation')
    op.drop_table('topictranslation')

    op.drop_index(op.f('ix_topic_uploaded_by'), table_name='topic')
    op.drop_index(op.f('ix_topic_assignee_email'), table_name='topic')
    op.drop_index(op.f('ix_topic_video_state'), table_name='topic')
    op.drop_index(op.f('ix_topic_source'), table_name='topic')
    for column in (
        'video_uploaded_at',
        'video_error',
        'uploaded_by',
        'youtube_url',
        'youtube_video_id',
        's3_url',
        's3_key',
        'assignee_email',
        'video_state',
        'source',
    ):
        op.drop_column('topic', column)

    sa.Enum(name='translationstatus').drop(bind, checkfirst=True)
    sa.Enum(name='videostate').drop(bind, checkfirst=True)
    sa.Enum(name='topicsource').drop(bind, checkfirst=True)
    # The MODULE/CHAPTER additions to leveltype are intentionally left in place
    # (Postgres cannot drop individual enum values).
