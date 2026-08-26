from pydantic import BaseModel
from backend.app.models.roles import Roles



class User(BaseModel):
    id: int
    wallet: str
    name: str
    role: Roles
    active: bool
