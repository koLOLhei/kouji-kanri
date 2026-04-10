"""品質管理のPydanticスキーマ (quality.pyから分離)"""

from datetime import date
from typing import Optional
from pydantic import BaseModel

class ProgressPaymentUpdate(BaseModel):
    period_start: Optional[date] = None
    period_end: Optional[date] = None
    period_number: Optional[int] = None
    items_json: Optional[list[dict[str, Any]]] = None
    total_contract_amount: Optional[float] = None
    total_cumulative_amount: Optional[float] = None
    total_this_period: Optional[float] = None
    progress_rate: Optional[float] = None
    status: Optional[str] = None
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None


# ===========================================================================
# Helper: auto-calculate is_passed for a measurement
# ===========================================================================

