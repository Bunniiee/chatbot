"""add ttfb and token columns

Revision ID: a1b2c3d4e5f6
Revises: 18ff32977056
Create Date: 2026-05-23 22:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '18ff32977056'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('inference_logs', sa.Column('stream_ttfb_ms', sa.Numeric(precision=10, scale=2), nullable=True))
    op.add_column('inference_logs', sa.Column('prompt_tokens', sa.Integer(), nullable=True))
    op.add_column('inference_logs', sa.Column('completion_tokens', sa.Integer(), nullable=True))
    op.add_column('inference_logs', sa.Column('total_tokens', sa.Integer(), nullable=True))
    op.add_column('inference_logs', sa.Column('error_message', sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column('inference_logs', 'error_message')
    op.drop_column('inference_logs', 'total_tokens')
    op.drop_column('inference_logs', 'completion_tokens')
    op.drop_column('inference_logs', 'prompt_tokens')
    op.drop_column('inference_logs', 'stream_ttfb_ms')
