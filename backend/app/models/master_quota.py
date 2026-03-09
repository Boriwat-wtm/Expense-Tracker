from datetime import date

from sqlalchemy import Column, Date, Integer
from sqlalchemy.orm import Session

from ..database import Base

MASTER_OCR_LIMIT = 800


class MasterQuota(Base):
    __tablename__ = "master_quota"

    # Singleton row — always id = 1
    id = Column(Integer, primary_key=True, default=1)
    quota_limit = Column(Integer, nullable=False, default=MASTER_OCR_LIMIT)
    quota_used = Column(Integer, nullable=False, default=0)
    reset_date = Column(Date, nullable=True)


def get_or_create_master_quota(db: Session) -> MasterQuota:
    """
    Returns the singleton MasterQuota row, creating it if absent.
    Resets quota_used to 0 at the start of each calendar month.
    """
    today = date.today()
    first_of_month = today.replace(day=1)

    master = db.query(MasterQuota).filter(MasterQuota.id == 1).with_for_update().first()

    if master is None:
        master = MasterQuota(
            id=1,
            quota_limit=MASTER_OCR_LIMIT,
            quota_used=0,
            reset_date=first_of_month,
        )
        db.add(master)
        db.flush()
    elif master.reset_date is None or master.reset_date < first_of_month:
        master.quota_used = 0
        master.reset_date = first_of_month
        db.flush()

    return master
