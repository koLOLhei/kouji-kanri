"""定期実行タスクAPI — cron/スケジューラから呼ぶ（APIファースト）"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from models.user import User
from services.auth_service import get_current_user
from services.notification_triggers import check_upcoming_deadlines

router = APIRouter(prefix="/api/cron", tags=["cron"])


@router.post("/check-deadlines")
def run_deadline_check(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """期限間近のアイテムを通知生成（管理者が手動実行 or cronから呼ぶ）"""
    count = check_upcoming_deadlines(db, user.tenant_id)
    return {"notifications_created": count}
