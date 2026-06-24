"""seed decided languages and teaching subjects

Adds the remaining languages we're recruiting translators for (Arabic, Somali;
French/Urdu/Bengali were already seeded in c6e7abfcc0c9) and seeds the SUBJECT-level
topics we teach (Maths, Computer Science, Chemistry, Economics, Biology, Physics).

Revision ID: f1a2b3c4d5e6
Revises: c6e7abfcc0c9
Create Date: 2026-06-23 00:00:00.000000

"""
from datetime import datetime, timezone
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f1a2b3c4d5e6'
down_revision: Union[str, Sequence[str], None] = 'c6e7abfcc0c9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Languages to recruit translators for (name -> ISO code).
LANGUAGES = [
    ('Arabic', 'ar'),
    ('Somali', 'so'),
]

# SUBJECT-level topics we teach, in display order.
SUBJECTS = [
    'Maths',
    'Computer Science',
    'Chemistry',
    'Economics',
    'Biology',
    'Physics',
]


def upgrade() -> None:
    """Upgrade schema."""
    bind = op.get_bind()
    now = datetime.now(timezone.utc)

    language = sa.table(
        'language',
        sa.column('name', sa.String),
        sa.column('code', sa.String),
        sa.column('is_active', sa.Boolean),
        sa.column('created_at', sa.DateTime),
        sa.column('updated_at', sa.DateTime),
    )

    # Insert only languages that don't already exist (name is unique).
    existing_languages = {
        row[0]
        for row in bind.execute(sa.text('SELECT name FROM language')).fetchall()
    }
    new_languages = [
        {
            'name': name,
            'code': code,
            'is_active': True,
            'created_at': now,
            'updated_at': now,
        }
        for name, code in LANGUAGES
        if name not in existing_languages
    ]
    if new_languages:
        op.bulk_insert(language, new_languages)

    # Insert only subjects that don't already exist as active SUBJECT topics.
    existing_subjects = {
        row[0]
        for row in bind.execute(
            sa.text(
                "SELECT name FROM topic "
                "WHERE level_type = 'SUBJECT' AND is_active = true"
            )
        ).fetchall()
    }
    # level_type is a Postgres enum (leveltype); bind params arrive as VARCHAR
    # and Postgres won't implicitly cast, so cast explicitly to ::leveltype.
    insert_subject = sa.text(
        "INSERT INTO topic "
        "(name, level_type, parent_id, sort_order, is_active, created_at, updated_at) "
        "VALUES (:name, 'SUBJECT'::leveltype, NULL, :sort_order, true, :now, :now)"
    )
    for i, name in enumerate(SUBJECTS):
        if name in existing_subjects:
            continue
        bind.execute(insert_subject, {'name': name, 'sort_order': i, 'now': now})


def downgrade() -> None:
    """Downgrade schema."""
    bind = op.get_bind()

    bind.execute(
        sa.text('DELETE FROM language WHERE name IN :names').bindparams(
            sa.bindparam('names', expanding=True)
        ),
        {'names': [name for name, _ in LANGUAGES]},
    )
    bind.execute(
        sa.text(
            "DELETE FROM topic WHERE level_type = 'SUBJECT' AND name IN :names"
        ).bindparams(sa.bindparam('names', expanding=True)),
        {'names': SUBJECTS},
    )
