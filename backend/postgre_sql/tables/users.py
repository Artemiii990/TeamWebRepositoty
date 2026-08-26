from sqlalchemy import Integer, String, Enum
from sqlalchemy.orm import Mapped, mapped_column

from backend.postgre_sql.database import Base
from backend.app.models.roles import Roles



class Users(Base):
    __tablename__ = "Users"

    Id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    Wallet: Mapped[str] = mapped_column(String(42), nullable=False, unique=True)
    Name: Mapped[str] = mapped_column(String(100), nullable=False)
    Role: Mapped[Roles] = mapped_column(Enum(Roles), nullable=False)
    Active: Mapped[bool] = mapped_column(bool, nullable=False, default=True)