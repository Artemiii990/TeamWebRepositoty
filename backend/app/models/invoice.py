from pydantic import BaseModel
from datetime import datetime

from backend.models.statuses import Statuses



class Invoice(BaseModel):
    invoice_id: int

    merchant: str
    customer: str

    description: str
    amount: int
    timestamp: datetime
    status: Statuses

    blockchain_invoice_id: int | None
    transaction_hash: str | None