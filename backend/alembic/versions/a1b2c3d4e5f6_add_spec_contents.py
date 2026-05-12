"""add spec_contents table for PDF full-text storage

Revision ID: a1b2c3d4e5f6
Revises: fd437c89ed2b
Create Date: 2026-05-12 22:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '8fd75f6e269a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'spec_contents',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('spec_code', sa.String(length=100), nullable=False),
        sa.Column('page_number', sa.Integer(), nullable=False),
        sa.Column('chapter', sa.String(length=500), nullable=True),
        sa.Column('section', sa.String(length=500), nullable=True),
        sa.Column('title', sa.String(length=500), nullable=True),
        sa.Column('body_text', sa.Text(), nullable=False),
        sa.Column('ingested_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_spec_contents_spec_code'), 'spec_contents', ['spec_code'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_spec_contents_spec_code'), table_name='spec_contents')
    op.drop_table('spec_contents')
