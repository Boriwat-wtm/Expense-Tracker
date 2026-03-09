from .auth import router as auth
from .transactions import router as transactions
from .dashboard import router as dashboard
from .upload import router as upload

__all__ = ["auth", "transactions", "dashboard", "upload"]
