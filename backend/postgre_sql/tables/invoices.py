from sqlalchemy import Integer, String, Enum, BigInteger
from sqlalchemy.orm import Mapped, mapped_column

from datetime import datetime
from sqlalchemy import DateTime

from backend.postgre_sql.database import Base
from backend.app.models.statuses import Statuses



class Invoices(Base):
    __tablename__ = "Invoices"

    Id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    Merchant: Mapped[str] = mapped_column(String(42), nullable=False)
    Customer: Mapped[str | None] = mapped_column(String(42), nullable=True)

    Description: Mapped[str] = mapped_column(String(100), nullable=False)
    Amount: Mapped[int] = mapped_column(BigInteger, nullable=False)
    Timestamp: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    Status: Mapped[Statuses] = mapped_column(Enum(Statuses), nullable=False)

    BlockchainInvoiceId: Mapped[int | None] = mapped_column(Integer, nullable=True)
    CreateTransactionHash: Mapped[str | None] = mapped_column(String(66), nullable=True)
    PaymentTransactionHash: Mapped[str | None] = mapped_column(String(66), nullable=True)