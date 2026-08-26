from pydantic import BaseModel
from datetime import datetime

from backend.app.models.statuses import Statuses



class Invoice(BaseModel):
    invoice_id: int

    merchant: str
    customer: str | None

    description: str
    amount: int
    timestamp: datetime
    status: Statuses

    blockchain_invoice_id: int | None
    create_transaction_hash: str | None
    payment_transaction_hash: str | None